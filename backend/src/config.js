const dotenv = require("dotenv");

dotenv.config();

const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

const tursoUrl = process.env.TURSO_CONNECTION_URL || process.env.TURSO_DATABASE_URL || "";

module.exports = {
  PORT: port,
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  TURSO_CONNECTION_URL: tursoUrl,
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || "",
  DEFAULT_REGION_PAGE_SIZE: 25,
  MAX_REGION_PAGE_SIZE: 100,
};

