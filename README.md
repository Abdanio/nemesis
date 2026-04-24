# Nemesis — Audit Dashboard Pengadaan Publik

> **📌 Dokumen ini sekaligus berfungsi sebagai AI Agent Prompt.**
> Berikan seluruh isi file ini kepada AI agent agar ia memahami proyek ini secara menyeluruh sebelum melakukan modifikasi apapun.

---

## 🤖 AI AGENT PROMPT

```
Kamu adalah AI coding assistant yang membantu mengembangkan proyek "Nemesis" —
sebuah dashboard audit pengadaan barang/jasa publik berbasis peta interaktif untuk
wilayah Indonesia. Sebelum melakukan perubahan apapun, pahami konteks lengkap
proyek ini dari dokumen README.md ini. Selalu ikuti pola arsitektur yang sudah ada,
jangan mengubah struktur yang sudah berjalan tanpa alasan yang kuat.
```

---

## 📋 Deskripsi Proyek

**Nemesis** adalah sebuah web dashboard audit pengadaan publik (LKPP/SiRUP) yang memvisualisasikan potensi pemborosan anggaran, anomali severity, dan paket pengadaan per Kabupaten/Kota & Provinsi di seluruh Indonesia untuk **Tahun Anggaran 2026**.

Dashboard ini terdiri dari dua bagian utama:
- **Backend** — REST API berbasis Node.js + Express + SQLite (better-sqlite3)
- **Frontend** — Single-page vanilla HTML/CSS/JS dengan peta interaktif MapLibre GL

---

## 🗂️ Struktur Direktori

```
nemesis/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app & route definitions
│   │   ├── config.js               # Environment config (PORT, paths, etc.)
│   │   ├── dashboard-repository.js # Semua query SQLite & data transformation
│   │   ├── db.js                   # Database open/schema check helpers
│   │   ├── db-transfer.js          # Export/import database helpers
│   │   ├── seed.js                 # Seed data & schema migration logic
│   │   └── server.js               # Entry point, startup validasi schema
│   ├── scripts/
│   │   ├── reset-db.js             # Rebuild DB dari seed data
│   │   ├── export-db.js            # Export DB ke file dump
│   │   └── import-db.js            # Import DB dari file dump
│   ├── data/
│   │   └── dashboard.sqlite        # Database SQLite runtime (~2.4 GB)
│   ├── seed/
│   │   └── geo/                    # GeoJSON kab/kota & provinsi
│   │       ├── 02-provinces/
│   │       └── 03-districts/
│   ├── .env                        # Environment variables (tidak di-commit)
│   ├── .env.example                # Template environment
│   └── package.json
│
└── frontend/
    ├── index.html                  # Single HTML shell
    └── assets/
        ├── css/
        │   └── styles.css          # Semua styling (design system dark-mode)
        └── js/
            ├── map.js              # MapLibre GL wrapper (AuditMap module)
            └── app.js              # Dashboard logic utama (1700+ baris)
```

---

## ⚙️ Backend

### Stack
| Komponen | Teknologi |
|---|---|
| Runtime | Node.js (bun-compatible) |
| Framework | Express 5 |
| Database | SQLite via `better-sqlite3` (synchronous) |
| ORM | Tidak ada — raw SQL query |
| Env | dotenv |

### Environment Variables (`.env`)
```env
PORT=3000
CORS_ORIGIN=*
SQLITE_PATH=data/dashboard.sqlite
AUDIT_DATASET_DIR=dataset
AUDIT_DATASET_YEAR=2026
GEO_ROOT_PATH=seed/geo
```

### Cara Menjalankan Backend
```bash
cd backend
npm install          # atau: bun install
npm run start        # production
npm run dev          # development (node --watch)
npm run db:reset     # rebuild DB dari seed data
npm run db:export    # export DB ke file dump
npm run db:import    # import DB dari file dump
```

### REST API Endpoints

