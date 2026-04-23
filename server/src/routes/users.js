const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Tile = require('../models/Tile');
const { authenticate } = require('../middleware/auth');
const { USER_COLORS } = require('../models/User');

const router = express.Router();

// GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const data = await Tile.aggregate([
      { $group: { _id: '$ownerId', tilesOwned: { $sum: 1 }, username: { $first: '$ownerUsername' }, color: { $first: '$ownerColor' } } },
      { $sort: { tilesOwned: -1 } },
      { $limit: 20 },
    ]);
    res.json({ leaderboard: data });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/colors — return color palette
router.get('/colors', (req, res) => {
  res.json({ colors: USER_COLORS });
});

// PATCH /api/users/color
router.patch('/color', authenticate, [
  body('color').matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const { color } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { color }, { new: true }).select('-passwordHash');
    await Tile.updateMany({ ownerId: req.user._id }, { ownerColor: color });
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/bio
router.patch('/bio', authenticate, async (req, res) => {
  try {
    const bio = String(req.body.bio || '').slice(0, 160);
    const user = await User.findByIdAndUpdate(req.user._id, { bio }, { new: true }).select('-passwordHash');
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/privacy
router.patch('/privacy', authenticate, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { isPrivate: !!req.body.isPrivate }, { new: true }).select('-passwordHash');
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:userId
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash -email');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const tilesCount = await Tile.countDocuments({ ownerId: user._id });
    res.json({ user, tilesCount });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
