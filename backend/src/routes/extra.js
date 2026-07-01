const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.put('/letters/:id/extend', authenticate, async (req, res) => {
  try {
    const { new_date, reason } = req.body;
    if (!new_date) return res.status(400).json({ error: 'New delivery date required' });

    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Sealed letters cannot be extended' });
    if (letter.status === 'delivered') return res.status(403).json({ error: 'Already delivered' });

    const newDate = new Date(new_date);
    const oldDate = new Date(letter.delivery_date);
    if (newDate <= new Date()) return res.status(400).json({ error: 'New date must be in the future' });
    if (newDate <= oldDate) return res.status(400).json({ error: 'New date must be later than the current delivery date' });

    await db.run(`UPDATE letters SET delivery_date = $1, updated_at = NOW() WHERE id = $2`,
      [new_date, req.params.id]);

    await db.run('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [uuidv4(), req.user.id, 'letter.extend', 'letter', req.params.id,
        JSON.stringify({ old_date: letter.delivery_date, new_date, reason })]);

    res.json({
      message: 'Delivery date extended successfully',
      old_date: letter.delivery_date,
      new_date
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extend delivery date' });
  }
});

module.exports = router;
