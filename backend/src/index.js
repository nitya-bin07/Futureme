require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const db = require('./db');
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

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
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

app.get('/api/health', (req, res) => {
  try {
    const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const letters = db.prepare('SELECT COUNT(*) as c FROM letters').get().c;
    res.json({ status: 'ok', users, letters, version: '2.0.0' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// app.get('/api/debug', (req, res) => {
//   const info = {};
//   try { info.tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name); } catch(e) { info.tables_err = e.message; }
//   try { info.user_cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name); } catch(e) { info.user_cols_err = e.message; }
//   try { info.user_count = db.prepare('SELECT COUNT(*) as c FROM users').get().c; } catch(e) { info.user_count_err = e.message; }
//   info.node = process.version;
//   info.platform = process.platform;
//   res.json(info);
// });
app.get('/api/debug', (req, res) => {
  const info = {};
  try { info.tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name); } catch(e) { info.tables_err = e.message; }
  try { info.user_cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name); } catch(e) { info.user_cols_err = e.message; }
  try { info.user_count = db.prepare('SELECT COUNT(*) as c FROM users').get().c; } catch(e) { info.user_count_err = e.message; }
  info.node = process.version;
  info.platform = process.platform;
  res.json(info);
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found: ' + req.method + ' ' + req.path });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error on', req.method, req.path, '-', err.message);
  res.status(500).json({ error: err.message });
});

async function processDeliveries() {
  try {
    const due = db.prepare(`
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM letters l
      JOIN users u ON l.user_id = u.id
      WHERE l.status = 'scheduled'
        AND date(l.delivery_date) <= date('now')
        AND l.delivery_attempts < 3
    `).all();

    for (const letter of due) {
      try {
        let content = letter.content;
        if (letter.encrypted_content && letter.encryption_iv && letter.auth_tag) {
          content = decrypt({ encrypted: letter.encrypted_content, iv: letter.encryption_iv, authTag: letter.auth_tag }, letter.user_id);
        }
        await sendLetterEmail({ ...letter, content }, letter.user_name);
        db.prepare("UPDATE letters SET status = 'delivered', delivered_at = datetime('now'), delivery_attempts = delivery_attempts + 1 WHERE id = ?").run(letter.id);
        db.prepare("INSERT INTO delivery_logs (id, letter_id, recipient_email, status) VALUES (?, ?, ?, 'sent')").run(uuidv4(), letter.id, letter.recipient_email);
        console.log('Delivered:', letter.title, 'to', letter.recipient_email);
      } catch (err) {
        db.prepare("UPDATE letters SET delivery_attempts = delivery_attempts + 1, last_attempt = datetime('now'), error_message = ? WHERE id = ?").run(err.message, letter.id);
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
    const existing = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
    if (!existing) {
      const hash = await bcrypt.hash('Admin@123456', 10);
      db.prepare("INSERT INTO users (id, email, name, password_hash, role, email_verified, letter_credits) VALUES (?, ?, ?, ?, 'admin', 1, 999)")
        .run(uuidv4(), 'admin@futureme.local', 'Admin', hash);
      console.log('Admin user created - email: admin@futureme.local  password: Admin@123456');
    }
  } catch (err) {
    console.log('Admin init skipped:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log('FutureMe backend running on port', PORT);
  await initAdmin();
  await processDeliveries();
  console.log('Letter delivery scheduler active');
});
