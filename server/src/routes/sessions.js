const express = require('express');
const RunSession = require('../models/RunSession');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { xpForLevel } = require('../models/User');

const router = express.Router();

// ── Achievement definitions (static config) ─────────────────────────────────
const ACHIEVEMENTS = [
  { key: 'first_run',  name: 'First Steps',       icon: '👟', xpReward: 50,  description: 'Complete your first run' },
  { key: '5km',        name: '5K Club',            icon: '🏃', xpReward: 100, description: 'Run 5km in a single session' },
  { key: '10km',       name: '10K Beast',          icon: '🔥', xpReward: 200, description: 'Run 10km in a single session' },
  { key: 'tiles_10',   name: 'Planter',            icon: '🌱', xpReward: 75,  description: 'Capture 10 tiles in one run' },
  { key: 'tiles_100',  name: 'Conqueror',          icon: '⚔️',  xpReward: 250, description: 'Capture 100 tiles total' },
  { key: 'streak_3',   name: 'On Fire',            icon: '🔥', xpReward: 100, description: '3-day running streak' },
  { key: 'streak_7',   name: 'Weekly Warrior',     icon: '🗓️', xpReward: 200, description: '7-day running streak' },
  { key: 'streak_30',  name: 'Iron Runner',        icon: '🏅', xpReward: 500, description: '30-day running streak' },
  { key: 'level_5',    name: 'Rising Star',        icon: '⭐', xpReward: 100, description: 'Reach Level 5' },
  { key: 'level_10',   name: 'Territory King',     icon: '👑', xpReward: 300, description: 'Reach Level 10' },
];

function checkAchievements(user, session) {
  const earned = Array.isArray(user.achievements) ? [...user.achievements] : [];
  const has = (key) => earned.includes(key);
  const newlyEarned = [];

  const totalRuns = user.stats.totalRuns;
  const totalTiles = user.stats.totalTilesCaptured;

  if (!has('first_run') && totalRuns >= 1) newlyEarned.push('first_run');
  if (!has('5km')        && session.distanceMeters >= 5000)   newlyEarned.push('5km');
  if (!has('10km')       && session.distanceMeters >= 10000)  newlyEarned.push('10km');
  if (!has('tiles_10')   && session.tilesCaptured  >= 10)     newlyEarned.push('tiles_10');
  if (!has('tiles_100')  && totalTiles >= 100)                newlyEarned.push('tiles_100');
  if (!has('streak_3')   && user.streak.current >= 3)         newlyEarned.push('streak_3');
  if (!has('streak_7')   && user.streak.current >= 7)         newlyEarned.push('streak_7');
  if (!has('streak_30')  && user.streak.current >= 30)        newlyEarned.push('streak_30');
  if (!has('level_5')    && user.level >= 5)                  newlyEarned.push('level_5');
  if (!has('level_10')   && user.level >= 10)                 newlyEarned.push('level_10');

  return newlyEarned;
}

// POST /api/sessions — save completed run
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      startTime, endTime, distanceMeters, avgSpeedKmh, maxSpeedKmh,
      tilesCaptured, tilesRecaptured,
    } = req.body;

    const durationSeconds = endTime ? (new Date(endTime) - new Date(startTime)) / 1000 : 0;
    const durationHours   = durationSeconds / 3600;

    // ── Calorie estimate (MET ≈ 8.0 for running, default 70 kg) ──────────────
    const weightKg = 70;
    const MET = 8.0;
    const caloriesBurned = Math.round(MET * weightKg * durationHours);

    // ── XP formula ────────────────────────────────────────────────────────────
    const user = await User.findById(req.user._id);
    const streakMultiplier = Math.min(2.0, 1.0 + (user.streak.current * 0.05));
    const baseXP    = Math.floor((distanceMeters || 0) / 10);
    const tilesXP   = (tilesCaptured || 0) * 5;
    const xpEarned  = Math.round((baseXP + tilesXP) * streakMultiplier);

    // ── Streak update ─────────────────────────────────────────────────────────
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const lastRun = user.streak.lastRunDate ? new Date(user.streak.lastRunDate) : null;
    if (lastRun) lastRun.setHours(0, 0, 0, 0);

    let newStreakCurrent = user.streak.current;
    if (!lastRun) {
      newStreakCurrent = 1;
    } else {
      const diffDays = Math.round((today - lastRun) / 86400000);
      if (diffDays === 0)     newStreakCurrent = user.streak.current; // same day
      else if (diffDays === 1) newStreakCurrent = user.streak.current + 1; // consecutive
      else                    newStreakCurrent = 1; // streak broken
    }
    const newStreakLongest = Math.max(user.streak.longest, newStreakCurrent);

    // ── Persist session ───────────────────────────────────────────────────────
    const session = await RunSession.create({
      userId: req.user._id, startTime, endTime,
      distanceMeters:  distanceMeters  || 0,
      avgSpeedKmh:     avgSpeedKmh     || 0,
      maxSpeedKmh:     maxSpeedKmh     || 0,
      durationSeconds,
      tilesCaptured:   tilesCaptured   || 0,
      tilesRecaptured: tilesRecaptured || 0,
      caloriesBurned,
      xpEarned,
    });

    // ── Update user stats ─────────────────────────────────────────────────────
    const newXP    = user.xp + xpEarned;
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;

    // Temporarily set streak so achievement check sees updated value
    user.streak.current     = newStreakCurrent;
    user.streak.longest     = newStreakLongest;
    user.streak.lastRunDate = new Date();
    user.xp     = newXP;
    user.level  = newLevel;
    user.stats.totalDistanceMeters  = (user.stats.totalDistanceMeters || 0) + (distanceMeters || 0);
    user.stats.totalTimeSeconds     = (user.stats.totalTimeSeconds || 0)    + durationSeconds;
    user.stats.totalRuns            = (user.stats.totalRuns || 0)           + 1;
    user.stats.totalCalories        = (user.stats.totalCalories || 0)       + caloriesBurned;
    user.stats.totalTilesCaptured   = (user.stats.totalTilesCaptured || 0)  + (tilesCaptured || 0);

    // ── Achievement check ─────────────────────────────────────────────────────
    const newlyEarned = checkAchievements(user, session);
    let bonusXP = 0;
    if (newlyEarned.length > 0) {
      const achs = ACHIEVEMENTS.filter(a => newlyEarned.includes(a.key));
      bonusXP = achs.reduce((sum, a) => sum + a.xpReward, 0);
      if (!Array.isArray(user.achievements)) user.achievements = [];
      user.achievements.push(...newlyEarned);
      user.xp    = newXP + bonusXP;
      user.level = Math.floor(Math.sqrt(user.xp / 100)) + 1;
    }

    await user.save();

    res.status(201).json({
      session,
      user: user.toPublic(),
      xpEarned: xpEarned + bonusXP,
      caloriesBurned,
      newlyEarned,
      streakCurrent: newStreakCurrent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/user/:userId
router.get('/user/:userId', authenticate, async (req, res) => {
  try {
    const sessions = await RunSession.find({ userId: req.params.userId })
      .sort({ startTime: -1 }).limit(20).select('-path');
    res.json({ sessions });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.ACHIEVEMENTS = ACHIEVEMENTS;
