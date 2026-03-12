const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

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

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    db.prepare('INSERT INTO users (id, email, name, password_hash, letter_credits) VALUES (?, ?, ?, ?, 1)')
      .run(id, cleanEmail, cleanName, hash);

    const token = generateToken(id);

    try {
      db.prepare("INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, status) VALUES (?, ?, 'welcome', 1, 0, 'Free welcome credit', 'completed')")
        .run(uuidv4(), id);
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

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try { db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id); } catch (e) {}

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

router.get('/me', authenticate, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, name, role, letter_credits, backup_email, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, backup_email } = req.body;
    db.prepare("UPDATE users SET name = ?, backup_email = ?, updated_at = datetime('now') WHERE id = ?")
      .run(name || req.user.name, backup_email || null, req.user.id);
    const user = db.prepare('SELECT id, email, name, role, letter_credits, backup_email, created_at FROM users WHERE id = ?').get(req.user.id);
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
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, req.user.id);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
