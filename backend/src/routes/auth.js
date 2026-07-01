const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    const existing = await db.getOne('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db.run(
      'INSERT INTO users (id, email, name, password_hash, letter_credits) VALUES ($1, $2, $3, $4, 1)',
      [id, cleanEmail, cleanName, hash]
    );

    const token = generateToken(id);

    try {
      await db.run(
        `INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, status)
         VALUES ($1, $2, 'welcome', 1, 0, 'Free welcome credit', 'completed')`,
        [uuidv4(), id]
      );
    } catch (e) {}

    res.status(201).json({
      message: 'Account created',
      token,
      user: { id, email: cleanEmail, name: cleanName, role: 'user', letter_credits: 1 }
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.getOne(
      'SELECT * FROM users WHERE email = $1 AND is_active = 1',
      [email.toLowerCase().trim()]
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      await db.run('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    } catch (e) {}

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        letter_credits: user.letter_credits != null ? user.letter_credits : 1
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.getOne(
      'SELECT id, email, name, role, letter_credits, backup_email, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, backup_email } = req.body;
    await db.run(
      'UPDATE users SET name = $1, backup_email = $2, updated_at = NOW() WHERE id = $3',
      [name || req.user.name, backup_email || null, req.user.id]
    );
    const user = await db.getOne(
      'SELECT id, email, name, role, letter_credits, backup_email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    const valid = await bcrypt.compare(currentPassword, req.user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Forgot password: request a reset link ──────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.getOne('SELECT * FROM users WHERE email = $1 AND is_active = 1', [cleanEmail]);

    // Always return the same response whether or not the email exists,
    // so we don't leak which addresses have accounts.
    const genericResponse = { message: 'If an account exists for that email, a reset link has been sent.' };

    if (!user) {
      return res.json(genericResponse);
    }

    // Invalidate any previous unused reset tokens for this user
    await db.run('UPDATE password_resets SET used = 1 WHERE user_id = $1 AND used = 0', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    await db.run(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')`,
      [uuidv4(), user.id, token]
    );

    try {
      await sendPasswordResetEmail(user, token);
    } catch (e) {
      console.error('Failed to send reset email:', e.message);
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── Verify a reset token is still valid (used by the reset page on load) ───
router.get('/reset-password/:token', async (req, res) => {
  try {
    const reset = await db.getOne(
      `SELECT * FROM password_resets WHERE token = $1 AND used = 0 AND expires_at > NOW()`,
      [req.params.token]
    );

    if (!reset) return res.status(400).json({ valid: false, error: 'This reset link is invalid or has expired' });
    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// ── Reset password using a valid token ──────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const reset = await db.getOne(
      `SELECT * FROM password_resets WHERE token = $1 AND used = 0 AND expires_at > NOW()`,
      [token]
    );

    if (!reset) return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });

    const hash = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, reset.user_id]);
    await db.run('UPDATE password_resets SET used = 1 WHERE id = $1', [reset.id]);
    await db.run('UPDATE password_resets SET used = 1 WHERE user_id = $1 AND used = 0', [reset.user_id]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
