const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { captureOrUpdateTile, getNearbyTiles } = require('../services/tileService');
const { validateLocationUpdate, clearUserPosition, seedPosition } = require('../services/antiCheat');
const { haversineDistance } = require('../services/geoUtils');

// socketId -> runner state
const activeRunners = new Map();

function initializeSocketHandlers(io) {
  // JWT auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`🔌 Connected: ${user.username} (${socket.id})`);

    // ── START RUN ─────────────────────────────────────────────
    socket.on('start-run', async ({ lat, lng }) => {
      // Seed anti-cheat with the starting position so the first
      // location-update is never flagged as a teleport
      seedPosition(socket.id, lat, lng);

      activeRunners.set(socket.id, {
        userId:          user._id.toString(),
        username:        user.username,
        color:           user.color,
        isPrivate:       user.isPrivate,
        lat, lng,
        startTime:       Date.now(),
        tilesCaptured:   0,
        tilesRecaptured: 0,
        distance:        0,
        currentSpeed:    0,
      });

      console.log(`🏃 ${user.username} started run @ [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);

      // Send initial tile snapshot for user's area
      const tiles = await getNearbyTiles(lat, lng, 700);
      socket.emit('tiles-snapshot', { tiles });

      // Notify other clients
      socket.broadcast.emit('user-started-run', {
        userId: user._id.toString(), username: user.username,
        color: user.color, lat, lng,
      });
    });

    // ── LOCATION UPDATE ───────────────────────────────────────
    socket.on('location-update', async ({ lat, lng, accuracy }) => {
      const timestamp = Date.now();
      const validation = validateLocationUpdate(socket.id, lat, lng, timestamp);

      if (!validation.valid) {
        // Only alert client on sustained violations (not one-off GPS jitter)
        if (validation.sustained) {
          socket.emit('cheat-detected', { reason: validation.reason, speed: validation.speed });
        }
        return;
      }
      if (validation.skipped) return;

      const runner = activeRunners.get(socket.id);
      if (!runner) return;

      // Accumulate distance
      if (runner.lat != null && runner.lng != null) {
        runner.distance += haversineDistance(runner.lat, runner.lng, lat, lng);
      }
      runner.lat          = lat;
      runner.lng          = lng;
      runner.currentSpeed = validation.speed || 0;

      // Capture tile
      try {
        const { tileData, isNewTile, isRecapture } = await captureOrUpdateTile(
          lat, lng, user._id.toString(), user.username, user.color
        );

        if (isNewTile)    runner.tilesCaptured++;
        if (isRecapture)  runner.tilesRecaptured++;

        // Broadcast tile change to ALL clients
        io.emit('tile-update', {
          tileId:        tileData.tileId,
          ownerId:       tileData.ownerId.toString(),
          ownerUsername: tileData.ownerUsername,
          ownerColor:    tileData.ownerColor,
          capturedAt:    tileData.capturedAt,
          bounds:        tileData.bounds,
          isNewTile,
          isRecapture,
        });
      } catch (err) {
        console.error('Tile capture error:', err.message);
      }

      // Broadcast user position to non-private users
      if (!user.isPrivate) {
        socket.broadcast.emit('user-position', {
          userId:   user._id.toString(),
          username: user.username,
          color:    user.color,
          lat, lng,
          speed:    runner.currentSpeed,
        });
      }

      // Send live stats to this user
      const elapsed = (Date.now() - runner.startTime) / 1000;
      socket.emit('run-stats', {
        distance:        runner.distance,
        speed:           runner.currentSpeed,
        duration:        elapsed,
        tilesCaptured:   runner.tilesCaptured,
        tilesRecaptured: runner.tilesRecaptured,
      });
    });

    // ── NEARBY USERS ──────────────────────────────────────────
    socket.on('get-nearby-users', ({ lat, lng, radius = 1000 }) => {
      const nearby = [];
      for (const [sid, r] of activeRunners.entries()) {
        if (sid === socket.id || r.isPrivate || r.lat == null) continue;
        const dist = haversineDistance(lat, lng, r.lat, r.lng);
        if (dist <= radius) {
          nearby.push({ userId: r.userId, username: r.username, color: r.color, lat: r.lat, lng: r.lng, distance: Math.round(dist) });
        }
      }
      socket.emit('nearby-users', { users: nearby });
    });

    // ── STOP RUN ──────────────────────────────────────────────
    socket.on('stop-run', () => {
      const runner = activeRunners.get(socket.id);
      if (runner) {
        console.log(`🛑 ${user.username} stopped — ${runner.distance.toFixed(0)}m, ${runner.tilesCaptured} tiles`);
        activeRunners.delete(socket.id);
        clearUserPosition(socket.id);
        socket.broadcast.emit('user-stopped-run', { userId: user._id.toString() });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`⛔ Disconnected: ${user.username}`);
      if (activeRunners.has(socket.id)) {
        activeRunners.delete(socket.id);
        clearUserPosition(socket.id);
        socket.broadcast.emit('user-stopped-run', { userId: user._id.toString() });
      }
    });
  });
}

module.exports = { initializeSocketHandlers };
