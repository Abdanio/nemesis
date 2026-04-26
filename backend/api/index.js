const { getClient } = require("../src/db");
const { createApp } = require("../src/app");
const { initializeDatabase, logBuffer } = require("../scripts/init-db");

let _app = null;
let initPromise = null;
let initError = null;

async function getApp() {
  if (initError) throw initError;
  
  if (!_app) {
    if (!initPromise) {
      initPromise = initializeDatabase()
        .then(() => {
          const db = getClient();
          _app = createApp(db);
        })
        .catch((err) => {
          initError = err;
          throw err;
        });
    }
    await initPromise;
  }
  return _app;
}

// Vercel Serverless Function entry point
module.exports = async (req, res) => {
  const url = req.url || "/";

  // Endpoint untuk cek status log secara real-time
  if (url === "/api/status") {
    return res.json({
      initialized: !!_app,
      error: initError ? initError.message : null,
      logs: logBuffer
    });
  }

  // Halaman monitoring dashboard di root backend
  if (url === "/" || url === "/index.html") {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Nemesis Backend Monitor</title>
        <style>
          body { font-family: monospace; background: #1a1a1a; color: #00ff00; padding: 20px; }
          .log-entry { margin-bottom: 5px; border-bottom: 1px solid #333; padding-bottom: 2px; }
          .time { color: #888; margin-right: 10px; }
          .error { color: #ff0000; }
          .status { font-weight: bold; margin-bottom: 20px; padding: 10px; border: 1px solid #00ff00; }
          .loading { animation: blink 1s infinite; }
          @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        </style>
      </head>
      <body>
        <h1>Nemesis Backend Monitor</h1>
        <div id="status" class="status loading">Initializing...</div>
        <div id="logs"></div>
        <script>
          async function updateStatus() {
            try {
              const res = await fetch('/api/status');
              const data = await res.json();
              
              const statusEl = document.getElementById('status');
              if (data.error) {
                statusEl.innerHTML = 'ERROR: ' + data.error;
                statusEl.className = 'status error';
              } else if (data.initialized) {
                statusEl.innerHTML = 'SUCCESS: Backend Ready';
                statusEl.className = 'status';
              } else {
                statusEl.innerHTML = 'Initializing Database...';
              }

              const logsEl = document.getElementById('logs');
              logsEl.innerHTML = data.logs.map(l => \`
                <div class="log-entry \${l.isError ? 'error' : ''}">
                  <span class="time">[\${l.time}]</span> \${l.message}
                </div>
              \`).reverse().join('');
            } catch (e) {}
          }
          setInterval(updateStatus, 1000);
          updateStatus();
        </script>
      </body>
      </html>
    `);
  }

  try {
    const app = await getApp();
    
    // Manual CORS headers
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

    return app(req, res);
  } catch (err) {
    console.error("[API] Error handling request:", err.message);
    res.status(500).json({ 
      error: "Initialization failed", 
      details: err.message 
    });
  }
};
