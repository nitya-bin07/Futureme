const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await db.getOne(`
      SELECT
        COUNT(*)::int as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END)::int as scheduled,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int as failed,
        SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END)::int as sealed,
        SUM(CASE WHEN is_collaborative = 1 THEN 1 ELSE 0 END)::int as collaborative,
        COALESCE(SUM(word_count), 0)::int as total_words,
        COALESCE(AVG(word_count), 0)::numeric(10,1) as avg_words,
        COALESCE(MAX(word_count), 0)::int as longest_letter
      FROM letters WHERE user_id = $1
    `, [userId]);

    const byMonth = await db.getAll(`
      SELECT
        to_char(created_at, 'YYYY-MM') as month,
        COUNT(*)::int as count,
        COALESCE(SUM(word_count), 0)::int as words
      FROM letters
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month ASC
    `, [userId]);

    const byMood = await db.getAll(`
      SELECT mood, COUNT(*)::int as count
      FROM letters
      WHERE user_id = $1 AND mood IS NOT NULL AND mood != ''
      GROUP BY mood
      ORDER BY count DESC
    `, [userId]);

    // Days between when the letter was written and when it's scheduled to
    // arrive. delivery_date is a DATE column, created_at is a TIMESTAMPTZ —
    // casting both to date and subtracting gives a plain integer day count
    // in Postgres (equivalent to SQLite's julianday() subtraction).
    const deliverySpread = await db.getAll(`
      SELECT
        CASE
          WHEN (delivery_date::date - created_at::date) <= 30 THEN '< 1 month'
          WHEN (delivery_date::date - created_at::date) <= 180 THEN '1-6 months'
          WHEN (delivery_date::date - created_at::date) <= 365 THEN '6-12 months'
          WHEN (delivery_date::date - created_at::date) <= 730 THEN '1-2 years'
          WHEN (delivery_date::date - created_at::date) <= 1825 THEN '2-5 years'
          ELSE '5+ years'
        END as range,
        COUNT(*)::int as count
      FROM letters WHERE user_id = $1
      GROUP BY range
      ORDER BY count DESC
    `, [userId]);

    const allTags = await db.getAll(`SELECT tags FROM letters WHERE user_id = $1 AND tags != '[]'`, [userId]);
    const tagCounts = {};
    allTags.forEach(({ tags }) => {
      try {
        JSON.parse(tags).forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      } catch {}
    });
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const recentLetters = await db.getAll(`
      SELECT id, title, status, mood, word_count, delivery_date, created_at, is_locked
      FROM letters WHERE user_id = $1
      ORDER BY created_at DESC LIMIT 5
    `, [userId]);

    const writingDays = await db.getAll(`
      SELECT DISTINCT created_at::date as day
      FROM letters WHERE user_id = $1
      ORDER BY day ASC
    `, [userId]);

    const wordTrend = await db.getAll(`
      SELECT to_char(created_at, 'YYYY-MM') as month, COALESCE(AVG(word_count),0)::numeric(10,1) as avg_words
      FROM letters WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `, [userId]);

    res.json({
      stats,
      byMonth,
      byMood,
      deliverySpread,
      topTags,
      recentLetters,
      writingDays: writingDays.map(d => d.day),
      wordTrend,
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/timeline', authenticate, async (req, res) => {
  try {
    const letters = await db.getAll(`
      SELECT id, title, status, delivery_date, created_at, mood, is_locked, word_count
      FROM letters WHERE user_id = $1
      ORDER BY delivery_date ASC
    `, [req.user.id]);
    res.json({ letters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;
