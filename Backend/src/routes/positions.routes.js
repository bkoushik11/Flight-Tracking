const express = require('express');
const positionsController = require('../controllers/positions.controller');

const router = express.Router();

// POST /api/positions/start
router.post('/start', positionsController.startRecording);

// POST /api/positions/stop
router.post('/stop', positionsController.stopRecording);

// POST /api/positions/add
router.post('/add', positionsController.addPosition);

// GET /api/positions/recorded
router.get('/recorded', positionsController.listRecordedFlights);

// DELETE /api/positions/:flightId
router.delete('/:flightId', positionsController.deleteRecordedFlight);

// GET /api/positions/default?flightId=...
router.get('/default', positionsController.getDefaultPositions);

module.exports = router;


