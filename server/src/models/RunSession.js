const mongoose = require('mongoose');

const pathPointSchema = new mongoose.Schema({
  lat: Number, lng: Number, timestamp: Date, speed: Number,
}, { _id: false });

const runSessionSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime:       { type: Date, required: true },
  endTime:         Date,
  path:            [pathPointSchema],
  distanceMeters:  { type: Number, default: 0 },
  avgSpeedKmh:     { type: Number, default: 0 },
  maxSpeedKmh:     { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  tilesCaptured:   { type: Number, default: 0 },
  tilesRecaptured: { type: Number, default: 0 },
  // ── New fields ─────────────────────────────────────────────
  caloriesBurned:  { type: Number, default: 0 },
  xpEarned:        { type: Number, default: 0 },
});

runSessionSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('RunSession', runSessionSchema);
