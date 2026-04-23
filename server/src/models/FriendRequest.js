const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

friendRequestSchema.index({ fromId: 1, toId: 1 }, { unique: true });
friendRequestSchema.index({ toId: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
