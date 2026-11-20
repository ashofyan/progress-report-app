# Dokumentasi API Dashboard & Announcement Feed Tim SPK

Dokumen ini menjelaskan endpoint **Dashboard Monitoring** dan **Feed Announcement Tim SPK (Daily Progress & Progress Report)** yang terdaftar pada [routes/api.php](file:///home/shofyan/Developments/als-holdings/progress-report/routes/api.php).

---

## Daftar Endpoint

| Endpoint | Method | Keterangan |
| --- | --- | --- |
| `/api/dashboard/announcements` | `GET` | Feed pengumuman/aktivitas tim SPK saat membuat DP/PR |
| `/api/dashboard/activities` | `GET` | Alias feed pengumuman/aktivitas tim SPK |
| `/api/dashboard/team-activities` | `GET` | Alias feed pengumuman/aktivitas tim SPK |
| `/api/announcements` | `GET` | Alias rute utama feed pengumuman |
| `/api/dashboard/summary` | `GET` | Ringkasan metrik dashboard SPK & PR tim |
| `/api/dashboard` | `GET` | Alias ringkasan dashboard SPK |

Semua endpoint dilindungi middleware autentikasi token (`progress.auth`) dan penentuan koneksi tenant database (`tenant.database`).

---

## 1. Feed Announcement / Aktivitas Tim SPK (DP & PR)

Endpoint ini digunakan untuk menampilkan daftar pengumuman aktivitas ketika user yang sedang login atau rekan dalam **1 tim SPK** membuat lembar **Daily Progress (DP)** atau **Progress Report (PR)**.
Setiap item telah dilengkapi dengan teks announcement (misal: `"User A membuat DP"` atau `"User A membuat Daily Progress DP/2026/XI/001"`) serta payload navigasi (`navigation`) agar saat item diklik di sisi frontend dapat langsung menuju detail DP/PR si pembuat.

### Endpoint Details
* **Method**: `GET`
* **URL**: `/api/dashboard/announcements` (atau `/api/dashboard/activities`, `/api/announcements`)

### Query Parameters

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `als_spk_id` | integer | Tidak | Filter aktivitas khusus pada 1 SPK tertentu. |
| `client_code` | string | Tidak | Filter aktivitas berdasarkan kode klien. |
| `type` | string | Tidak | Pilihan: `all` (default), `dp`, `pr`, `daily_progress`, `progress_report`. |
| `employee_code` | string | Tidak | Filter aktivitas yang dibuat oleh employee tertentu dalam tim. |
| `bulan` | integer | Tidak | Filter bulan (1 - 12). |
| `tahun` | integer | Tidak | Filter tahun (2000 - 2100). |
| `tanggal` | date | Tidak | Filter tanggal spesifik (`YYYY-MM-DD`). |
| `per_page` | integer | Tidak | Jumlah item per halaman (1 - 100, default: 15). |
| `page` | integer | Tidak | Nomor halaman (default: 1). |

---

### Contoh Request

```http
GET /api/dashboard/announcements?per_page=10&page=1 HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
Accept: application/json
```

---

### Contoh Response Berhasil (200 OK)

```json
{
  "status": true,
  "message": "Feed announcement aktivitas tim SPK berhasil diambil.",
  "data": [
    {
      "id": 42,
      "feed_id": "pr_42",
      "type": "progress_report",
      "type_code": "pr",
      "type_label": "Progress Report",
      "nomor": "PR/2026/XI/001",
      "announcement": {
        "title": "Progress Report Dibuat",
        "message": "Budi Santoso membuat Progress Report PR/2026/XI/001",
        "short_message": "Budi Santoso membuat PR PR/2026/XI/001",
        "text": "Budi Santoso membuat PR",
        "creator_name": "Budi Santoso",
        "action": "membuat",
        "target_type": "PR",
        "target_nomor": "PR/2026/XI/001"
      },
      "navigation": {
        "type": "progress_report",
        "id": 42,
        "detail_path": "/progress-report/42",
        "route_name": "progress-report.detail",
        "api_endpoint": "/api/progress-report/42",
        "url": "/progress-report/42"
      },
      "creator": {
        "employee_code": "EMP-002",
        "employee_name": "Budi Santoso",
        "tingkat": 7,
        "is_me": false
      },
      "spk": {
        "id": 105,
        "no_spk": "SPK/2026/XI/001",
        "client_code": "BDTA",
        "client_name": "PT Berkah Damai Abadi",
        "job_code": "JOB-MTC-01",
        "job_description": "Maintenance & Overhaul Generator"
      },
      "approval_status": "pending",
      "tanggal": "2026-11-20",
      "bulan": 11,
      "tahun": 2026,
      "tasks_count": 5,
      "created_at": "2026-11-20T08:15:00.000000Z",
      "time_ago": "2 jam yang lalu"
    },
    {
      "id": 88,
      "feed_id": "dp_88",
      "type": "daily_progress",
      "type_code": "dp",
      "type_label": "Daily Progress",
      "nomor": "DP/2026/XI/005",
      "announcement": {
        "title": "Daily Progress Dibuat",
        "message": "Ahmad Supardi membuat Daily Progress DP/2026/XI/005",
        "short_message": "Ahmad Supardi membuat DP DP/2026/XI/005",
        "text": "Ahmad Supardi membuat DP",
        "creator_name": "Ahmad Supardi",
        "action": "membuat",
        "target_type": "DP",
        "target_nomor": "DP/2026/XI/005"
      },
      "navigation": {
        "type": "daily_progress",
        "id": 88,
        "detail_path": "/daily-progress/88",
        "route_name": "daily-progress.detail",
        "api_endpoint": "/api/daily-progress/88",
        "url": "/daily-progress/88"
      },
      "creator": {
        "employee_code": "EMP-001",
        "employee_name": "Ahmad Supardi",
        "tingkat": 3,
        "is_me": true
      },
      "spk": {
        "id": 105,
        "no_spk": "SPK/2026/XI/001",
        "client_code": "BDTA",
        "client_name": "PT Berkah Damai Abadi",
        "job_code": "JOB-MTC-01",
        "job_description": "Maintenance & Overhaul Generator"
      },
      "tanggal": "2026-11-20",
      "bulan": 11,
      "tahun": 2026,
      "tasks_count": 3,
      "created_at": "2026-11-20T07:30:00.000000Z",
      "time_ago": "3 jam yang lalu"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 2
  }
}
```

---

### Cara Integrasi Sisi Frontend (Click to Navigate Detail)

Frontend dapat langsung memanfaatkan objek `navigation`:

```javascript
// Contoh Vue Router / React Router
function handleAnnouncementClick(item) {
  // Opsi 1: Menggunakan detail_path
  router.push(item.navigation.detail_path); // e.g. "/progress-report/42" atau "/daily-progress/88"

  // Opsi 2: Menggunakan params
  // router.push({ name: item.navigation.route_name, params: { id: item.navigation.id } });
}
```

Template HTML/Vue:
```html
<div v-for="item in announcements" :key="item.feed_id" class="announcement-card" @click="handleAnnouncementClick(item)">
  <div class="announcement-title">
    <span class="badge" :class="item.type_code">{{ item.type_label }}</span>
    <span class="time">{{ item.time_ago }}</span>
  </div>
  <p class="announcement-message">{{ item.announcement.text }}</p>
  <small class="text-muted">{{ item.spk.no_spk }} - {{ item.spk.client_name }}</small>
</div>
```

---

## 2. Ringkasan Dashboard SPK & PR (`/api/dashboard/summary`)

Menyajikan metrik agregat performa PR dan temuan SPK dalam tim:
* **`total_progress_report`**: Jumlah SPK aktif yang memiliki data PR dalam tim.
* **`total_dokumen_progress_report`**: Jumlah seluruh dokumen PR yang dibuat.
* **`total_progress_report_saya`**: Dokumen PR yang dibuat oleh user login.
* **`total_pekerjaan_pr_pending`**: Pekerjaan PR pending pribadi user login.
* **`total_temuan`**: Total temuan (PR & Global).
* **`total_menunggu_approval_saya`**: Jumlah PR yang menunggu persetujuan dari user login berdasarkan hierarki tingkat jabatan.
