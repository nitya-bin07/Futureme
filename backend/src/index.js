require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
 
const db = require('./db');
const { authenticate, requireAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const lettersRoutes = require('./routes/letters');
const adminRoutes = require('./routes/admin');
const creditsRoutes = require('./routes/credits');
const analyticsRoutes = require('./routes/analytics');
const collaboratorsRoutes = require('./routes/collaborators');
const extraRoutes = require('./routes/extra');
const gdprRoutes = require('./routes/gdpr');
const { sendLetterEmail } = require('./services/email');
const { decrypt } = require('./services/encryption');
 
const app = express();
const PORT = process.env.PORT || 3001;
 
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
 
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
 
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
 
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
 
// ── Stripe webhook (must be before express.json()) ──────────────────────────
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(503).send('Webhook not configured');
  }
 
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }
 
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { transaction_id, user_id, credits } = session.metadata || {};
    try {
      const tx = await db.getOne(
        "SELECT * FROM credit_transactions WHERE id = $1 AND status = 'pending'",
        [transaction_id]
      );
      if (tx) {
        await db.run("UPDATE credit_transactions SET status = 'completed' WHERE id = $1", [tx.id]);
        await db.run('UPDATE users SET letter_credits = letter_credits + $1 WHERE id = $2', [tx.credits, user_id]);
        console.log('✅ Stripe payment completed:', credits, 'credits for user', user_id);
      }
    } catch (err) {
      console.error('Error processing Stripe webhook:', err.message);
      return res.status(500).send('Internal error processing webhook');
    }
  }
 
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const { transaction_id } = session.metadata || {};
    try {
      await db.run("UPDATE credit_transactions SET status = 'failed' WHERE id = $1 AND status = 'pending'", [transaction_id]);
    } catch (err) {}
  }
 
  res.json({ received: true });
});
 
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
 
app.use('/api/auth', authRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/letters', lettersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', collaboratorsRoutes);
app.use('/api', extraRoutes);
 
app.get('/api/health', async (req, res) => {
  try {
    const users = (await db.getOne('SELECT COUNT(*)::int as c FROM users')).c;
    const letters = (await db.getOne('SELECT COUNT(*)::int as c FROM letters')).c;
    res.json({ status: 'ok', users, letters, version: '2.0.0' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});
 
app.get('/api/debug', authenticate, requireAdmin, async (req, res) => {
  const info = {};
  try { info.tables = (await db.getAll("SELECT tablename FROM pg_tables WHERE schemaname='public'")).map(t => t.tablename); } catch(e) { info.tables_err = e.message; }
  try { info.user_count = (await db.getOne('SELECT COUNT(*)::int as c FROM users')).c; } catch(e) { info.user_count_err = e.message; }
  info.node = process.version;
  info.stripe_configured = !!stripe;
  res.json(info);
});
 
app.use((req, res) => res.status(404).json({ error: 'Route not found: ' + req.method + ' ' + req.path }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: err.message });
});
 
async function processDeliveries() {
  try {
    const due = await db.getAll(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM letters l JOIN users u ON l.user_id = u.id
      WHERE l.status = 'scheduled'
        AND l.delivery_date::date <= CURRENT_DATE
        AND l.delivery_attempts < 3
    `);
    for (const letter of due) {
      try {
        let content = letter.content;
        if (letter.encrypted_content && letter.encryption_iv && letter.auth_tag) {
          content = decrypt({ encrypted: letter.encrypted_content, iv: letter.encryption_iv, authTag: letter.auth_tag }, letter.user_id);
        }
        await sendLetterEmail({ ...letter, content }, letter.user_name);
        await db.run("UPDATE letters SET status = 'delivered', delivered_at = NOW(), delivery_attempts = delivery_attempts + 1 WHERE id = $1", [letter.id]);
        await db.run("INSERT INTO delivery_logs (id, letter_id, recipient_email, status) VALUES ($1, $2, $3, 'sent')", [uuidv4(), letter.id, letter.recipient_email]);
        console.log('Delivered:', letter.title, 'to', letter.recipient_email);
      } catch (err) {
        await db.run("UPDATE letters SET delivery_attempts = delivery_attempts + 1, last_attempt = NOW(), error_message = $1 WHERE id = $2", [err.message, letter.id]);
        console.error('Delivery failed for', letter.id, '-', err.message);
      }
    }
  } catch (err) {
    console.error('Scheduler error:', err.message);
  }
}
 
cron.schedule('* * * * *', processDeliveries);
 
async function initAdmin() {
  try {
    const bcrypt = require('bcryptjs');
    const existing = await db.getOne("SELECT id FROM users WHERE role = 'admin'");
    if (!existing) {
      const hash = await bcrypt.hash('Admin@123456', 10);
      await db.run(
        "INSERT INTO users (id, email, name, password_hash, role, email_verified, letter_credits) VALUES ($1, $2, $3, $4, 'admin', 1, 999)",
        [uuidv4(), 'admin@futureme.local', 'Admin', hash]
      );
      console.log('Admin user created - email: admin@futureme.local  password: Admin@123456');
    }
  } catch (err) {
    console.log('Admin init skipped:', err.message);
  }
}
 
async function start() {
  try {
    await db.initDb();
    await initAdmin();
    app.listen(PORT, async () => {
      console.log('FutureMe backend running on port', PORT);
      await processDeliveries();
      console.log('Letter delivery scheduler active');
      console.log('Stripe payments:', stripe ? 'enabled' : 'disabled (set STRIPE_SECRET_KEY to enable)');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}
 
start();