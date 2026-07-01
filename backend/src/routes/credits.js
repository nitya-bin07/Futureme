const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

router.get('/packages', async (req, res) => {
  try {
    const packages = await db.getAll('SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC');
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/balance', authenticate, async (req, res) => {
  try {
    const user = await db.getOne('SELECT letter_credits FROM users WHERE id = $1', [req.user.id]);
    const packages = await db.getAll('SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC');
    res.json({ credits: user ? user.letter_credits : 0, packages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', authenticate, async (req, res) => {
  try {
    const rows = await db.getAll(`
      SELECT ct.id, ct.type, ct.credits, ct.amount, ct.description, ct.status, ct.created_at,
             l.title as letter_title, cp.name as package_name
      FROM credit_transactions ct
      LEFT JOIN letters l ON ct.letter_id = l.id
      LEFT JOIN credit_packages cp ON ct.package_id = cp.id
      WHERE ct.user_id = $1
      ORDER BY ct.created_at DESC LIMIT 50
    `, [req.user.id]);
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start a real Stripe Checkout session ────────────────────────────────────
router.post('/checkout', authenticate, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payments are not configured on this server. Set STRIPE_SECRET_KEY.' });
    }

    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ error: 'Package ID required' });

    const pkg = await db.getOne('SELECT * FROM credit_packages WHERE id = $1 AND is_active = 1', [package_id]);
    if (!pkg) return res.status(404).json({ error: 'Package not found' });

    const txId = uuidv4();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    await db.run(
      `INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, package_id, status)
       VALUES ($1, $2, 'purchase', $3, $4, $5, $6, 'pending')`,
      [txId, req.user.id, pkg.credits, pkg.price, 'Purchased ' + pkg.name, pkg.id]
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: req.user.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: pkg.name,
            description: pkg.credits + ' letter credit' + (pkg.credits > 1 ? 's' : '') + ' for FutureMe',
          },
          unit_amount: Math.round(Number(pkg.price) * 100),
        },
        quantity: 1,
      }],
      success_url: frontendUrl + '/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: frontendUrl + '/pricing?checkout=cancelled',
      metadata: {
        transaction_id: txId,
        user_id: req.user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
      },
    });

    await db.run('UPDATE credit_transactions SET stripe_session_id = $1 WHERE id = $2', [session.id, txId]);

    res.json({ checkout_url: session.url, session_id: session.id, transaction_id: txId });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
});

router.get('/checkout/:sessionId/status', authenticate, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Payments are not configured on this server.' });

    const tx = await db.getOne(
      'SELECT * FROM credit_transactions WHERE stripe_session_id = $1 AND user_id = $2',
      [req.params.sessionId, req.user.id]
    );
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    res.json({ status: tx.status, credits: tx.credits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/grant', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { user_id, credits, reason } = req.body;
    if (!user_id || !credits) return res.status(400).json({ error: 'user_id and credits required' });

    await db.run('UPDATE users SET letter_credits = letter_credits + $1 WHERE id = $2', [credits, user_id]);
    await db.run(
      `INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, status)
       VALUES ($1, $2, 'grant', $3, 0, $4, 'completed')`,
      [uuidv4(), user_id, credits, reason || 'Admin grant']
    );

    const updated = await db.getOne('SELECT letter_credits FROM users WHERE id = $1', [user_id]);
    res.json({ message: 'Credits granted', new_balance: updated.letter_credits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
