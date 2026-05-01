# Turso Database Migration

Project ini sudah dimigrasikan dari **better-sqlite3** (local SQLite) ke **Turso** (remote database).

## Setup Turso

### 1. Buat Account Turso
- Kunjungi [https://app.turso.tech](https://app.turso.tech)
- Sign up atau login
- Pilih plan (free tier tersedia)

### 2. Buat atau Pilih Database
- Di dashboard Turso, buat database baru atau pilih yang sudah ada
- Database akan dibuat dengan lokasi default (PHL/SFO)
- Nama database bisa bebas, misal: `nemesis-db`

### 3. Ambil Credentials
Setelah database dibuat:
- Klik pada database name
- Tab "Access" → Copy **CONNECTION URL**
- Copy **AUTH TOKEN**

Contoh format:
```
CONNECTION URL: libsql://nemesis-db-username.turso.tech
AUTH TOKEN:     eyJ...fQ (panjang, hashed token)
```

### 4. Setup Environment Variables
1. Copy `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` dan isi nilai Turso:
   ```env
   TURSO_CONNECTION_URL=libsql://nemesis-db-username.turso.tech
   TURSO_AUTH_TOKEN=eyJ...fQ
   ```

### 5. Import Data ke Turso
Option A - Dari Google Drive (recommended):
```bash
GDRIVE_DB_ZIP_URL="https://drive.google.com/file/d/YOUR_FILE_ID/view" npm run prestart
```

Option B - Manual import:
1. Export data dari local SQLite
2. Buat table struktur di Turso via SQL
3. Import data menggunakan Turso CLI atau dashboard

### 6. Test Connection
```bash
npm run dev
```

Cek logs untuk `Database connection verified.`

## Arsitektur Async

Semua fungsi database di `dashboard-repository.js` sekarang **async**:
- `getBootstrapPayload(db)` → `async function`
- `getRegionPackages(db, regionKey, query)` → `async function`
- Dll.

Wrapper di `db.js` (TursoClientWrapper) mengemulate interface `better-sqlite3`:
- `db.prepare(sql).get(...params)` → `await db.prepare(sql).get(...params)`
- `db.prepare(sql).all(...params)` → `await db.prepare(sql).all(...params)`

Routes di `app.js` sudah menggunakan `async/await`.

## Notes

- Database connection di-pool otomatis oleh libsql client
- Turso mendukung point-in-time recovery (PITR)
- Free tier: 9 GB storage, unlimited reads, 1M writes/month
- Untuk production, pertimbangkan tier berbayar untuk SLA

## Troubleshooting

**Error: "Database connection failed"**
- Cek TURSO_CONNECTION_URL dan TURSO_AUTH_TOKEN di `.env`
- Pastikan format URL benar: `libsql://...turso.tech`

**Error: "Table not found"**
- Database kosong, perlu import data
- Gunakan script `npm run prestart` dengan GDRIVE_DB_ZIP_URL

**Slow queries**
- Turso regional replicas untuk read dapat meningkatkan speed
- Lihat dashboard Turso untuk analytics

## Refs

- Turso Docs: https://docs.turso.tech
- libsql Client: https://github.com/libsql/libsql-client-ts
- Dashboard Backend: `src/db.js`, `src/dashboard-repository.js`
