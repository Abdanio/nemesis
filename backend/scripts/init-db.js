const fs = require("fs");
const path = require("path");
const axios = require("axios");
const unzipper = require("unzipper");
const { DB_PATH } = require("../src/config");
const { importSqlDump } = require("../src/db-transfer");

async function downloadFile(url, outputPath) {
  console.log(`[INIT] Starting download from: ${url}`);
  const response = await axios({
    method: "get",
    url: url,
    responseType: "stream",
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      console.log(`[INIT] Download finished: ${outputPath}`);
      resolve();
    });
    writer.on("error", (err) => {
      console.error(`[INIT] Download error: ${err.message}`);
      reject(err);
    });
  });
}

async function initializeDatabase() {
  const dataDir = path.dirname(DB_PATH);
  const GDRIVE_ZIP_URL = process.env.GDRIVE_DB_ZIP_URL;

  console.log(`[INIT] Checking database at: ${DB_PATH}`);
  
  if (fs.existsSync(DB_PATH)) {
    console.log("[INIT] Database already exists. Skipping.");
    return;
  }

  if (!GDRIVE_ZIP_URL) {
    throw new Error("GDRIVE_DB_ZIP_URL is not set in environment variables.");
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const zipPath = path.join(dataDir, "database.zip");

  try {
    await downloadFile(GDRIVE_ZIP_URL, zipPath);
    
    console.log("[INIT] Opening zip file...");
    const directory = await unzipper.Open.file(zipPath);
    
    const sqlFile = directory.files.find(f => f.path.endsWith(".sql"));
    const sqliteFile = directory.files.find(f => f.path.endsWith(".sqlite") || f.path.endsWith(".db"));

    if (sqliteFile) {
      console.log(`[INIT] Found SQLite file: ${sqliteFile.path}. Extracting...`);
      const content = await sqliteFile.buffer();
      fs.writeFileSync(DB_PATH, content);
    } else if (sqlFile) {
      console.log(`[INIT] Found SQL dump: ${sqlFile.path}. Extracting and importing...`);
      const tempSqlPath = path.join(dataDir, "temp_import.sql");
      const content = await sqlFile.buffer();
      fs.writeFileSync(tempSqlPath, content);
      
      console.log("[INIT] Starting SQL import (this may take a while)...");
      await importSqlDump(tempSqlPath, DB_PATH);
      fs.unlinkSync(tempSqlPath);
    } else {
      throw new Error("No .sql or .sqlite file found in the zip.");
    }

    console.log("[INIT] Database initialization SUCCESSFUL!");
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  } catch (error) {
    console.error(`[INIT] FATAL ERROR: ${error.message}`);
    throw error;
  }
}

module.exports = { initializeDatabase };

if (require.main === module) {
  initializeDatabase().catch(() => process.exit(1));
}
