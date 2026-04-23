const express = require('express');
const RunSession = require('../models/RunSession');
const User = require('../models/User');
const Tile = require('../models/Tile');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats — hero stats for authenticated user
router.get('/stats', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    const tilesOwned = await Tile.countDocuments({ ownerId: req.user._id });

    res.json({
      stats: {
        totalDistanceKm:    +((user.stats.totalDistanceMeters || 0) / 1000).toFixed(2),
        totalCalories:      user.stats.totalCalories || 0,
        totalRuns:          user.stats.totalRuns     || 0,
        totalTimeSeconds:   user.stats.totalTimeSeconds || 0,
        totalTilesCaptured: user.stats.totalTilesCaptured || 0,
        tilesOwned,
        xp:    user.xp    || 0,
        level: user.level || 1,
        streak: user.streak,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/chart?range=weekly|monthly
router.get('/chart', authenticate, async (req, res) => {
  try {
    const range = req.query.range === 'monthly' ? 30 : 7;
    const since = new Date();
    since.setDate(since.getDate() - range + 1);
    since.setHours(0, 0, 0, 0);

    const sessions = await RunSession.find({
      userId: req.user._id,
      startTime: { $gte: since },
    }).select('startTime distanceMeters durationSeconds caloriesBurned xpEarned tilesCaptured');

    // Build a day-keyed map
    const days = {};
    for (let i = 0; i < range; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { date: key, km: 0, calories: 0, xp: 0, tiles: 0, runs: 0 };
    }

    for (const s of sessions) {
      const key = new Date(s.startTime).toISOString().slice(0, 10);
      if (days[key]) {
        days[key].km       += +(s.distanceMeters / 1000).toFixed(2);
        days[key].calories += s.caloriesBurned || 0;
        days[key].xp       += s.xpEarned       || 0;
        days[key].tiles    += s.tilesCaptured   || 0;
        days[key].runs     += 1;
      }
    }

    res.json({ chart: Object.values(days) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/recent — last 10 sessions
router.get('/recent', authenticate, async (req, res) => {
  try {
    const sessions = await RunSession.find({ userId: req.user._id })
      .sort({ startTime: -1 }).limit(10).select('-path');
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/records — personal records (best single-run values)
router.get('/records', authenticate, async (req, res) => {
  try {
    const sessions = await RunSession.find({ userId: req.user._id }).select('-path');

    if (sessions.length === 0) {
      return res.json({ records: null, totalRuns: 0 });
    }

    let bestDistance = null, bestPace = null, bestDuration = null,
        bestCalories = null, bestXP = null, bestTiles = null;

    for (const s of sessions) {
      const dist = s.distanceMeters || 0;
      const dur  = s.durationSeconds || 0;
      const cal  = s.caloriesBurned || 0;
      const xp   = s.xpEarned || 0;
      const tiles = s.tilesCaptured || 0;

      if (!bestDistance || dist > bestDistance.value)
        bestDistance = { value: dist, date: s.startTime };

      if (dist > 100 && dur > 0) {
        const paceSecPerKm = dur / (dist / 1000);
        if (!bestPace || paceSecPerKm < bestPace.value)
          bestPace = { value: paceSecPerKm, date: s.startTime };
      }

      if (!bestDuration || dur > bestDuration.value)
        bestDuration = { value: dur, date: s.startTime };

      if (!bestCalories || cal > bestCalories.value)
        bestCalories = { value: cal, date: s.startTime };

      if (!bestXP || xp > bestXP.value)
        bestXP = { value: xp, date: s.startTime };

      if (!bestTiles || tiles > bestTiles.value)
        bestTiles = { value: tiles, date: s.startTime };
    }

    res.json({
      records: { bestDistance, bestPace, bestDuration, bestCalories, bestXP, bestTiles },
      totalRuns: sessions.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/dashboard/history?page=1 — paginated full run history
router.get('/history', authenticate, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 15;
    const skip  = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      RunSession.find({ userId: req.user._id })
        .sort({ startTime: -1 }).skip(skip).limit(limit).select('-path'),
      RunSession.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
