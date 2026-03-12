const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { decrypt } = require('../services/encryption');

const router = express.Router();

// ── GDPR: Export all user data as JSON ──────────────────────────────────────
router.get('/export', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = db.prepare('SELECT id, email, name, backup_email, created_at, plan FROM users WHERE id = ?').get(userId);
    
    const letters = db.prepare(`
      SELECT id, title, content, delivery_date, recipient_email, recipient_name,
             status, mood, tags, is_locked, is_collaborative, word_count, created_at, delivered_at
      FROM letters WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    const deliveries = db.prepare(`
      SELECT dl.* FROM delivery_logs dl
      JOIN letters l ON dl.letter_id = l.id
      WHERE l.user_id = ?
      ORDER BY dl.sent_at DESC
    `).all(userId);

    const payments = db.prepare(`
      SELECT id, amount, currency, plan, status, created_at, completed_at
      FROM payments WHERE user_id = ?
    `).all(userId);

    const collaborations = db.prepare(`
      SELECT c.invited_email, c.status, c.contribution, c.invited_at, c.accepted_at,
             l.title as letter_title
      FROM collaborators c
      JOIN letters l ON c.letter_id = l.id
      WHERE l.user_id = ?
    `).all(userId);

    const exportData = {
      exported_at: new Date().toISOString(),
      gdpr_note: 'This export contains all personal data held by FutureMe for your account.',
      user: {
        ...user,
        password_hash: '[REDACTED FOR SECURITY]',
      },
      letters: letters.map(l => ({
        ...l,
        tags: JSON.parse(l.tags || '[]'),
      })),
      delivery_history: deliveries,
      payments,
      collaborations,
    };

    db.prepare('INSERT INTO audit_logs (id, user_id, action, resource_type) VALUES (?,?,?,?)')
      .run(uuidv4(), userId, 'gdpr.export', 'user');

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="futureme-data-export-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ── GDPR: Delete account and all data ───────────────────────────────────────
router.delete('/account', authenticate, (req, res) => {
  try {
    const { password_confirm } = req.body;
    if (!password_confirm) return res.status(400).json({ error: 'Please confirm with your password' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(password_confirm, user.password_hash)) {
      return res.status(401).json({ error: 'Password incorrect' });
    }

    // Cascade delete via FK constraints
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);

    res.json({ message: 'Account and all data permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── Delivery confirmation webhook (simulates email provider callback) ───────
router.post('/delivery-webhook/:letterId', (req, res) => {
  try {
    const { status, provider_message_id } = req.body;
    const validStatuses = ['delivered', 'bounced', 'opened', 'clicked'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const log = db.prepare('SELECT * FROM delivery_logs WHERE letter_id = ? ORDER BY sent_at DESC LIMIT 1').get(req.params.letterId);
    if (!log) return res.status(404).json({ error: 'No delivery log found' });

    db.prepare('UPDATE delivery_logs SET status = ?, provider_response = ? WHERE id = ?')
      .run(status, provider_message_id || null, log.id);

    res.json({ message: 'Delivery status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Get delivery status for a letter ────────────────────────────────────────
router.get('/letters/:id/delivery-status', authenticate, (req, res) => {
  try {
    const letter = db.prepare('SELECT user_id FROM letters WHERE id = ?').get(req.params.id);
    if (!letter || letter.user_id !== req.user.id) return res.status(404).json({ error: 'Not found' });

    const logs = db.prepare(`
      SELECT * FROM delivery_logs WHERE letter_id = ? ORDER BY sent_at DESC
    `).all(req.params.id);

    const schedule = db.prepare(`
      SELECT * FROM schedules WHERE letter_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.params.id);

    res.json({ logs, schedule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery status' });
  }
});

// ── Letter preview (decrypted preview before sealing) ───────────────────────
router.get('/letters/:id/preview', authenticate, (req, res) => {
  try {
    const letter = db.prepare('SELECT * FROM letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Letter is sealed — preview disabled for security' });

    // Return the plaintext content for preview (not encrypted)
    res.json({
      id: letter.id,
      title: letter.title,
      content: letter.content,  // plaintext for preview
      delivery_date: letter.delivery_date,
      recipient_name: letter.recipient_name,
      recipient_email: letter.recipient_email,
      mood: letter.mood,
      tags: JSON.parse(letter.tags || '[]'),
      word_count: letter.word_count,
      is_collaborative: letter.is_collaborative,
      created_at: letter.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Preview failed' });
  }
});

module.exports = router;
