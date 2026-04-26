const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "../data/dashboard.sqlite");

module.exports = {
  PORT: port,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  DB_PATH: dbPath,
  DEFAULT_REGION_PAGE_SIZE: 25,
  MAX_REGION_PAGE_SIZE: 100,
};

