const express = require('express');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Team = require('../models/Team');
const Tile = require('../models/Tile');
const RunSession = require('../models/RunSession');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── FRIENDS ──────────────────────────────────────────────────────────────────

// GET /api/social/friends — current user's accepted friends with basic stats
router.get('/friends', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'username color xp level stats streak');
    const friends = (user.friends || []).map(f => ({
      _id: f._id, username: f.username, color: f.color,
      xp: f.xp, level: f.level,
      totalDistanceKm: +((f.stats?.totalDistanceMeters || 0) / 1000).toFixed(2),
      streak: f.streak?.current || 0,
    }));
    res.json({ friends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/requests — pending requests sent TO me
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await FriendRequest.find({ toId: req.user._id, status: 'pending' })
      .populate('fromId', 'username color level xp');
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/social/friends/request — send friend request
router.post('/friends/request', authenticate, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }
    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Already friends?
    const me = await User.findById(req.user._id);
    if (me.friends.map(f => f.toString()).includes(targetUserId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { fromId: req.user._id, toId: targetUserId },
        { fromId: targetUserId, toId: req.user._id },
      ],
    });
    if (existing && existing.status === 'pending') {
      return res.status(400).json({ error: 'Request already pending' });
    }
    if (existing) {
      // Re-send after rejection
      existing.status = 'pending';
      existing.fromId = req.user._id;
      existing.toId   = targetUserId;
      await existing.save();
      return res.json({ request: existing });
    }

    const request = await FriendRequest.create({ fromId: req.user._id, toId: targetUserId });
    res.status(201).json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/social/requests/:requestId — accept or reject
router.patch('/requests/:requestId', authenticate, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' | 'reject'
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.toId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    request.status = action === 'accept' ? 'accepted' : 'rejected';
    await request.save();

    if (action === 'accept') {
      // Mutual friend add
      await User.findByIdAndUpdate(request.fromId, { $addToSet: { friends: request.toId } });
      await User.findByIdAndUpdate(request.toId,   { $addToSet: { friends: request.fromId } });
    }
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/social/friends/:userId — unfriend
router.delete('/friends/:userId', authenticate, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id,      { $pull: { friends: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { friends: req.user._id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/feed — recent capture activity from friends + self
router.get('/feed', authenticate, async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select('friends');
    const userIds = [req.user._id, ...(me.friends || [])];

    const sessions = await RunSession.find({
      userId: { $in: userIds },
      tilesCaptured: { $gt: 0 },
    })
      .sort({ startTime: -1 })
      .limit(30)
      .select('userId startTime distanceMeters tilesCaptured caloriesBurned xpEarned durationSeconds')
      .populate('userId', 'username color level');

    const feed = sessions.map(s => ({
      _id: s._id,
      user: s.userId,
      startTime: s.startTime,
      distanceKm: +((s.distanceMeters || 0) / 1000).toFixed(2),
      tilesCaptured: s.tilesCaptured,
      calories: s.caloriesBurned || 0,
      xpEarned: s.xpEarned || 0,
      durationSeconds: s.durationSeconds || 0,
    }));

    res.json({ feed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/search?q=username — search users to friend
router.get('/search', authenticate, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json({ users: [] });
    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id },
    }).select('username color level xp').limit(10);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── TEAMS ─────────────────────────────────────────────────────────────────────

// GET /api/social/teams — all teams with member count & territory stats
router.get('/teams', authenticate, async (req, res) => {
  try {
    const teams = await Team.find().populate('members', 'username color level').limit(50);
    const enriched = await Promise.all(teams.map(async t => {
      const memberIds = t.members.map(m => m._id);
      const tileCount = await Tile.countDocuments({ ownerId: { $in: memberIds } });
      return {
        _id: t._id, name: t.name, tag: t.tag, bio: t.bio, color: t.color,
        memberCount: t.members.length,
        members: t.members.slice(0, 5), // preview only
        tileCount,
        isMember: memberIds.some(id => id.toString() === req.user._id.toString()),
        createdAt: t.createdAt,
      };
    }));
    res.json({ teams: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/social/teams/:teamId
router.get('/teams/:teamId', authenticate, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId).populate('members', 'username color level xp stats');
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const memberIds = team.members.map(m => m._id);
    const tileCount = await Tile.countDocuments({ ownerId: { $in: memberIds } });
    res.json({ team: { ...team.toObject(), tileCount } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/social/teams — create team
router.post('/teams', authenticate, async (req, res) => {
  try {
    const { name, tag, bio, color } = req.body;
    if (!name || !tag) return res.status(400).json({ error: 'Name and tag required' });

    const user = await User.findById(req.user._id);
    if (user.teamId) return res.status(400).json({ error: 'Leave your current team first' });

    const team = await Team.create({
      name, tag: tag.toUpperCase(), bio: bio || '', color: color || '#4ade80',
      creatorId: req.user._id,
      members: [req.user._id],
    });
    await User.findByIdAndUpdate(req.user._id, { teamId: team._id });
    res.status(201).json({ team });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Tag already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/social/teams/:teamId/join
router.post('/teams/:teamId/join', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.teamId) return res.status(400).json({ error: 'Leave your current team first' });

    const team = await Team.findByIdAndUpdate(
      req.params.teamId,
      { $addToSet: { members: req.user._id } },
      { new: true }
    );
    if (!team) return res.status(404).json({ error: 'Team not found' });
    await User.findByIdAndUpdate(req.user._id, { teamId: team._id });
    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/social/teams/:teamId/leave
router.delete('/teams/:teamId/leave', authenticate, async (req, res) => {
  try {
    await Team.findByIdAndUpdate(req.params.teamId, { $pull: { members: req.user._id } });
    await User.findByIdAndUpdate(req.user._id, { teamId: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
