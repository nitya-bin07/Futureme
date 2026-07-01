const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Add it to your .env file (see .env.example).');
}

const useSSL = process.env.PGSSL !== 'disable';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error:', err.message);
});

async function query(text, params) { return pool.query(text, params); }
async function getOne(text, params) { const { rows } = await pool.query(text, params); return rows[0] || null; }
async function getAll(text, params) { const { rows } = await pool.query(text, params); return rows; }
async function run(text, params) { return pool.query(text, params); }

async function initDb() {
  await query(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    backup_email TEXT,
    email_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'user',
    letter_credits INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
  )`);

  await query(`CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    encrypted_content TEXT,
    encryption_iv TEXT,
    auth_tag TEXT,
    delivery_date DATE NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    status TEXT DEFAULT 'scheduled',
    mood TEXT,
    tags TEXT DEFAULT '[]',
    is_collaborative INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    locked_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    error_message TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS credit_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    badge TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
  )`);

  await query(`CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount NUMERIC(10,2) DEFAULT 0,
    description TEXT,
    letter_id TEXT,
    package_id TEXT,
    stripe_session_id TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    letter_id TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_user_id TEXT,
    contribution TEXT,
    status TEXT DEFAULT 'pending',
    invite_token TEXT UNIQUE,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
  )`);

  await query(`CREATE TABLE IF NOT EXISTS delivery_logs (
    id TEXT PRIMARY KEY,
    letter_id TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    provider_response TEXT
  )`);

  await query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await query(`CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);

  await query('CREATE INDEX IF NOT EXISTS idx_letters_user ON letters(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status)');
  await query('CREATE INDEX IF NOT EXISTS idx_credits_user ON credit_transactions(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)');
  await query('CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_collaborators_letter ON collaborators(letter_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_delivery_logs_letter ON delivery_logs(letter_id)');
  await query('CREATE INDEX IF NOT EXISTS idx_credit_tx_stripe ON credit_transactions(stripe_session_id)');

  // Add stripe_session_id column if this DB was previously on the Razorpay schema
  await query(`ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`);

  const ins = `INSERT INTO credit_packages (id, name, credits, price, badge, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, badge = EXCLUDED.badge`;
  await query(ins, ['pkg_1',  'Single Letter', 1,  1.99,  null,          1]);
  await query(ins, ['pkg_5',  '5 Letters',     5,  7.00,  'Save 30%',    2]);
  await query(ins, ['pkg_12', '12 Letters',    12, 15.00, 'Save 37%',    3]);
  await query(ins, ['pkg_30', '30 Letters',    30, 30.00, 'Best Value',  4]);

  console.log('✅ Postgres schema ready');
}

module.exports = { pool, query, getOne, getAll, run, initDb };
