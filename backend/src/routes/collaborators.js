const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendCollaborationInvite } = require('../services/email');

const router = express.Router();

router.post('/letters/:id/invite', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Cannot invite to a sealed letter' });
    if (letter.status === 'delivered') return res.status(403).json({ error: 'Letter already delivered' });

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === req.user.email) return res.status(400).json({ error: 'Cannot invite yourself' });

    const existing = await db.getOne('SELECT * FROM collaborators WHERE letter_id = $1 AND invited_email = $2',
      [req.params.id, normalizedEmail]);
    if (existing) return res.status(409).json({ error: 'Already invited this person' });

    const token = crypto.randomBytes(32).toString('hex');
    const collabId = uuidv4();

    const invitedUser = await db.getOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);

    await db.run(`
      INSERT INTO collaborators (id, letter_id, invited_email, invited_user_id, invite_token, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [collabId, req.params.id, normalizedEmail, invitedUser ? invitedUser.id : null, token]);

    await db.run("UPDATE letters SET is_collaborative = 1 WHERE id = $1", [req.params.id]);

    try {
      await sendCollaborationInvite(normalizedEmail, req.user.name, letter.title, token);
    } catch (e) {
      console.log('Email failed (non-critical):', e.message);
    }

    await db.run('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id) VALUES ($1,$2,$3,$4,$5)',
      [uuidv4(), req.user.id, 'collab.invite', 'letter', req.params.id]);

    res.status(201).json({ message: 'Invitation sent', token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

router.post('/collaborate/accept/:token', authenticate, async (req, res) => {
  try {
    const collab = await db.getOne('SELECT * FROM collaborators WHERE invite_token = $1', [req.params.token]);
    if (!collab) return res.status(404).json({ error: 'Invalid or expired invite token' });
    if (collab.status === 'accepted') return res.status(400).json({ error: 'Invitation already accepted' });
    if (collab.invited_email !== req.user.email) {
      return res.status(403).json({ error: 'This invitation is for a different email' });
    }

    await db.run(`UPDATE collaborators SET status = 'accepted', accepted_at = NOW(), invited_user_id = $1 WHERE id = $2`,
      [req.user.id, collab.id]);

    const letter = await db.getOne('SELECT id, title, delivery_date FROM letters WHERE id = $1', [collab.letter_id]);
    res.json({ message: 'Invitation accepted! You can now contribute to this letter.', letter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

router.get('/letters/:id/collaborators', authenticate, async (req, res) => {
  try {
    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    const collabs = await db.getAll(`
      SELECT c.*, u.name as user_name
      FROM collaborators c
      LEFT JOIN users u ON c.invited_user_id = u.id
      WHERE c.letter_id = $1
      ORDER BY c.invited_at ASC
    `, [req.params.id]);

    res.json({ collaborators: collabs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

router.put('/collaborate/:letterId/contribute', authenticate, async (req, res) => {
  try {
    const { contribution } = req.body;
    if (!contribution || !contribution.trim()) return res.status(400).json({ error: 'Contribution cannot be empty' });

    const collab = await db.getOne(`
      SELECT * FROM collaborators WHERE letter_id = $1 AND invited_user_id = $2 AND status = 'accepted'
    `, [req.params.letterId, req.user.id]);

    if (!collab) return res.status(403).json({ error: 'You are not an accepted collaborator on this letter' });

    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1', [req.params.letterId]);
    if (letter.is_locked) return res.status(403).json({ error: 'Letter is sealed' });

    await db.run("UPDATE collaborators SET contribution = $1 WHERE id = $2", [contribution.trim(), collab.id]);

    res.json({ message: 'Contribution saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save contribution' });
  }
});

router.delete('/letters/:id/collaborators/:collabId', authenticate, async (req, res) => {
  try {
    const letter = await db.getOne('SELECT * FROM letters WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    await db.run('DELETE FROM collaborators WHERE id = $1 AND letter_id = $2', [req.params.collabId, req.params.id]);

    const remaining = (await db.getOne('SELECT COUNT(*)::int as count FROM collaborators WHERE letter_id = $1', [req.params.id])).count;
    if (remaining === 0) {
      await db.run('UPDATE letters SET is_collaborative = 0 WHERE id = $1', [req.params.id]);
    }

    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

router.get('/my-collaborations', authenticate, async (req, res) => {
  try {
    const letters = await db.getAll(`
      SELECT l.id, l.title, l.delivery_date, l.status, l.is_locked,
             u.name as owner_name, c.contribution, c.status as collab_status, c.id as collab_id
      FROM collaborators c
      JOIN letters l ON c.letter_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE c.invited_user_id = $1
      ORDER BY c.invited_at DESC
    `, [req.user.id]);
    res.json({ collaborations: letters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collaborations' });
  }
});

module.exports = router;
