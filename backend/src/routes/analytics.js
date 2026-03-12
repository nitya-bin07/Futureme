const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Full analytics for current user
router.get('/overview', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    // Basic stats
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) as sealed,
        SUM(CASE WHEN is_collaborative = 1 THEN 1 ELSE 0 END) as collaborative,
        COALESCE(SUM(word_count), 0) as total_words,
        COALESCE(AVG(word_count), 0) as avg_words,
        COALESCE(MAX(word_count), 0) as longest_letter
      FROM letters WHERE user_id = ?
    `).get(userId);

    // Letters written per month (last 12 months)
    const byMonth = db.prepare(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count,
        COALESCE(SUM(word_count), 0) as words
      FROM letters
      WHERE user_id = ? AND created_at >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(userId);

    // Mood breakdown
    const byMood = db.prepare(`
      SELECT mood, COUNT(*) as count
      FROM letters
      WHERE user_id = ? AND mood IS NOT NULL AND mood != ''
      GROUP BY mood
      ORDER BY count DESC
    `).all(userId);

    // Delivery time spread (how far ahead letters are scheduled)
    const deliverySpread = db.prepare(`
      SELECT
        CASE
          WHEN CAST((julianday(delivery_date) - julianday(created_at)) AS INTEGER) <= 30 THEN '< 1 month'
          WHEN CAST((julianday(delivery_date) - julianday(created_at)) AS INTEGER) <= 180 THEN '1-6 months'
          WHEN CAST((julianday(delivery_date) - julianday(created_at)) AS INTEGER) <= 365 THEN '6-12 months'
          WHEN CAST((julianday(delivery_date) - julianday(created_at)) AS INTEGER) <= 730 THEN '1-2 years'
          WHEN CAST((julianday(delivery_date) - julianday(created_at)) AS INTEGER) <= 1825 THEN '2-5 years'
          ELSE '5+ years'
        END as range,
        COUNT(*) as count
      FROM letters WHERE user_id = ?
      GROUP BY range
      ORDER BY count DESC
    `).all(userId);

    // Top tags
    const allTags = db.prepare(`SELECT tags FROM letters WHERE user_id = ? AND tags != '[]'`).all(userId);
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

    // Recent activity (last 10 letters)
    const recentLetters = db.prepare(`
      SELECT id, title, status, mood, word_count, delivery_date, created_at, is_locked
      FROM letters WHERE user_id = ?
      ORDER BY created_at DESC LIMIT 5
    `).all(userId);

    // Longest writing streak
    const writingDays = db.prepare(`
      SELECT DISTINCT date(created_at) as day
      FROM letters WHERE user_id = ?
      ORDER BY day ASC
    `).all(userId);

    // Words written per letter over time (for chart)
    const wordTrend = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, AVG(word_count) as avg_words
      FROM letters WHERE user_id = ? AND created_at >= datetime('now', '-12 months')
      GROUP BY month ORDER BY month ASC
    `).all(userId);

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
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Delivery timeline - all letters with dates for timeline view
router.get('/timeline', authenticate, (req, res) => {
  try {
    const letters = db.prepare(`
      SELECT id, title, status, delivery_date, created_at, mood, is_locked, word_count
      FROM letters WHERE user_id = ?
      ORDER BY delivery_date ASC
    `).all(req.user.id);
    res.json({ letters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

module.exports = router;
