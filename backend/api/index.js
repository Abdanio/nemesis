const { getClient } = require("../src/db");
const { createApp } = require("../src/app");
const { initializeDatabase } = require("../scripts/init-db");

let isInitialized = false;
let initError = null;

// Jalankan inisialisasi (download/unzip) secara background
const initPromise = initializeDatabase()
  .then(() => { isInitialized = true; })
  .catch((err) => { initError = err; });

const db = getClient();
const app = createApp(db);

// Middleware tambahan untuk memastikan CORS berjalan di Vercel
app.use(async (req, res, next) => {
  // Pastikan inisialisasi selesai sebelum melayani request
  if (!isInitialized && !initError) {
    await initPromise;
  }

  if (initError) {
    return res.status(500).json({ 
      error: "Database initialization failed", 
      details: initError.message 
    });
  }

  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

module.exports = app;
