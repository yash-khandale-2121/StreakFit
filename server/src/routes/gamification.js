const express = require('express');
const User = require('../models/User');
const Tile = require('../models/Tile');
const { authenticate } = require('../middleware/auth');
const { ACHIEVEMENTS } = require('./sessions');

const router = express.Router();

// GET /api/gamification/profile — XP, level, achievements, streak for current user
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    const earnedKeys = Array.isArray(user.achievements) ? user.achievements : [];

    const achievements = ACHIEVEMENTS.map(a => ({
      ...a,
      earned: earnedKeys.includes(a.key),
    }));

    const currentLevel = user.level || 1;
    const xpForCurrent = Math.pow(currentLevel - 1, 2) * 100;
    const xpForNext    = Math.pow(currentLevel, 2) * 100;
    const xpProgress   = user.xp - xpForCurrent;
    const xpNeeded     = xpForNext - xpForCurrent;

    res.json({
      xp: user.xp || 0,
      level: currentLevel,
      xpProgress,
      xpNeeded,
      streak: user.streak,
      achievements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gamification/leaderboard?type=tiles|xp|distance&scope=global|friends
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const type  = req.query.type  || 'tiles';
    const scope = req.query.scope || 'global';

    let userFilter = {};
    if (scope === 'friends') {
      const me = await User.findById(req.user._id).select('friends');
      const ids = [req.user._id, ...(me.friends || [])];
      userFilter = { _id: { $in: ids } };
    }

    if (type === 'tiles') {
      // Aggregate from Tile collection
      const mongoose = require('mongoose');
      let matchStage = {};
      if (scope === 'friends') {
        const me = await User.findById(req.user._id).select('friends');
        const ids = [req.user._id, ...(me.friends || [])];
        matchStage = { ownerId: { $in: ids.map(id => new mongoose.Types.ObjectId(id.toString())) } };
      }

      const pipeline = [
        ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
        { $group: { _id: '$ownerId', tilesOwned: { $sum: 1 }, username: { $first: '$ownerUsername' }, color: { $first: '$ownerColor' } } },
        { $sort: { tilesOwned: -1 } },
        { $limit: 20 },
      ];

      const data = await Tile.aggregate(pipeline);

      // Enrich with XP/level from User collection
      const userIds = data.map(d => d._id);
      const users   = await User.find({ _id: { $in: userIds } }).select('xp level');
      const userMap = {};
      users.forEach(u => { userMap[u._id.toString()] = u; });

      const leaderboard = data.map((d, i) => ({
        rank: i + 1,
        userId: d._id,
        username: d.username,
        color: d.color,
        value: d.tilesOwned,
        label: 'tiles',
        xp: userMap[d._id?.toString()]?.xp || 0,
        level: userMap[d._id?.toString()]?.level || 1,
        isMe: d._id?.toString() === req.user._id.toString(),
      }));
      return res.json({ leaderboard, type, scope });
    }

    // XP, Distance, Runs, or Streak — sort from User collection
    const sortMap = {
      xp:       { xp: -1 },
      distance: { 'stats.totalDistanceMeters': -1 },
      runs:     { 'stats.totalRuns': -1 },
      streak:   { 'streak.current': -1 },
    };
    const sortField = sortMap[type] || sortMap.xp;
    const users = await User.find(userFilter)
      .sort(sortField).limit(50)
      .select('username color xp level stats streak');

    const labelMap = { xp: 'XP', distance: 'km', runs: 'runs', streak: 'days' };

    const leaderboard = users.map((u, i) => {
      let value;
      if (type === 'xp')       value = u.xp || 0;
      else if (type === 'distance') value = +((u.stats?.totalDistanceMeters || 0) / 1000).toFixed(2);
      else if (type === 'runs')     value = u.stats?.totalRuns || 0;
      else if (type === 'streak')   value = u.streak?.current || 0;
      else value = u.xp || 0;

      return {
        rank: i + 1,
        userId: u._id,
        username: u.username,
        color: u.color,
        xp: u.xp || 0,
        level: u.level || 1,
        value,
        label: labelMap[type] || 'XP',
        isMe: u._id.toString() === req.user._id.toString(),
      };
    });

    res.json({ leaderboard, type, scope });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/gamification/achievements — all achievements with earned status
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('achievements');
    const earnedKeys = Array.isArray(user.achievements) ? user.achievements : [];
    const achievements = ACHIEVEMENTS.map(a => ({
      ...a, earned: earnedKeys.includes(a.key),
    }));
    res.json({ achievements });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
