const express = require('express');
const Tile = require('../models/Tile');

const router = express.Router();

// GET /api/tiles?lat=&lng=&radius=
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 700 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

    const tiles = await Tile.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: Math.min(parseFloat(radius), 2000),
        },
      },
    }).limit(2000).lean();

    res.json({ tiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tiles/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const tiles = await Tile.find({ ownerId: req.params.userId })
      .sort({ capturedAt: -1 }).limit(500).lean();
    res.json({ tiles });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
