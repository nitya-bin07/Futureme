const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/packages', (req, res) => {
  try {
    const packages = db.prepare('SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC').all();
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/balance', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT letter_credits FROM users WHERE id = ?').get(req.user.id);
    const packages = db.prepare('SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC').all();
    res.json({ credits: user ? user.letter_credits : 0, packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', authenticate, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT ct.id, ct.type, ct.credits, ct.amount, ct.description, ct.status, ct.created_at,
             l.title as letter_title, cp.name as package_name
      FROM credit_transactions ct
      LEFT JOIN letters l ON ct.letter_id = l.id
      LEFT JOIN credit_packages cp ON ct.package_id = cp.id
      WHERE ct.user_id = ?
      ORDER BY ct.created_at DESC LIMIT 50
    `).all(req.user.id);
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/purchase', authenticate, (req, res) => {
  try {
    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ error: 'Package ID required' });

    const pkg = db.prepare('SELECT * FROM credit_packages WHERE id = ? AND is_active = 1').get(package_id);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const txId = uuidv4();
    const sessionId = 'mock_' + txId.replace(/-/g, '').slice(0, 16);

    db.prepare('INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, package_id, stripe_session_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(txId, req.user.id, 'purchase', pkg.credits, pkg.price, 'Purchased ' + pkg.name, pkg.id, sessionId, 'pending');

    res.json({ transaction_id: txId, package: pkg, session_id: sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirm/:txId', authenticate, (req, res) => {
  try {
    const tx = db.prepare("SELECT * FROM credit_transactions WHERE id = ? AND user_id = ? AND status = 'pending'").get(req.params.txId, req.user.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    db.prepare("UPDATE credit_transactions SET status = 'completed' WHERE id = ?").run(tx.id);
    db.prepare('UPDATE users SET letter_credits = letter_credits + ? WHERE id = ?').run(tx.credits, req.user.id);

    const updated = db.prepare('SELECT letter_credits FROM users WHERE id = ?').get(req.user.id);

    res.json({
      message: tx.credits + ' credit' + (tx.credits > 1 ? 's' : '') + ' added to your account',
      credits_added: tx.credits,
      new_balance: updated.letter_credits
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grant', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { user_id, credits, reason } = req.body;
    if (!user_id || !credits) return res.status(400).json({ error: 'user_id and credits required' });

    db.prepare('UPDATE users SET letter_credits = letter_credits + ? WHERE id = ?').run(credits, user_id);
    db.prepare("INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, status) VALUES (?, ?, 'grant', ?, 0, ?, 'completed')")
      .run(uuidv4(), user_id, credits, reason || 'Admin grant');

    const updated = db.prepare('SELECT letter_credits FROM users WHERE id = ?').get(user_id);
    res.json({ message: 'Credits granted', new_balance: updated.letter_credits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
