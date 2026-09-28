# Progress Report App

Aplikasi web frontend berbasis **React 19**, **TypeScript**, dan **Vite** untuk manajemen dan pelaporan progres kerja harian (*Daily Progress*), laporan kemajuan berkala (*Progress Report*), pencatatan kendala (*Temuan*) & solusi (*Solusi*), penugasan tambahan (*Additional Task*), master pekerjaan (*Master Job*), serta pembuatan surat perwakilan (*Representative Letter*).

---

## 🚀 Fitur Utama

- **Autentikasi & Multi-Tenant**: Sistem autentikasi token berbasis karyawan/tenant dengan proteksi route (`GuestRoute` dan `ProtectedRoute`).
- **Master Data Pekerjaan**: Manajemen data master pekerjaan (*Master Job*) dan penugasan sub-task lapangan.
- **Additional Task**: Pengelolaan penugasan pekerjaan tambahan di luar master task rutin.
- **Daily Progress (DP)**:
  - Pencatatan laporan progres harian per client dan SPK.
  - Tracking status pekerjaan (`open`, `pending`, `selesai`, `batal`).
  - Monitoring dan pelaporan pekerjaan berstatus pending.
  - Koreksi dan penyuntingan form laporan harian (*edit total*).
  - Upload dan manajemen lampiran/dokumen bukti progres kerja.
- **Progress Report (PR)**:
  - Pembuatan laporan kemajuan resmi dari rekapitulasi Daily Progress yang telah divalidasi `selesai`.
  - Integrasi catatan umum, catatan per pekerjaan, serta dokumen lampiran pendukung.
  - Pelacakan riwayat pekerjaan (*history*).
- **Temuan & Solusi**:
  - Pencatatan temuan/kendala lapangan (baik dari *master task* maupun *additional task*).
  - Penautan temuan ke Daily Progress untuk proses penyelesaian.
  - Dokumentasi solusi tindakan perbaikan lapangan.
- **Surat Perwakilan (Representative Letter)**:
  - Pembuatan dan editor surat perwakilan resmi terformat (kop surat, watermark, tabel ringkasan pekerjaan, dan tanda tangan).

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: [Bootstrap 5](https://getbootstrap.com/), [Bootstrap Icons](https://icons.getbootstrap.com/), [Sass (SCSS)](https://sass-lang.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) dengan interceptor token dan error handling otomatis
- **Linter**: [ESLint 9](https://eslint.org/)

---

## 📁 Struktur Direktori

```text
progress-report-app/
├── docs/                     # Dokumentasi teknis & spesifikasi API
│   ├── daily-progress-api.md
│   └── progress-report-api.md
├── public/                   # Static assets (logo, watermark, favicon, svg icons)
│   └── document/
├── src/
│   ├── app/                  # Inisialisasi App, provider, dan routing
│   │   ├── providers/
│   │   └── router/
│   ├── assets/               # Asset statis gambar/icon internal
│   ├── features/             # Modul fitur berbasis domain
│   │   ├── additional-task/  # Fitur tugas tambahan
│   │   ├── auth/             # Autentikasi & login
│   │   ├── daily-progress/   # Fitur progress harian & koreksi
│   │   ├── master-job/       # Fitur master pekerjaan
│   │   ├── progress-report/  # Fitur laporan kemajuan
│   │   ├── representative-letter/ # Fitur surat perwakilan
│   │   ├── solusi/           # Fitur solusi temuan
│   │   └── temuan/           # Fitur temuan lapangan
│   ├── layouts/              # Komponen layout (DashboardLayout, sidebar, navbar)
│   ├── pages/                # Halaman level view / dashboard
│   ├── shared/               # Komponen, service, dan utilitas bersama
│   │   ├── components/
│   │   ├── constants/
│   │   └── services/         # HTTP client & interceptor
│   ├── styles/               # Styling global SCSS & variable overrides
│   ├── main.tsx              # Entry point aplikasi
│   └── vite-env.d.ts
├── .env.example              # Template variabel lingkungan
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚙️ Persyaratan Sistem

- **Node.js**: versi `18.x` atau lebih baru
- **Package Manager**: `npm` (atau `yarn` / `pnpm`)

---

## 📦 Instalasi & Menjalankan Proyek

### 1. Clone Repositori

```bash
git clone <url-repositori>
cd progress-report-app
```

### 2. Instalasi Dependensi

```bash
npm install
```

### 3. Konfigurasi Environment Variable

Salin file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Buka file `.env` dan konfigurasikan `VITE_API_BASE_URL` sesuai alamat backend API Anda:

```env
# Alamat dasar backend API (sesuaikan dengan endpoint backend Anda)
VITE_API_BASE_URL=http://localhost:8000/api
```

> [!IMPORTANT]
> Pastikan file `.env` tidak di-commit atau dipublikasikan ke repositori publik untuk menjaga kerahasiaan endpoint dan kredensial server. Gunakan file `.env.example` sebagai referensi format variabel lingkungan.

### 4. Menjalankan Server Pengembangan (Dev)

```bash
npm run dev
```

Aplikasi dapat diakses melalui browser pada alamat default: `http://localhost:5173`.

---

## 📜 Skrip yang Tersedia

| Skrip | Deskripsi |
| --- | --- |
| `npm run dev` | Menjalankan Vite development server dengan Hot Module Replacement (HMR). |
| `npm run build` | Menjalankan type-checking TypeScript (`tsc -b`) dan membuat build produksi pada folder `dist/`. |
| `npm run preview` | Menjalankan preview lokal dari hasil build produksi di folder `dist/`. |
| `npm run lint` | Menjalankan ESLint untuk mengecek kualitas dan format kode. |

---

## 📖 Dokumentasi API

Panduan integrasi dan spesifikasi endpoint backend tersedia pada direktori `docs/`:

- [Dokumentasi API Daily Progress](docs/daily-progress-api.md)
- [Dokumentasi API Progress Report](docs/progress-report-api.md)

---

## 🔒 Catatan Keamanan

- Jangan mempublikasikan nilai asli endpoint internal dari `.env` ke repositori publik.
- Token autentikasi disimpan pada client-side storage melalui modul `authStorage` dan disertakan secara otomatis via header `Authorization: Bearer <token>` pada setiap request HTTP.
