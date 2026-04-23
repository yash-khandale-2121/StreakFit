const mongoose = require('mongoose');

const tileSchema = new mongoose.Schema({
  tileId:        { type: String, required: true, unique: true, index: true },
  ownerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerUsername: { type: String, required: true },
  ownerColor:    { type: String, required: true },
  capturedAt:    { type: Date, default: Date.now },
  captureCount:  { type: Number, default: 1 },
  // GeoJSON point at tile center for $near queries
  location: {
    type:        { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  bounds: {
    sw: { lat: Number, lng: Number },
    ne: { lat: Number, lng: Number },
  },
});

tileSchema.index({ location: '2dsphere' });
tileSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Tile', tileSchema);
