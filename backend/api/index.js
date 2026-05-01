let _app = null;
let initPromise = null;
let initError = null;

function resolveCorsConfig() {
  const originEnv = String(process.env.CORS_ORIGIN || "*").trim();
  const methods = ["GET", "OPTIONS", "PATCH", "DELETE", "POST", "PUT"];
  const allowedHeaders = [
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Content-Type",
    "Date",
    "X-Api-Version",
  ];

  if (originEnv === "*") {
    return { originEnv, methods, allowedHeaders, allowList: null };
  }

  const allowList = originEnv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return { originEnv, methods, allowedHeaders, allowList };
}

function applyCors(req, res) {
  const { methods, allowedHeaders, allowList } = resolveCorsConfig();
  const requestOrigin = req.headers?.origin;

  // If allow-list is configured, reflect origin only when allowed.
  // If "*" is configured, reflect any origin to keep compatibility with credentials-less fetch.
  const allowedOrigin = allowList
    ? allowList.includes(requestOrigin) ? requestOrigin : ""
    : requestOrigin || "*";

  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", methods.join(","));
  res.setHeader("Access-Control-Allow-Headers", allowedHeaders.join(","));
  res.setHeader("Access-Control-Max-Age", "86400");
}

async function getApp() {
  if (initError) throw initError;

  if (!_app) {
    if (!initPromise) {
      initPromise = Promise.resolve()
        .then(async () => {
          const { getClient } = require("../src/db");
          const { createApp } = require("../src/app");
          const db = getClient();
          await db.execute("SELECT 1");
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
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const app = await getApp();

    return app(req, res);
  } catch (err) {
    console.error("[API] Error handling request:", err.message);
    res.status(500).json({ 
      error: "Initialization failed", 
      details: err.message 
    });
  }
};