Semua endpoint berada di bawah prefix `/api/`:

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/api/health` | Health check → `{ status: "ok" }` |
| `GET` | `/api/bootstrap` | Payload utama: summary nasional, geo JSON, regions, provinces, ownerLists |
| `GET` | `/api/regions/:regionKey/packages` | Paket pengadaan per kab/kota (paginasi, filter) |
| `GET` | `/api/regions/:regionKey/umkm` | Ringkasan & paket UMKM potensial per kab/kota |
| `GET` | `/api/provinces/:provinceKey/packages` | Paket pemprov per provinsi (paginasi, filter) |
| `GET` | `/api/owners/packages` | Paket per K/L (query: `ownerType`, `ownerName`) |

#### Query Parameters (packages endpoints)
| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `page` | integer | `1` | Halaman saat ini |
| `pageSize` | integer | `25` | Jumlah item per halaman (max 100) |
| `search` | string | `""` | Search pada nama paket, pemilik, satker |
| `ownerType` | enum | `""` | `central` / `provinsi` / `kabkota` / `other` |
| `severity` | enum | `""` | `low` / `med` / `high` / `absurd` |
| `priorityOnly` | boolean | `false` | Filter hanya paket prioritas audit |

### Skema Database SQLite

#### Tabel utama:
- **`packages`** — Setiap baris adalah satu paket pengadaan dengan field: `id`, `source_id`, `package_name`, `owner_name`, `owner_type`, `satker`, `location_raw`, `budget`, `procurement_type`, `procurement_method`, `severity`, `potential_waste`, `reason`, `risk_score`, `is_priority`, `is_flagged`, `is_mencurigakan`, `is_pemborosan`, `mapped_region_count`, `active_tag_count`
- **`regions`** — Master data kab/kota: `region_key`, `code`, `province_name`, `region_name`, `region_type` (Kota/Kabupaten), `display_name`
- **`provinces`** — Master data provinsi: `province_key`, `code`, `province_name`, `display_name`
- **`region_metrics`** — Agregat per kab/kota (total paket, budget, waste, severity counts, owner breakdown)
- **`province_metrics`** — Agregat per provinsi
- **`owner_metrics`** — Agregat per pemilik (K/L, Pemprov, Pemkot, Others)
- **`package_regions`** — Join table paket ↔ kab/kota (support multi-lokasi)
- **`package_provinces`** — Join table paket ↔ provinsi
- **`assets`** — Blob storage GeoJSON (key: `audit_geojson`, `audit_province_geojson`)

#### Enum Values
- **`owner_type`**: `central` (K/L), `provinsi` (Pemprov), `kabkota` (Pemkot), `other`
- **`severity`**: `low`, `med`, `high`, `absurd`
- **`region_type`**: `Kota`, `Kabupaten`, `Provinsi`

### `/api/bootstrap` Response Shape
```json
{
  "summary": {
    "totalPackages": 0,
    "totalPriorityPackages": 0,
    "totalPotentialWaste": 0,
    "totalBudget": 0,
    "unmappedPackages": 0,
    "multiLocationPackages": 0
  },
  "legend": {
    "zeroColor": "#243155",
    "ranges": [{ "key": "band-1", "color": "#7b86a3", "min": 0, "max": 0 }]
  },
  "geo": { "type": "FeatureCollection", "features": [] },
  "regions": [
    {
      "regionKey": "...",
      "displayName": "Kota Bandung",
      "regionType": "Kota",
      "provinceName": "Jawa Barat",
      "totalPackages": 0,
      "totalPriorityPackages": 0,
      "totalPotentialWaste": 0,
      "totalBudget": 0,
      "severityCounts": { "med": 0, "high": 0, "absurd": 0 },
      "ownerMix": { "central": 0, "provinsi": 0, "kabkota": 0, "other": 0 },
      "ownerMetrics": {
        "central": { "totalPackages": 0, "totalPotentialWaste": 0, "totalBudget": 0, "totalPriorityPackages": 0 }
      },
      "avgRiskScore": 0.0,
      "maxRiskScore": 0,
      "dominantOwnerType": "kabkota"
    }
  ],
  "provinceView": {
    "legend": {},
    "geo": {},
    "provinces": []
  },
  "ownerLists": {
    "central": []
  }
}
```

---

## 🖥️ Frontend

### Stack
| Komponen | Teknologi |
|---|---|
| HTML | Vanilla HTML5 semantik |
| CSS | Vanilla CSS (design tokens via CSS variables) |
| JavaScript | Vanilla ES2020+ (IIFE, async/await, Canvas API) |
| Peta | MapLibre GL v4 (CDN) |
| Font | Plus Jakarta Sans + JetBrains Mono (Google Fonts) |
| Base Map | CARTO Dark Matter GL Style |

### Arsitektur Frontend

Frontend terdiri dari dua modul JavaScript:

#### `map.js` — `window.AuditMap`
IIFE module yang membungkus MapLibre GL. API publik:
```js
AuditMap.render(container, geo, options, onReady)
// options: { getFeatureStyle, getPopupHtml, onAreaClick, fitBounds, isProvinceView }

