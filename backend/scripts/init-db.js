const fs = require("fs");
const path = require("path");
const axios = require("axios");
const unzipper = require("unzipper");
const { DB_PATH } = require("../src/config");
const { importSqlDump } = require("../src/db-transfer");

const logBuffer = [];
function log(message, isError = false) {
  const entry = { time: new Date().toLocaleTimeString(), message, isError };
  console.log(`[INIT] ${message}`);
  logBuffer.push(entry);
  if (logBuffer.length > 100) logBuffer.shift();
}

async function downloadFile(url, outputPath) {
  // Auto-convert GDrive view link to download link
  let downloadUrl = url;
  if (url.includes("drive.google.com") && !url.includes("export=download")) {
    const match = url.match(/\/d\/([^/]+)/);
    if (match) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  log(`Target download URL: ${downloadUrl}`);

  // Step 1: Try to get the file or the confirmation page
  let response = await axios({
    method: "get",
    url: downloadUrl,
    responseType: "stream",
  });

  // Step 2: Check if we got a Google Drive "Large File" warning page
  // We check this by looking at the response headers or small chunks of data
  // But a more robust way for GDrive is to check if it's returning HTML instead of zip
  if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
    log("Detected Google Drive virus scan warning. Attempting to bypass...");
    
    // We need to fetch the page as text to find the confirmation token
    const pageRes = await axios.get(downloadUrl);
    const confirmMatch = pageRes.data.match(/confirm=([^&" ]+)/);
    
    if (confirmMatch) {
      const confirmToken = confirmMatch[1];
      downloadUrl += `&confirm=${confirmToken}`;
      log(`Bypassing with token: ${confirmToken}`);
      
      response = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream",
      });
    }
  }

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => {
      log(`Download finished: ${outputPath}`);
      resolve();
    });
    writer.on("error", (err) => {
      log(`Download error: ${err.message}`, true);
      reject(err);
    });
  });
}

async function initializeDatabase() {
  const dataDir = path.dirname(DB_PATH);
  const GDRIVE_ZIP_URL = process.env.GDRIVE_DB_ZIP_URL;

  log(`Checking database at: ${DB_PATH}`);
  
  if (fs.existsSync(DB_PATH)) {
    log("Database already exists. Skipping.");
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
    
    log("Opening zip file...");
    const directory = await unzipper.Open.file(zipPath);
    
    const sqlFile = directory.files.find(f => f.path.endsWith(".sql"));
    const sqliteFile = directory.files.find(f => f.path.endsWith(".sqlite") || f.path.endsWith(".db"));

    if (sqliteFile) {
      log(`Found SQLite file: ${sqliteFile.path}. Extracting...`);
      const content = await sqliteFile.buffer();
      fs.writeFileSync(DB_PATH, content);
    } else if (sqlFile) {
      log(`Found SQL dump: ${sqlFile.path}. Extracting and importing...`);
      const tempSqlPath = path.join(dataDir, "temp_import.sql");
      const content = await sqlFile.buffer();
      fs.writeFileSync(tempSqlPath, content);
      
      log("Starting SQL import (this may take a while)...");
      await importSqlDump(tempSqlPath, DB_PATH);
      fs.unlinkSync(tempSqlPath);
    } else {
      throw new Error("No .sql or .sqlite file found in the zip.");
    }

    log("Database initialization SUCCESSFUL!");
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`, true);
    throw error;
  }
}

module.exports = { initializeDatabase, logBuffer };

if (require.main === module) {
  initializeDatabase().catch(() => process.exit(1));
}
