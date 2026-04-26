const fs = require("fs");
const Database = require("better-sqlite3");
const { DB_PATH } = require("./config");

let _db = null;

function getClient() {
  if (!_db) {
    if (!fs.existsSync(DB_PATH)) {
      console.warn(`Database file not found at ${DB_PATH}. Make sure to download and unzip it.`);
    }
    
    _db = new Database(DB_PATH, { verbose: console.log });
    _db.pragma("journal_mode = WAL");
  }

  return _db;
}

module.exports = {
  getClient,
};

