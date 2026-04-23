// Fixed degree sizes — ensures globally consistent tile IDs
// ~20m per tile at approximately 28° latitude (India/mid-latitudes)
const LAT_TILE_DEG = 0.00018;   // ≈ 20m in latitude
const LNG_TILE_DEG = 0.000205;  // ≈ 20m at ~28° latitude

const Tile = require('../models/Tile');

function coordsToTileId(lat, lng) {
  const tileX = Math.floor(lng / LNG_TILE_DEG);
  const tileY = Math.floor(lat / LAT_TILE_DEG);
  return `${tileX}_${tileY}`;
}

function tileIdToBounds(tileId) {
  const [tileX, tileY] = tileId.split('_').map(Number);
  const sw = { lat: tileY * LAT_TILE_DEG,       lng: tileX * LNG_TILE_DEG };
  const ne = { lat: (tileY + 1) * LAT_TILE_DEG, lng: (tileX + 1) * LNG_TILE_DEG };
  const center = { lat: (sw.lat + ne.lat) / 2,  lng: (sw.lng + ne.lng) / 2 };
  return { sw, ne, center };
}

async function captureOrUpdateTile(lat, lng, userId, username, color) {
  const tileId = coordsToTileId(lat, lng);
  const bounds = tileIdToBounds(tileId);

  const existingTile = await Tile.findOne({ tileId }).lean();
  const isRecapture = existingTile && existingTile.ownerId.toString() !== userId.toString();

  const tileData = await Tile.findOneAndUpdate(
    { tileId },
    {
      $set: {
        ownerId: userId, ownerUsername: username, ownerColor: color,
        capturedAt: new Date(),
        location: { type: 'Point', coordinates: [bounds.center.lng, bounds.center.lat] },
        bounds: { sw: bounds.sw, ne: bounds.ne },
      },
      $inc: { captureCount: 1 },
    },
    { upsert: true, new: true }
  );

  return { tileData, isNewTile: !existingTile, isRecapture };
}

async function getNearbyTiles(lat, lng, radiusMeters = 600) {
  return Tile.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: Math.min(radiusMeters, 2000),
      },
    },
  }).limit(1500).lean();
}

module.exports = { coordsToTileId, tileIdToBounds, captureOrUpdateTile, getNearbyTiles };
