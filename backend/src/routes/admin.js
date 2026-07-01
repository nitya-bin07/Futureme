const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendLetterEmail } = require('../services/email');
const { decrypt } = require('../services/encryption');

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/stats', async (req, res) => {
  try {
    const totalUsers = (await db.getOne('SELECT COUNT(*)::int as count FROM users')).count;
    const activeUsers = (await db.getOne('SELECT COUNT(*)::int as count FROM users WHERE is_active = 1')).count;
    const totalLetters = (await db.getOne('SELECT COUNT(*)::int as count FROM letters')).count;
    const scheduledLetters = (await db.getOne("SELECT COUNT(*)::int as count FROM letters WHERE status = 'scheduled'")).count;
    const deliveredLetters = (await db.getOne("SELECT COUNT(*)::int as count FROM letters WHERE status = 'delivered'")).count;
    const failedLetters = (await db.getOne("SELECT COUNT(*)::int as count FROM letters WHERE status = 'failed'")).count;
    const totalWords = (await db.getOne('SELECT COALESCE(SUM(word_count), 0)::int as total FROM letters')).total;

    const recentUsers = await db.getAll('SELECT id, email, name, created_at, last_login FROM users ORDER BY created_at DESC LIMIT 5');

    const lettersByStatus = await db.getAll('SELECT status, COUNT(*)::int as count FROM letters GROUP BY status');

    const lettersByMonth = await db.getAll(`
      SELECT to_char(created_at, 'YYYY-MM') as month, COUNT(*)::int as count
      FROM letters
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    res.json({
      stats: { totalUsers, activeUsers, totalLetters, scheduledLetters, deliveredLetters, failedLetters, totalWords },
      recentUsers,
      lettersByStatus,
      lettersByMonth
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = 'SELECT id, email, name, role, is_active, letter_credits, created_at, last_login FROM users';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` WHERE email ILIKE $${params.length} OR name ILIKE $${params.length}`;
    }

    params.push(parseInt(limit), offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const users = await db.getAll(query, params);
    const total = (await db.getOne('SELECT COUNT(*)::int as count FROM users')).count;

    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/letters', async (req, res) => {
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
      params.push(status);
      query += ` WHERE l.status = $${params.length}`;
    }

    params.push(parseInt(limit), offset);
    query += ` ORDER BY l.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const letters = await db.getAll(query, params);
    const total = (await db.getOne('SELECT COUNT(*)::int as count FROM letters')).count;

    res.json({ letters, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

router.post('/letters/:id/deliver', async (req, res) => {
  try {
    const letter = await db.getOne(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM letters l JOIN users u ON l.user_id = u.id
      WHERE l.id = $1
    `, [req.params.id]);

    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.status === 'delivered') return res.status(400).json({ error: 'Letter already delivered' });

    let content = letter.content;
    if (letter.encrypted_content && letter.encryption_iv && letter.auth_tag) {
      content = decrypt(
        { encrypted: letter.encrypted_content, iv: letter.encryption_iv, authTag: letter.auth_tag },
        letter.user_id
      );
    }

    await sendLetterEmail({ ...letter, content }, letter.user_name);

    await db.run(`UPDATE letters SET status = 'delivered', delivered_at = NOW() WHERE id = $1`, [req.params.id]);

    await db.run(`INSERT INTO delivery_logs (id, letter_id, recipient_email, status) VALUES ($1, $2, $3, 'sent')`,
      [uuidv4(), req.params.id, letter.recipient_email]);

    await db.run(`INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), req.user.id, 'admin.deliver', 'letter', req.params.id, JSON.stringify({ manual: true })]);

    res.json({ message: 'Letter delivered successfully' });
  } catch (err) {
    console.error('Manual delivery error:', err.message);
    res.status(500).json({ error: 'Delivery failed: ' + err.message });
  }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await db.getOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.is_active ? 0 : 1;
    await db.run('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, req.params.id]);

    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}`, is_active: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const logs = await db.getAll(`
      SELECT a.*, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 50
    `);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
