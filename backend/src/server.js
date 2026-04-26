const { PORT } = require("./config");
const { getClient } = require("./db");
const { createApp } = require("./app");

async function main() {
  // Verify database connection
  const db = getClient();
  
  try {
    const row = db.prepare("SELECT 1 FROM regions LIMIT 1").get();
    if (!row) {
      console.warn("Database is empty or regions table is missing.");
    } else {
      console.log("Database connection verified.");
    }
  } catch (error) {
    console.error("Failed to connect to database:", error.message);
    process.exit(1);
  }

  const app = createApp(db);
  const server = app.listen(PORT, () => {
    console.log(`Dashboard backend listening on http://127.0.0.1:${PORT}`);
    console.log(`Database Path: ${require("./config").DB_PATH}`);
  });


  function shutdown(signal) {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      process.exit(0);
    });

    setTimeout(() => {
      process.exit(1);
    }, 5000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
