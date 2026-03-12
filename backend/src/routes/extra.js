const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Extend delivery date for a letter
router.put('/letters/:id/extend', authenticate, (req, res) => {
  try {
    const { new_date, reason } = req.body;
    if (!new_date) return res.status(400).json({ error: 'New delivery date required' });

    const letter = db.prepare('SELECT * FROM letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Sealed letters cannot be extended' });
    if (letter.status === 'delivered') return res.status(403).json({ error: 'Already delivered' });

    const newDate = new Date(new_date);
    const oldDate = new Date(letter.delivery_date);
    if (newDate <= new Date()) return res.status(400).json({ error: 'New date must be in the future' });
    if (newDate <= oldDate) return res.status(400).json({ error: 'New date must be later than the current delivery date' });

    db.prepare(`UPDATE letters SET delivery_date = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(new_date, req.params.id);

    db.prepare('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES (?,?,?,?,?,?)')
      .run(uuidv4(), req.user.id, 'letter.extend', 'letter', req.params.id,
        JSON.stringify({ old_date: letter.delivery_date, new_date, reason }));

    res.json({
      message: 'Delivery date extended successfully',
      old_date: letter.delivery_date,
      new_date
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extend delivery date' });
  }
});

// Get pricing plans
module.exports = router;
