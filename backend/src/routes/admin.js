const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendLetterEmail } = require('../services/email');
const { decrypt } = require('../services/encryption');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/stats', (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get().count;
    const totalLetters = db.prepare('SELECT COUNT(*) as count FROM letters').get().count;
    const scheduledLetters = db.prepare("SELECT COUNT(*) as count FROM letters WHERE status = 'scheduled'").get().count;
    const deliveredLetters = db.prepare("SELECT COUNT(*) as count FROM letters WHERE status = 'delivered'").get().count;
    const failedLetters = db.prepare("SELECT COUNT(*) as count FROM letters WHERE status = 'failed'").get().count;
    const totalWords = db.prepare('SELECT COALESCE(SUM(word_count), 0) as total FROM letters').get().total;
    
    const recentUsers = db.prepare('SELECT id, email, name, created_at, last_login FROM users ORDER BY created_at DESC LIMIT 5').all();
    
    const lettersByStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM letters GROUP BY status
    `).all();
    
    const lettersByMonth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM letters
      WHERE created_at >= datetime('now', '-6 months')
      GROUP BY month
      ORDER BY month ASC
    `).all();
    
    res.json({
      stats: { totalUsers, activeUsers, totalLetters, scheduledLetters, deliveredLetters, failedLetters, totalWords },
      recentUsers,
      lettersByStatus,
      lettersByMonth
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// Get all users
router.get('/users', (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT id, email, name, role, is_active, letter_credits, created_at, last_login FROM users';
    const params = [];
    
    if (search) {
      query += ' WHERE email LIKE ? OR name LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const users = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all letters (admin view)
router.get('/letters', (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT l.id, l.title, l.delivery_date, l.status, l.is_locked, l.word_count,
             l.created_at, l.delivered_at, l.recipient_email,
             u.email as user_email, u.name as user_name
      FROM letters l
      JOIN users u ON l.user_id = u.id
    `;
    const params = [];
    
    if (status) {
      query += ' WHERE l.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const letters = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM letters').get().count;
    
    res.json({ letters, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

// Manually trigger delivery of a letter
router.post('/letters/:id/deliver', async (req, res) => {
  try {
    const letter = db.prepare(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM letters l JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).get(req.params.id);
    
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.status === 'delivered') return res.status(400).json({ error: 'Letter already delivered' });
    
    // Decrypt content
    let content = letter.content;
    if (letter.encrypted_content && letter.encryption_iv && letter.auth_tag) {
      content = decrypt(
        { encrypted: letter.encrypted_content, iv: letter.encryption_iv, authTag: letter.auth_tag },
        letter.user_id
      );
    }
    
    await sendLetterEmail({ ...letter, content }, letter.user_name);
    
    db.prepare(`UPDATE letters SET status = 'delivered', delivered_at = datetime('now') WHERE id = ?`).run(req.params.id);
    
    db.prepare(`INSERT INTO delivery_logs (id, letter_id, recipient_email, status) VALUES (?, ?, ?, 'sent')`)
      .run(uuidv4(), req.params.id, letter.recipient_email);
    
    db.prepare(`INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(uuidv4(), req.user.id, 'admin.deliver', 'letter', req.params.id, JSON.stringify({ manual: true }));
    
    res.json({ message: 'Letter delivered successfully' });
  } catch (err) {
    console.error('Manual delivery error:', err);
    res.status(500).json({ error: 'Delivery failed: ' + err.message });
  }
});

// Toggle user active status
router.put('/users/:id/toggle', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const newStatus = user.is_active ? 0 : 1;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
    
    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get audit logs
router.get('/audit', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT a.*, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 50
    `).all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
