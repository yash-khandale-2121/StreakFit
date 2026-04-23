const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true, maxlength: 40 },
  tag:       { type: String, required: true, trim: true, maxlength: 6, uppercase: true },
  bio:       { type: String, default: '', maxlength: 160 },
  color:     { type: String, default: '#4ade80' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

teamSchema.index({ tag: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