AuditMap.refresh(geo, getFeatureStyle)
// Re-render layer tanpa re-init peta

AuditMap.zoomToRegion(feature, { padding, duration, maxZoom })
// Zoom ke bounding box sebuah GeoJSON feature

AuditMap.closePopup()
// Tutup hover popup
```

#### `app.js` — Dashboard Logic (IIFE)
Satu IIFE besar (~1700+ baris) yang mengatur seluruh state dan render. Struktur internal:

```
state {}           — mapFilter, tab, selectedAreaKey, modal params
dom {}             — reference ke DOM elements
FILTERS []         — chip filter: central/provinsi/kabkota/other
TABS []            — tab: all/kabupaten/kota
SEVERITY_FILTERS[] — low/med/high/absurd

// Format utilities
formatCompactCurrency()  — "1.2 T", "500 M", "10 K"
formatCurrencyLong()     — "Rp 1.234.567"
formatNumber()           — "1.234"

// Data access
getActiveAreas()         — ambil regions atau provinces sesuai view
getActiveGeo()           — GeoJSON aktif
getSidebarAreaMetrics()  — metrics per area sesuai filter owner aktif
getLegendColor()         — warna choropleth berdasarkan nilai

// Render functions
renderKpis()             — 4 KPI cards di header
renderLegend()           — legenda peta
renderFilterChips()      — chips Kementerian/Pemprov/Pemkot/Others
renderTabs()             — tab Semua/Kabupaten/Kota
renderSidebarContent()   — daftar area/owner di sidebar
renderRegionModalContent() — modal detail kab/kota
renderProvinceModalContent() — modal detail provinsi
renderOwnerModalContent()   — modal detail K/L

// Chart functions (Canvas API)
drawPieChart(canvasId, slices, { donut })  — menggambar pie/donut chart
scheduleChart(canvasId, slices, opts)      — requestAnimationFrame wrapper
renderBudgetChart(region)   — donut chart distribusi pagu per owner
renderAnomalySection(region)— donut chart severity + anomaly score + filter pills

// Bandung features
findBandungRegion()       — cari Kota Bandung di data
zoomToBandung()           — zoom peta ke Kota Bandung
showBandungSpotlight()    — tampilkan kartu spotlight Bandung
dismissBandungSpotlight() — sembunyikan kartu spotlight

// Modal actions
openAreaModal(areaKey)         — buka modal detail kab/kota
openOwnerModal(ownerName, type)— buka modal detail K/L
closeRegionModal()             — tutup modal
loadAreaPackages()             — fetch & render paket di modal

// State mutations (exposed via window.dashboardActions)
setMapFilter(key)
setTab(key)
setSearch(value)
setSort(value)
setModalSearch(value)
setModalSeverity(value)
setModalOwnerType(value)
setModalPriorityOnly(bool)
changeModalPage(page)
openPackageDetail(sourceId)    — buka inaproc.id link

// Bootstrap
bootstrap()   — fetch /bootstrap, init map, render semua komponen
```

### CSS Design System

Semua warna menggunakan CSS custom properties:

```css
--b0: #111d35    /* background utama */
--b1: #162040    /* background header/sidebar */
--b2: #1c2847    /* background card */
--b2h: #243155   /* hover state card */
--bd: #2a3a5e    /* border color */

--t1: #e8e4dc    /* text primary */
--t2: #a09b8e    /* text secondary */
--t3: #6b6758    /* text tertiary/muted */

