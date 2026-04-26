const express = require("express");
const cors = require("cors");
const { CORS_ORIGIN } = require("./config");
const {
  getBootstrapPayload,
  getOwnerPackages,
  getRegionPackages,
  getProvincePackages,
  getRegionUmkmSummary,
} = require("./dashboard-repository");

function resolveCorsOrigin() {
  if (CORS_ORIGIN === "*") return "*";
  return CORS_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean);
}

function createApp(db) {
  const app = express();

  app.use(cors({ origin: resolveCorsOrigin() }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/bootstrap", async (_req, res, next) => {
    try {
      const payload = await getBootstrapPayload(db);
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/regions/:regionKey/packages", async (req, res, next) => {
    try {
      const payload = await getRegionPackages(db, req.params.regionKey, req.query);
      if (!payload) return res.status(404).json({ error: "Region not found" });
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/provinces/:provinceKey/packages", async (req, res, next) => {
    try {
      const payload = await getProvincePackages(db, req.params.provinceKey, req.query);
      if (!payload) return res.status(404).json({ error: "Province not found" });
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/regions/:regionKey/umkm", async (req, res, next) => {
    try {
      const payload = await getRegionUmkmSummary(db, req.params.regionKey);
      if (!payload) return res.status(404).json({ error: "Region not found" });
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/owners/packages", async (req, res, next) => {
    try {
      const ownerType = (req.query.ownerType || "").trim();
      const ownerName = (req.query.ownerName || "").trim();

      if (!ownerType || !ownerName) {
        return res.status(400).json({ error: "ownerType and ownerName are required" });
      }

      const payload = await getOwnerPackages(db, req.query);
      if (!payload) return res.status(404).json({ error: "Owner not found" });
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

module.exports = { createApp };
