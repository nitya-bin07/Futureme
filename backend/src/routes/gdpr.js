const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { decrypt } = require('../services/encryption');

const router = express.Router();

router.get('/export', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await db.getOne('SELECT id, email, name, backup_email, created_at FROM users WHERE id = $1', [userId]);

    const letters = await db.getAll(`
      SELECT id, title, content, delivery_date, recipient_email, recipient_name,
             status, mood, tags, is_locked, is_collaborative, word_count, created_at, delivered_at
      FROM letters WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const deliveries = await db.getAll(`
      SELECT dl.* FROM delivery_logs dl
      JOIN letters l ON dl.letter_id = l.id
      WHERE l.user_id = $1
      ORDER BY dl.sent_at DESC
    `, [userId]);

    const payments = await db.getAll(`
      SELECT id, type, credits, amount, description, status, created_at
      FROM credit_transactions WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    const collaborations = await db.getAll(`
      SELECT c.invited_email, c.status, c.contribution, c.invited_at, c.accepted_at,
             l.title as letter_title
      FROM collaborators c
      JOIN letters l ON c.letter_id = l.id
      WHERE l.user_id = $1
    `, [userId]);

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

    await db.run('INSERT INTO audit_logs (id, user_id, action, resource_type) VALUES ($1,$2,$3,$4)',
      [uuidv4(), userId, 'gdpr.export', 'user']);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="futureme-data-export-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password_confirm } = req.body;
    if (!password_confirm) return res.status(400).json({ error: 'Please confirm with your password' });

    const user = await db.getOne('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(password_confirm, user.password_hash)) {
      return res.status(401).json({ error: 'Password incorrect' });
    }

    // Cascade delete via FK constraints (ON DELETE CASCADE on letters,
    // credit_transactions, password_resets, audit_logs.user_id is SET NULL)
    await db.run('DELETE FROM users WHERE id = $1', [req.user.id]);

    res.json({ message: 'Account and all data permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.post('/delivery-webhook/:letterId', async (req, res) => {
  try {
    const { status, provider_message_id } = req.body;
    const validStatuses = ['delivered', 'bounced', 'opened', 'clicked'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const log = await db.getOne('SELECT * FROM delivery_logs WHERE letter_id = $1 ORDER BY sent_at DESC LIMIT 1', [req.params.letterId]);
    if (!log) return res.status(404).json({ error: 'No delivery log found' });

    await db.run('UPDATE delivery_logs SET status = $1, provider_response = $2 WHERE id = $3',
      [status, provider_message_id || null, log.id]);

    res.json({ message: 'Delivery status updated', status });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── Get delivery status for a letter ────────────────────────────────────────
router.get('/letters/:id/delivery-status', authenticate, async (req, res) => {
  try {
    const letter = await db.getOne(`
      SELECT status, delivery_date, delivery_attempts, last_attempt, error_message, delivered_at
      FROM letters WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Not found' });

    const logs = await db.getAll(`
      SELECT * FROM delivery_logs WHERE letter_id = $1 ORDER BY sent_at DESC
    `, [req.params.id]);

    res.json({ logs, schedule: letter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch delivery status' });
  }
});

router.get('/letters/:id/preview', authenticate, async (req, res) => {
  try {
    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Letter is sealed — preview disabled for security' });

    res.json({
      id: letter.id,
      title: letter.title,
      content: letter.content,
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