--sage: #b5a882  /* warna aksen utama (emas) */
--olive: #8b7332 /* severity medium */
--rose: #d4a999  /* severity absurd */
--brick: #a83c2e /* severity high / waste indicator */
--steel: #7b86a3 /* severity low */
```

Font:
- **Plus Jakarta Sans** — UI text
- **JetBrains Mono** — angka/nilai monospace

### Komponen UI Utama

| Komponen | Class CSS | Keterangan |
|---|---|---|
| Header | `.hdr` | Logo, judul, LIVE badge, tombol KPI mobile |
| KPI Cards | `.kpi` `.kc` | 4 kartu statistik nasional |
| Map Container | `.ml` `.mc` `#map` | MapLibre GL container |
| Filter Chips | `.moc` `.fc` | Overlay filter di atas peta |
| Legend | `.mlb` `.legend-content` | Legenda choropleth |
| Sidebar | `.sb` `.sbh` `.sbc` | Daftar area/K/L dengan tabs & sort |
| Modal | `.modal-overlay` `.modal` | Full-screen detail modal |
| Bandung Spotlight | `.bandung-spotlight` | Floating card auto-muncul saat load |
| Pie Chart | `.pie-chart-layout` `.pie-canvas-wrap` | Donut chart Canvas API |
| Anomaly Section | `.anomaly-layout` `.anomaly-bars-col` | Anomaly score + bar per severity |
| Waste Ratio Bar | `.waste-ratio-bar` `.wrb-track` | Progress bar rasio pemborosan |

---

## ✨ Fitur-Fitur Dashboard

### 1. Auto-Zoom Kota Bandung
Saat pertama kali halaman dimuat dan data selesai di-fetch, peta otomatis melakukan:
- `findBandungRegion()` — mencari region dengan `regionType === "Kota"` dan nama mengandung "bandung"
- `AuditMap.zoomToRegion(feature, { padding: 100, duration: 1400, maxZoom: 13 })` — smooth zoom
- Setelah 1200ms → `showBandungSpotlight(region)` — kartu floating muncul dengan animasi

### 2. Filter Mode Peta
4 mode via filter chips:
- **Kementerian/Lembaga** (`central`) — map owner mode, sidebar menampilkan daftar K/L nasional
- **Pemprov** (`provinsi`) — province view, peta beralih ke polygon provinsi
- **Pemkot** (`kabkota`) — regional view dengan filter Pemkot
- **Others** (`other`) — regional view dengan filter Others

### 3. Detail Modal Kab/Kota
Klik area peta atau sidebar → buka modal dengan:
- **4 KPI boxes** — Potensi Pemborosan, Paket Prioritas, Total Paket, Total Pagu
- **Mini-stat grid** — breakdown K/L, Pemprov, Pemkot, Others, Severity High/Absurd
- **Pie Chart Distribusi Pagu** — donut chart Canvas API + legend dengan persentase
- **Waste Ratio Bar** — progress bar rasio potensi pemborosan terhadap total pagu
- **Anomaly Score Donut** — skor 0-100 berdasarkan weighted severity (absurd×4, high×3, med×2)
- **Severity Bars** — bar horizontal per severity, klik = filter tabel
- **Severity Filter Pills** — tombol filter paket di tabel (Semua / Absurd / High / Medium / Low)
- **UMKM Section** — async load data paket berpotensi UMKM
- **Package Table** — tabel paket dengan paginasi, search, filter owner/severity/priority

### 4. Deteksi Anomali
Anomaly score dihitung di frontend:
```js
score = min(100, round(((absurd×4 + high×3 + med×2) / (total×4)) × 100))
```
- Score ≥ 60 → **RISIKO TINGGI** (merah)
- Score 30–59 → **PERLU PERHATIAN** (kuning/olive)
- Score < 30 → **RELATIF AMAN** (emas/sage)

Filter severity di anomaly section langsung mengubah filter tabel paket di bawahnya.

### 5. Paket Inaproc Link
Setiap paket dengan `source_id` valid dapat diklik untuk membuka halaman detail di `data.inaproc.id/rup?kode={sourceId}`.

---

## 🔑 Pola & Konvensi Koding

### Backend
- Semua query database menggunakan **synchronous `better-sqlite3`** (tidak ada async/await di layer DB)
- Fungsi `map*Row()` — transform raw SQLite row ke object terstruktur
- Fungsi `build*WhereClause()` — build SQL WHERE + params array secara aman (anti SQL injection)
- Pagination via `LIMIT ? OFFSET ?`
- GeoJSON disimpan sebagai blob JSON di tabel `assets` (key-value store)

