const express = require("express");
const healthController = require("../controllers/health.controller");

const router = express.Router();

// Health check endpoint
router.get("/", healthController.healthCheck);

module.exports = router;
