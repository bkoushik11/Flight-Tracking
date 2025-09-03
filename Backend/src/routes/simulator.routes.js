const express = require("express");
const simulatorController = require("../controllers/simulator.controller");

const router = express.Router();

router.get("/status", simulatorController.status);
router.post("/pause", simulatorController.pause);
router.post("/resume", simulatorController.resume);

module.exports = router;
