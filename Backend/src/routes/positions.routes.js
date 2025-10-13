const express = require('express');
const positionsController = require('../controllers/positions.controller');

const router = express.Router();

// GET /api/positions/default?flightId=...
router.get('/default', positionsController.getDefaultPositions);

module.exports = router;