### Frontend
- **Tidak ada framework** — pure vanilla JS dengan IIFE pattern
- **State global** tunggal: object `state {}` di dalam IIFE closure
- **HTML generation** via template literal string concatenation (bukan innerHTML langsung dari user input — selalu di-escape via `escapeHtml()` / `escapeAttr()`)
- **Escape functions** wajib dipakai:
  - `escapeHtml(value)` — untuk konten teks
  - `escapeAttr(value)` — untuk nilai attribute HTML
  - `escapeJsString(value)` — untuk string di inline event handler
  - `jsArg(value)` — untuk argument fungsi di inline onclick
  - `actionCall(action, ...args)` — generate `dashboardActions.action(args)` yang aman
- **Canvas API** untuk pie/donut chart — tidak menggunakan library chart eksternal
- **`window.dashboardActions`** — object publik yang di-expose untuk inline event handler di HTML string yang di-generate

### Naming Conventions
- `regionKey` — identifier unik kab/kota (format: string dari DB)
- `provinceKey` — identifier unik provinsi
- `areaKey` — generic, bisa regionKey atau provinceKey tergantung `currentAreaType()`
- `ownerType` — `"central"` | `"provinsi"` | `"kabkota"` | `"other"`
- CSS class: singkatan pendek (`.kc`, `.pi`, `.mkp`, `.ppv`) — intentional untuk ukuran file kecil

---

## 🚀 Setup & Menjalankan Proyek

### Prerequisites
- Node.js ≥ 18 (atau Bun)
- SQLite database sudah terisi (`backend/data/dashboard.sqlite`)

### Langkah
```bash
# 1. Install dependencies backend
cd backend
npm install

# 2. Salin env
cp .env.example .env

# 3. Jika DB belum ada, reset dari seed:
npm run db:reset
# ATAU import dari dump:
npm run db:import -- --in "data/exports/namafile.sqlite"

# 4. Jalankan backend
npm run dev    # development (auto-restart)
# → Backend berjalan di http://127.0.0.1:3000

# 5. Buka frontend
# Buka langsung file frontend/index.html di browser
# ATAU serve dengan HTTP server:
npx serve frontend/
```

### Verifikasi Backend Berjalan
```bash
curl http://127.0.0.1:3000/api/health
# → {"status":"ok"}
```

---

## ⚠️ Hal Penting untuk AI Agent

1. **Jangan ubah struktur escape helper** (`escapeHtml`, `escapeAttr`, `actionCall`, `jsArg`) — ini adalah lapisan keamanan XSS.
2. **Jangan tambahkan library JS baru** tanpa alasan kuat — proyek ini intentionally vanilla.
3. **Canvas chart** (`drawPieChart`, `scheduleChart`) menggunakan `requestAnimationFrame` — pastikan canvas ID unik (gunakan `Date.now()` suffix).
4. **`window.dashboardActions`** harus selalu diperbarui jika menambahkan action baru yang perlu dipanggil dari inline HTML.
5. **Backend adalah synchronous** di layer database — jangan tambahkan async ke fungsi di `dashboard-repository.js`.
6. **CSS class names** sangat singkat secara intentional (misal `.pi`, `.kc`) — jangan rename tanpa update semua referensi di JS.
7. **GeoJSON disimpan di DB** (tabel `assets`) bukan di filesystem saat runtime — fetch via `/api/bootstrap`.
8. **Paket multi-lokasi** dihitung penuh di map (bisa duplikasi) tapi nasional KPI tidak menduplikasi — ini intentional, dokumentasi ada di modal footer.
9. **Bandung spotlight** dan `findBandungRegion()` bergantung pada nama display yang mengandung kata "bandung" — hati-hati jika mengubah data normalization.
10. **`state.modal.severity`** digunakan di dua tempat: untuk filter tabel paket (API call) dan untuk highlight bar anomali (render) — keduanya harus konsisten.

---

## 📁 File Kritis — Jangan Hapus/Rename

| File | Alasan |
|---|---|
| `backend/data/dashboard.sqlite` | Database utama ~2.4GB berisi semua data audit |
| `backend/src/dashboard-repository.js` | Semua query & transformasi data |
| `frontend/assets/js/app.js` | Seluruh logic dashboard |
| `frontend/assets/js/map.js` | MapLibre GL wrapper |
| `frontend/assets/css/styles.css` | Design system lengkap |

---

*Generated: 2026-04-24 | Project: Nemesis v1.0 | TA 2026*
