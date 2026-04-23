const { haversineDistance } = require('./geoUtils');

const MAX_SPEED_MS      = 14;   // 14 m/s ≈ 50 km/h (generous for GPS drift)
const MAX_JUMP_DISTANCE = 500;  // meters — max plausible jump between updates
const VIOLATION_THRESHOLD = 3;  // consecutive violations before flagging client

const userLastPositions  = new Map();
const userViolations     = new Map();

/** Seed the starting position so the first update is never flagged as a teleport */
function seedPosition(socketId, lat, lng) {
  userLastPositions.set(socketId, { lat, lng, timestamp: Date.now() });
  userViolations.set(socketId, 0);
}

function validateLocationUpdate(socketId, lat, lng, timestamp) {
  const last = userLastPositions.get(socketId);

  if (!last) {
    // First update — always accept and seed
    userLastPositions.set(socketId, { lat, lng, timestamp });
    userViolations.set(socketId, 0);
    return { valid: true, speed: 0 };
  }

  const distance  = haversineDistance(last.lat, last.lng, lat, lng);
  const deltaMs   = timestamp - last.timestamp;
  const deltaSecs = Math.max(deltaMs / 1000, 0.1); // floor at 0.1s

  // Too fast GPS update — skip (debounce)
  if (deltaMs < 500) return { valid: true, speed: 0, skipped: true };

  const speedMs  = distance / deltaSecs;
  const speedKmh = speedMs * 3.6;

  // Check for teleportation
  if (distance > MAX_JUMP_DISTANCE && deltaSecs < 30) {
    const violations = (userViolations.get(socketId) || 0) + 1;
    userViolations.set(socketId, violations);
    console.warn(`⚠️  Teleport [${socketId}]: ${distance.toFixed(0)}m in ${deltaSecs.toFixed(1)}s (violation #${violations})`);
    return {
      valid:     false,
      sustained: violations >= VIOLATION_THRESHOLD,
      reason:    'Teleport detected',
      distance,
      speed:     speedKmh,
    };
  }

  // Check speed
  if (speedMs > MAX_SPEED_MS) {
    const violations = (userViolations.get(socketId) || 0) + 1;
    userViolations.set(socketId, violations);
    console.warn(`⚠️  Speed [${socketId}]: ${speedKmh.toFixed(1)} km/h (violation #${violations})`);
    return {
      valid:     false,
      sustained: violations >= VIOLATION_THRESHOLD,
      reason:    'Speed too high',
      speed:     speedKmh,
      distance,
    };
  }

  // Valid — reset violation counter and update last position
  userViolations.set(socketId, 0);
  userLastPositions.set(socketId, { lat, lng, timestamp });
  return { valid: true, speed: speedKmh, distance, deltaSecs };
}

function clearUserPosition(socketId) {
  userLastPositions.delete(socketId);
  userViolations.delete(socketId);
}

module.exports = { validateLocationUpdate, clearUserPosition, seedPosition };
