const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F1948A',
  '#82E0AA', '#85C1E9', '#F0B27A', '#AEB6BF', '#EC7063', '#5DADE2',
];

// XP required to reach a given level: level = floor(sqrt(xp/100)) + 1
// So xp for level L = (L-1)^2 * 100
function xpForLevel(level) {
  return Math.pow(Math.max(0, level - 1), 2) * 100;
}

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: true, unique: true,
    trim: true, minlength: 3, maxlength: 20,
  },
  email: {
    type: String, required: true, unique: true,
    lowercase: true, trim: true,
  },
  passwordHash: { type: String, required: false, default: null },
  googleId:     { type: String, sparse: true, unique: true },
  color: {
    type: String,
    default: () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
  },
  bio: { type: String, default: '', maxlength: 160 },
  isPrivate: { type: Boolean, default: false },

  // ── Stats ──────────────────────────────────────────────────
  stats: {
    totalDistanceMeters: { type: Number, default: 0 },
    totalTimeSeconds:    { type: Number, default: 0 },
    totalRuns:           { type: Number, default: 0 },
    totalCalories:       { type: Number, default: 0 },
    totalTilesCaptured:  { type: Number, default: 0 },
  },

  // ── Gamification ───────────────────────────────────────────
  xp:    { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: {
    current:     { type: Number, default: 0 },
    longest:     { type: Number, default: 0 },
    lastRunDate: { type: Date,   default: null },
  },

  // ── Social ─────────────────────────────────────────────────
  friends:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teamId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  achievements: [{ type: String }],   // array of achievement keys earned

  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.passwordHash || !this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.passwordHash) return false;  // OAuth-only account
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toPublic = function () {
  return {
    _id: this._id, username: this.username, email: this.email,
    color: this.color, bio: this.bio, isPrivate: this.isPrivate,
    stats: this.stats, xp: this.xp, level: this.level,
    streak: this.streak, teamId: this.teamId,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.USER_COLORS = USER_COLORS;
module.exports.xpForLevel  = xpForLevel;
