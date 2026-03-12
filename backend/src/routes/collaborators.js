const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendCollaborationInvite } = require('../services/email');

const router = express.Router();

// Invite a collaborator to a letter
router.post('/letters/:id/invite', authenticate, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const letter = db.prepare('SELECT * FROM letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (letter.is_locked) return res.status(403).json({ error: 'Cannot invite to a sealed letter' });
    if (letter.status === 'delivered') return res.status(403).json({ error: 'Letter already delivered' });

    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === req.user.email) return res.status(400).json({ error: 'Cannot invite yourself' });

    // Check if already invited
    const existing = db.prepare('SELECT * FROM collaborators WHERE letter_id = ? AND invited_email = ?')
      .get(req.params.id, normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Already invited this person' });

    const token = crypto.randomBytes(32).toString('hex');
    const collabId = uuidv4();

    // Check if user exists
    const invitedUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);

    db.prepare(`
      INSERT INTO collaborators (id, letter_id, invited_email, invited_user_id, invite_token, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(collabId, req.params.id, normalizedEmail, invitedUser?.id || null, token);

    // Mark letter as collaborative
    db.prepare("UPDATE letters SET is_collaborative = 1 WHERE id = ?").run(req.params.id);

    // Send invite email
    try {
      await sendCollaborationInvite(normalizedEmail, req.user.name, letter.title, token);
    } catch (e) {
      console.log('Email failed (non-critical):', e.message);
    }

    db.prepare('INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id) VALUES (?,?,?,?,?)')
      .run(uuidv4(), req.user.id, 'collab.invite', 'letter', req.params.id);

    res.status(201).json({ message: 'Invitation sent', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept collaboration invite (via token)
router.post('/collaborate/accept/:token', authenticate, (req, res) => {
  try {
    const collab = db.prepare('SELECT * FROM collaborators WHERE invite_token = ?').get(req.params.token);
    if (!collab) return res.status(404).json({ error: 'Invalid or expired invite token' });
    if (collab.status === 'accepted') return res.status(400).json({ error: 'Invitation already accepted' });
    if (collab.invited_email !== req.user.email) {
      return res.status(403).json({ error: 'This invitation is for a different email' });
    }

    db.prepare(`UPDATE collaborators SET status = 'accepted', accepted_at = datetime('now'), invited_user_id = ? WHERE id = ?`)
      .run(req.user.id, collab.id);

    const letter = db.prepare('SELECT id, title, delivery_date FROM letters WHERE id = ?').get(collab.letter_id);
    res.json({ message: 'Invitation accepted! You can now contribute to this letter.', letter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// Get collaborators for a letter
router.get('/letters/:id/collaborators', authenticate, (req, res) => {
  try {
    const letter = db.prepare('SELECT * FROM letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    const collabs = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM collaborators c
      LEFT JOIN users u ON c.invited_user_id = u.id
      WHERE c.letter_id = ?
      ORDER BY c.invited_at ASC
    `).all(req.params.id);

    res.json({ collaborators: collabs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collaborators' });
  }
});

// Submit contribution
router.put('/collaborate/:letterId/contribute', authenticate, (req, res) => {
  try {
    const { contribution } = req.body;
    if (!contribution?.trim()) return res.status(400).json({ error: 'Contribution cannot be empty' });

    const collab = db.prepare(`
      SELECT * FROM collaborators WHERE letter_id = ? AND invited_user_id = ? AND status = 'accepted'
    `).get(req.params.letterId, req.user.id);

    if (!collab) return res.status(403).json({ error: 'You are not an accepted collaborator on this letter' });

    const letter = db.prepare('SELECT * FROM letters WHERE id = ?').get(req.params.letterId);
    if (letter.is_locked) return res.status(403).json({ error: 'Letter is sealed' });

    db.prepare("UPDATE collaborators SET contribution = ? WHERE id = ?").run(contribution.trim(), collab.id);

    res.json({ message: 'Contribution saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save contribution' });
  }
});

// Remove collaborator
router.delete('/letters/:id/collaborators/:collabId', authenticate, (req, res) => {
  try {
    const letter = db.prepare('SELECT * FROM letters WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });

    db.prepare('DELETE FROM collaborators WHERE id = ? AND letter_id = ?').run(req.params.collabId, req.params.id);

    // Check if still has collaborators
    const remaining = db.prepare('SELECT COUNT(*) as count FROM collaborators WHERE letter_id = ?').get(req.params.id).count;
    if (remaining === 0) {
      db.prepare('UPDATE letters SET is_collaborative = 0 WHERE id = ?').run(req.params.id);
    }

    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove collaborator' });
  }
});

// Get letters I'm collaborating on (as non-owner)
router.get('/my-collaborations', authenticate, (req, res) => {
  try {
    const letters = db.prepare(`
      SELECT l.id, l.title, l.delivery_date, l.status, l.is_locked,
             u.name as owner_name, c.contribution, c.status as collab_status, c.id as collab_id
      FROM collaborators c
      JOIN letters l ON c.letter_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE c.invited_user_id = ?
      ORDER BY c.invited_at DESC
    `).all(req.user.id);
    res.json({ collaborations: letters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collaborations' });
  }
});

module.exports = router;
