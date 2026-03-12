const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/letters.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = OFF');

db.exec(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  backup_email TEXT,
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  role TEXT DEFAULT 'user',
  letter_credits INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  encrypted_content TEXT,
  encryption_iv TEXT,
  auth_tag TEXT,
  delivery_date TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT DEFAULT 'scheduled',
  mood TEXT,
  tags TEXT DEFAULT '[]',
  is_collaborative INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  locked_at TEXT,
  delivered_at TEXT,
  delivery_attempts INTEGER DEFAULT 0,
  last_attempt TEXT,
  error_message TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`);

db.exec(`CREATE TABLE IF NOT EXISTS credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price REAL NOT NULL,
  badge TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
)`);

db.exec(`CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount REAL DEFAULT 0,
  description TEXT,
  letter_id TEXT,
  package_id TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TEXT DEFAULT (datetime('now'))
)`);

db.exec(`CREATE TABLE IF NOT EXISTS collaborators (
  id TEXT PRIMARY KEY,
  letter_id TEXT NOT NULL,
  invited_email TEXT NOT NULL,
  invited_user_id TEXT,
  contribution TEXT,
  status TEXT DEFAULT 'pending',
  invite_token TEXT UNIQUE,
  invited_at TEXT DEFAULT (datetime('now')),
  accepted_at TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS delivery_logs (
  id TEXT PRIMARY KEY,
  letter_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  error_message TEXT,
  provider_response TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

const alter = (sql) => { try { db.exec(sql); } catch (e) {} };

alter('ALTER TABLE users ADD COLUMN letter_credits INTEGER DEFAULT 1');
alter('ALTER TABLE users ADD COLUMN backup_email TEXT');
alter('ALTER TABLE users ADD COLUMN last_login TEXT');
alter('ALTER TABLE letters ADD COLUMN is_collaborative INTEGER DEFAULT 0');
alter('ALTER TABLE letters ADD COLUMN delivery_attempts INTEGER DEFAULT 0');
alter('ALTER TABLE letters ADD COLUMN word_count INTEGER DEFAULT 0');
alter('ALTER TABLE letters ADD COLUMN error_message TEXT');
alter('ALTER TABLE letters ADD COLUMN last_attempt TEXT');
alter("UPDATE users SET letter_credits = 1 WHERE letter_credits IS NULL");

alter('CREATE INDEX IF NOT EXISTS idx_letters_user ON letters(user_id)');
alter('CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status)');
alter('CREATE INDEX IF NOT EXISTS idx_credits_user ON credit_transactions(user_id)');

db.exec('PRAGMA foreign_keys = ON');

try {
  const count = db.prepare('SELECT COUNT(*) as c FROM credit_packages').get().c;
  if (count === 0) {
    const ins = db.prepare('INSERT OR IGNORE INTO credit_packages (id, name, credits, price, badge, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    ins.run('pkg_1',  'Single Letter', 1,  1.99, null,          1);
    ins.run('pkg_5',  '5 Letters',     5,  7.00, 'Save 30%',    2);
    ins.run('pkg_12', '12 Letters',    12, 15.00, 'Save 37%',   3);
    ins.run('pkg_30', '30 Letters',    30, 30.00, 'Best Value', 4);
    console.log('Credit packages seeded');
  }
} catch (e) {
  console.log('Package seeding skipped:', e.message);
}

console.log('Database ready:', DB_PATH);
module.exports = db;
