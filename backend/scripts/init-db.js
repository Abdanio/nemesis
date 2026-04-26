const fs = require("fs");
const path = require("path");
const axios = require("axios");
const unzipper = require("unzipper");
const { DB_PATH } = require("../src/config");
const { importSqlDump } = require("../src/db-transfer");

// Google Drive Link placeholder - User should put their link in .env
const GDRIVE_ZIP_URL = process.env.GDRIVE_DB_ZIP_URL;

async function downloadFile(url, outputPath) {
  console.log(`Downloading database from Google Drive...`);
  
  // Basic GDrive download handling (this might need refinement for very large files with virus warnings)
  const response = await axios({
    method: "get",
    url: url,
    responseType: "stream",
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function main() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    console.log("Database already exists. Skipping initialization.");
    return;
  }

  if (!GDRIVE_ZIP_URL) {
    console.error("GDRIVE_DB_ZIP_URL is not set in .env");
    process.exit(1);
  }

  const zipPath = path.join(dataDir, "database.zip");

  try {
    await downloadFile(GDRIVE_ZIP_URL, zipPath);
    console.log("Download complete. Unzipping...");

    const directory = await unzipper.Open.file(zipPath);
    
    // Look for .sql or .sqlite files
    const sqlFile = directory.files.find(f => f.path.endsWith(".sql"));
    const sqliteFile = directory.files.find(f => f.path.endsWith(".sqlite") || f.path.endsWith(".db"));

    if (sqliteFile) {
      console.log(`Found SQLite file: ${sqliteFile.path}. Extracting...`);
      const content = await sqliteFile.buffer();
      fs.writeFileSync(DB_PATH, content);
    } else if (sqlFile) {
      console.log(`Found SQL dump: ${sqlFile.path}. Extracting and importing...`);
      const tempSqlPath = path.join(dataDir, "temp_import.sql");
      const content = await sqlFile.buffer();
      fs.writeFileSync(tempSqlPath, content);
      
      console.log("Starting SQL import (this may take a while for large files)...");
      await importSqlDump(tempSqlPath, DB_PATH);
      fs.unlinkSync(tempSqlPath);
    } else {
      throw new Error("No .sql or .sqlite file found in the zip.");
    }

    console.log("Database initialization successful!");
    fs.unlinkSync(zipPath);
  } catch (error) {
    console.error("Failed to initialize database:", error.message);
    process.exit(1);
  }
}

main();
