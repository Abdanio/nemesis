# Crazy Idea: Google Drive Database Strategy

Karena database SQLite Anda berukuran sangat besar (2.5 GB), strategi terbaik untuk deployment (seperti di CodeSandbox atau Serverless) adalah dengan mengunduh dan mengekstraknya saat startup.

## Langkah-langkah yang harus dilakukan di Terminal:

1. **Install gdown** (jika belum ada):
   ```bash
   pip install gdown
   ```

2. **Download file zip dari Google Drive**:
   Ganti `YOUR_GDRIVE_LINK` dengan link file `dashboard.zip` Anda.
   ```bash
   gdown "YOUR_GDRIVE_LINK"
   ```

3. **Ekstrak file**:
   ```bash
   unzip dashboard.zip
   ```

4. **Pindahkan ke lokasi yang benar**:
   Pastikan file `.sqlite` berada di `backend/data/dashboard.sqlite`. Jika hasil unzip masuk ke subfolder `nemesis/`, jalankan:
   ```bash
   mkdir -p backend/data
   mv nemesis/backend/data/dashboard.sqlite backend/data/dashboard.sqlite
   ```

## Konfigurasi Frontend (Vercel)

Jika backend Anda berjalan di CodeSandbox dan frontend di Vercel, pastikan Anda mengatur environment variable di Vercel:
`NEXT_PUBLIC_DASHBOARD_API_BASE_URL` (atau sesuaikan dengan cara Anda menyuntikkan `window.DASHBOARD_API_BASE_URL`) ke URL backend CodeSandbox Anda.

## Penyesuaian Kode yang Telah Dilakukan:

1. **`db.js`**: Sekarang menggunakan `better-sqlite3` dan membaca file lokal.
2. **`config.js`**: Menghapus ketergantungan pada Supabase dan menggunakan path database lokal.
3. **`server.js`**: Memverifikasi koneksi ke file SQLite lokal saat startup.
