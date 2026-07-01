const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { encrypt, decrypt } = require('../services/encryption');

const router = express.Router();

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const uid = req.user.id;
    const total    = (await db.getOne('SELECT COUNT(*)::int as c FROM letters WHERE user_id = $1', [uid])).c;
    const sched    = (await db.getOne("SELECT COUNT(*)::int as c FROM letters WHERE user_id = $1 AND status='scheduled'", [uid])).c;
    const deliv    = (await db.getOne("SELECT COUNT(*)::int as c FROM letters WHERE user_id = $1 AND status='delivered'", [uid])).c;
    const locked   = (await db.getOne('SELECT COUNT(*)::int as c FROM letters WHERE user_id = $1 AND is_locked=1', [uid])).c;
    const words    = (await db.getOne('SELECT COALESCE(SUM(word_count),0)::int as t FROM letters WHERE user_id = $1', [uid])).t;
    const upcoming = await db.getAll(
      "SELECT id,title,delivery_date,recipient_name,status FROM letters WHERE user_id=$1 AND status='scheduled' ORDER BY delivery_date ASC LIMIT 3",
      [uid]
    );
    const userRow  = await db.getOne('SELECT letter_credits FROM users WHERE id=$1', [uid]);
    res.json({ stats: { total, scheduled: sched, delivered: deliv, locked, totalWords: words, credits: userRow ? userRow.letter_credits : 0 }, upcoming });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const limit  = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    let query    = 'SELECT * FROM letters WHERE user_id = $1';
    const params = [req.user.id];
    if (req.query.status) { params.push(req.query.status); query += ` AND status = $${params.length}`; }
    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const letters = await db.getAll(query, params);
    const total   = (await db.getOne('SELECT COUNT(*)::int as c FROM letters WHERE user_id=$1', [req.user.id])).c;

    const safe = letters.map(function(l) {
      let content = l.content;
      if (l.encrypted_content && l.encryption_iv && l.auth_tag) {
        try { content = decrypt({ encrypted: l.encrypted_content, iv: l.encryption_iv, authTag: l.auth_tag }, req.user.id); } catch(e) {}
      }
      const plain   = stripHtml(content);
      const preview = plain.substring(0, 200) + (plain.length > 200 ? '...' : '');
      return {
        id: l.id, title: l.title, preview,
        delivery_date: l.delivery_date, recipient_email: l.recipient_email,
        recipient_name: l.recipient_name, status: l.status, mood: l.mood,
        tags: JSON.parse(l.tags || '[]'), is_locked: l.is_locked,
        locked_at: l.locked_at, delivered_at: l.delivered_at,
        word_count: l.word_count || 0, created_at: l.created_at, updated_at: l.updated_at
      };
    });
    res.json({ letters: safe, total, page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const l = await db.getOne('SELECT * FROM letters WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!l) return res.status(404).json({ error: 'Letter not found' });
    let content = l.content;
    if (l.encrypted_content && l.encryption_iv && l.auth_tag) {
      try { content = decrypt({ encrypted: l.encrypted_content, iv: l.encryption_iv, authTag: l.auth_tag }, req.user.id); } catch(e) {}
    }
    res.json({ letter: { id: l.id, title: l.title, content, delivery_date: l.delivery_date, recipient_email: l.recipient_email, recipient_name: l.recipient_name, status: l.status, mood: l.mood, tags: JSON.parse(l.tags || '[]'), is_locked: l.is_locked, locked_at: l.locked_at, delivered_at: l.delivered_at, word_count: l.word_count, created_at: l.created_at, updated_at: l.updated_at } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, delivery_date, recipient_email, recipient_name, mood, tags } = req.body;
    if (!title || !content || !delivery_date || !recipient_email) return res.status(400).json({ error: 'Title, content, delivery date and email are required' });
    if (stripHtml(content).length < 5) return res.status(400).json({ error: 'Please write some content in your letter' });
    if (new Date(delivery_date) <= new Date()) return res.status(400).json({ error: 'Delivery date must be in the future' });

    const creditRow = await db.getOne('SELECT letter_credits FROM users WHERE id=$1', [req.user.id]);
    if (!creditRow || creditRow.letter_credits < 1) return res.status(402).json({ error: 'No letter credits remaining', code: 'NO_CREDITS' });

    const id        = uuidv4();
    const wordCount = stripHtml(content).split(/\s+/).filter(Boolean).length;

    let ec = null, iv = null, at = null;
    try { const e = encrypt(content, req.user.id); ec = e.encrypted; iv = e.iv; at = e.authTag; } catch(e) {}

    await db.run(
      `INSERT INTO letters (id,user_id,title,content,encrypted_content,encryption_iv,auth_tag,delivery_date,recipient_email,recipient_name,mood,tags,status,word_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'scheduled',$13)`,
      [id, req.user.id, title, content, ec, iv, at, delivery_date, recipient_email.toLowerCase(), recipient_name || null, mood || null, JSON.stringify(tags || []), wordCount]
    );

    await db.run('UPDATE users SET letter_credits = letter_credits - 1 WHERE id=$1', [req.user.id]);

    try {
      const desc = 'Used 1 credit: ' + title;
      await db.run(
        `INSERT INTO credit_transactions (id,user_id,type,credits,amount,description,letter_id,status)
         VALUES ($1,$2,'use',-1,0,$3,$4,'completed')`,
        [uuidv4(), req.user.id, desc, id]
      );
    } catch(e) {}

    const letter = await db.getOne('SELECT * FROM letters WHERE id=$1', [id]);
    res.status(201).json({ message: 'Letter scheduled', letter: { id: letter.id, title: letter.title, delivery_date: letter.delivery_date, status: letter.status } });
  } catch (err) {
    console.error('Create letter:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const l = await db.getOne('SELECT * FROM letters WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!l) return res.status(404).json({ error: 'Letter not found' });
    if (l.is_locked) return res.status(403).json({ error: 'Letter is locked' });
    if (l.status === 'delivered') return res.status(403).json({ error: 'Delivered letters cannot be edited' });

    const { title, content, delivery_date, recipient_email, recipient_name, mood, tags } = req.body;
    if (delivery_date && new Date(delivery_date) <= new Date()) return res.status(400).json({ error: 'Delivery date must be in the future' });

    const newContent = content || l.content;
    const wc = stripHtml(newContent).split(/\s+/).filter(Boolean).length;
    let ec = l.encrypted_content, iv = l.encryption_iv, at = l.auth_tag;
    if (content) { try { const e = encrypt(content, req.user.id); ec = e.encrypted; iv = e.iv; at = e.authTag; } catch(e) {} }

    await db.run(
      `UPDATE letters SET title=$1,content=$2,encrypted_content=$3,encryption_iv=$4,auth_tag=$5,delivery_date=$6,recipient_email=$7,recipient_name=$8,mood=$9,tags=$10,word_count=$11,updated_at=NOW() WHERE id=$12`,
      [
        title||l.title, newContent, ec, iv, at, delivery_date||l.delivery_date,
        recipient_email?recipient_email.toLowerCase():l.recipient_email,
        recipient_name!==undefined?recipient_name:l.recipient_name,
        mood!==undefined?mood:l.mood,
        JSON.stringify(tags||JSON.parse(l.tags||'[]')),
        wc, req.params.id
      ]
    );

    res.json({ message: 'Letter updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/lock', authenticate, async (req, res) => {
  try {
    const l = await db.getOne('SELECT * FROM letters WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!l) return res.status(404).json({ error: 'Letter not found' });
    if (l.is_locked) return res.status(400).json({ error: 'Already locked' });
    await db.run('UPDATE letters SET is_locked=1, locked_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Letter locked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const l = await db.getOne('SELECT * FROM letters WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (!l) return res.status(404).json({ error: 'Letter not found' });
    if (l.is_locked) return res.status(403).json({ error: 'Locked letters cannot be deleted' });
    if (l.status === 'delivered') return res.status(403).json({ error: 'Delivered letters cannot be deleted' });
    await db.run('DELETE FROM letters WHERE id=$1', [req.params.id]);
    res.json({ message: 'Letter deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Draft save - no credit deduction, upsert by draft_id
router.post('/draft', authenticate, async (req, res) => {
  try {
    const { id, title, content, delivery_date, recipient_email, recipient_name, mood, tags } = req.body;

    const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length : 0;

    if (id) {
      const existing = await db.getOne("SELECT * FROM letters WHERE id = $1 AND user_id = $2 AND status = 'draft'", [id, req.user.id]);
      if (existing) {
        await db.run(
          `UPDATE letters SET title=$1, content=$2, delivery_date=$3, recipient_email=$4, recipient_name=$5, mood=$6, tags=$7, word_count=$8, updated_at=NOW() WHERE id=$9`,
          [
            title || existing.title || 'Untitled Draft',
            content || existing.content || '',
            delivery_date || existing.delivery_date || null,
            recipient_email || existing.recipient_email || '',
            recipient_name || existing.recipient_name || null,
            mood || existing.mood || null,
            JSON.stringify(tags || JSON.parse(existing.tags || '[]')),
            wordCount,
            id
          ]
        );
        return res.json({ id, saved: true });
      }
    }

    const newId = require('crypto').randomUUID();
    await db.run(
      `INSERT INTO letters (id, user_id, title, content, delivery_date, recipient_email, recipient_name, mood, tags, status, word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $10)`,
      [
        newId,
        req.user.id,
        title || 'Untitled Draft',
        content || '',
        delivery_date || null,
        recipient_email || '',
        recipient_name || null,
        mood || null,
        JSON.stringify(tags || []),
        wordCount
      ]
    );

    res.json({ id: newId, saved: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish a draft - this deducts 1 credit
router.post('/draft/:id/publish', authenticate, async (req, res) => {
  try {
    const draft = await db.getOne("SELECT * FROM letters WHERE id = $1 AND user_id = $2 AND status = 'draft'", [req.params.id, req.user.id]);
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    const { title, content, delivery_date, recipient_email, recipient_name, mood, tags, lock } = req.body;

    const finalTitle = title || draft.title;
    const finalContent = content || draft.content;
    const finalDate = delivery_date || draft.delivery_date;
    const finalEmail = recipient_email || draft.recipient_email;

    if (!finalTitle || !finalContent || !finalDate || !finalEmail) {
      return res.status(400).json({ error: 'Title, content, delivery date and email are required' });
    }
    if (new Date(finalDate) <= new Date()) {
      return res.status(400).json({ error: 'Delivery date must be in the future' });
    }

    const creditRow = await db.getOne('SELECT letter_credits FROM users WHERE id = $1', [req.user.id]);
    if (!creditRow || creditRow.letter_credits < 1) {
      return res.status(402).json({ error: 'No letter credits remaining', code: 'NO_CREDITS' });
    }

    const wordCount = finalContent.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;

    let ec = null, iv = null, at = null;
    try {
      const { encrypt } = require('../services/encryption');
      const e = encrypt(finalContent, req.user.id);
      ec = e.encrypted; iv = e.iv; at = e.authTag;
    } catch(e) {}

    await db.run(
      `UPDATE letters SET title=$1, content=$2, encrypted_content=$3, encryption_iv=$4, auth_tag=$5, delivery_date=$6, recipient_email=$7, recipient_name=$8, mood=$9, tags=$10, status='scheduled', word_count=$11, updated_at=NOW() WHERE id=$12`,
      [finalTitle, finalContent, ec, iv, at, finalDate, finalEmail.toLowerCase(), recipient_name || draft.recipient_name, mood || draft.mood, JSON.stringify(tags || JSON.parse(draft.tags || '[]')), wordCount, draft.id]
    );

    if (lock) {
      await db.run("UPDATE letters SET is_locked=1, locked_at=NOW() WHERE id=$1", [draft.id]);
    }

    await db.run('UPDATE users SET letter_credits = letter_credits - 1 WHERE id=$1', [req.user.id]);

    try {
      await db.run(
        `INSERT INTO credit_transactions (id, user_id, type, credits, amount, description, letter_id, status)
         VALUES ($1, $2, 'use', -1, 0, $3, $4, 'completed')`,
        [require('crypto').randomUUID(), req.user.id, 'Used 1 credit: ' + finalTitle, draft.id]
      );
    } catch(e) {}

    res.json({ message: 'Letter scheduled', id: draft.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
