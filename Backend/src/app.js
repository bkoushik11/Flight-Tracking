const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const helmet = require("helmet");

const app = express();

// Middleware
const allowOrigin = process.env.CORS_ORIGIN || "*";
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: allowOrigin === "*" ? true : allowOrigin.split(",").map(s => s.trim()),
  credentials: true
}));
app.use(express.json());

// Mount all routes
app.use("/", routes);

module.exports = app;
