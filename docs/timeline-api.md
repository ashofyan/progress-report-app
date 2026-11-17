# Dokumentasi API Timeline Pekerjaan Team SPK & Client

Dokumen ini menjelaskan endpoint **Timeline Pekerjaan per Team SPK & Client** yang terdaftar pada [routes/api.php](file:///home/shofyan/Developments/als-holdings/progress-report/routes/api.php).

Fitur ini dirancang bagi Senior / PIC / Anggota Tim SPK untuk memantau aktivitas pengerjaan seluruh anggota tim dalam bentuk **Chronological Activity Feed** (gabungan Daily Progress & Progress Report), baik **berdasarkan SPK spesifik** maupun **teragregasi per Client (`kode_klien`)**.

---

## Ringkasan Fitur

1. **Seleksi Berbasis Client (`kode_klien`) & SPK**:
   - Mendukung skenario di mana **1 Client memiliki banyak SPK**.
   - Pengguna dapat memfilter berdasarkan **Client** saja (untuk melihat timeline gabungan seluruh SPK milik client tersebut) atau menyaring hingga **SPK spesifik**.
   - Hanya menampilkan Client dan SPK yang:
     - Sesuai dengan tenant database (`asal_pt`) pengguna.
     - Pengguna terdaftar aktif di dalam kelompok timnya (`als_spk_teams.status_employee = 1`).
     - **Sudah memiliki minimal 1 aktivitas** (Daily Progress atau Progress Report).
2. **Unified Chronological Activity Feed**:
   - Menggabungkan log pengerjaan dari **Daily Progress** (laporan harian) dan **Progress Report** (laporan berkala) dari seluruh anggota tim.
   - Diurutkan secara kronologis terbalik (`tanggal DESC`, `created_at DESC`), sehingga aktivitas tim paling baru selalu berada di baris teratas.
   - **Identitas SPK di Setiap Feed**: Setiap item feed mencantumkan nomor SPK dan deskripsi pekerjaan terkait (`spk.no_spk`, `spk.job_description`), memudahkan pembacaan saat melihat feed multi-SPK dalam satu Client.
3. **Detail Informasi Feed**:
   - Identitas pembuat (kode karyawan, nama karyawan, tingkat/jabatan).
   - Rincian tugas yang dikerjakan (nama pekerjaan, master task / additional task, parent task, status `selesai` / `pending`, catatan pekerjaan).
   - Dokumen / foto bukti pendukung pekerjaan.
   - Temuan (*findings*) dan catatan umum (*notes*) jika berasal dari Progress Report.
4. **Summary Statistik**:
   - Total feed, total Daily Progress, total Progress Report, total task selesai & pending, serta jumlah kontributor aktif.

---

## Route Definition

```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    Route::prefix('timeline')->group(function () {
        Route::get('/clients', [TimelineController::class, 'clients']);
        Route::get('/spks', [TimelineController::class, 'spks']);
        Route::get('/', [TimelineController::class, 'index']);
    });
});
```

---

## Headers Standar Permintaan

Seluruh request wajib menyertakan Progress Token pada Header:

```http
Accept: application/json
Authorization: Bearer {token}
```

Database tenant otomatis ditentukan dari field `asal_pt` pada data karyawan di token.

---

## Daftar Endpoint

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/timeline/clients` | Mengambil daftar Client unik yang memiliki SPK beraktivitas milik user untuk dropdown filter Client. |
| `GET` | `/api/timeline/spks` | Mengambil daftar SPK aktif milik user yang sudah beraktivitas, dapat difilter per `client_code`. |
| `GET` | `/api/timeline` | Mengambil feed kronologis aktivitas tim (bisa per Client multi-SPK atau per SPK spesifik). |

---

## 1. Daftar Opsi Client untuk Filter Dropdown

Mengambil daftar Client (`kode_klien`) di mana user memiliki SPK aktif yang sudah beraktivitas.

* **Endpoint**: `GET /api/timeline/clients`
* **Query Parameters**: Tidak ada.

### Contoh Request

```http
GET /api/timeline/clients HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
Accept: application/json
```

### Contoh Response Berhasil (200 OK)

```json
{
  "status": true,
  "message": "Daftar Client beraktivitas berhasil diambil.",
  "data": [
    {
      "kode_klien": "BDTA",
      "total_spk": 2,
      "total_daily_progress": 14,
      "total_progress_report": 3,
      "spks": [
        {
          "id": 2576,
          "no_spk": "SPK-2026/05/000009",
          "job_description": "Review SPT OP Tahun 2025",
          "total_daily_progress": 10,
          "total_progress_report": 2
        },
        {
          "id": 2580,
          "no_spk": "SPK-2026/05/000015",
          "job_description": "Pendampingan Pemeriksaan Pajak",
          "total_daily_progress": 4,
          "total_progress_report": 1
        }
      ]
    },
    {
      "kode_klien": "YSSI",
      "total_spk": 1,
      "total_daily_progress": 5,
      "total_progress_report": 1,
      "spks": [
        {
          "id": 2601,
          "no_spk": "SPK-2026/06/000001",
          "job_description": "Jasa Akuntansi Bulanan",
          "total_daily_progress": 5,
          "total_progress_report": 1
        }
      ]
    }
  ]
}
```

---

## 2. Daftar Opsi SPK untuk Filter Dropdown

Mengambil daftar SPK yang dimiliki oleh user yang login di mana sudah terdapat aktivitas dari anggota tim.

* **Endpoint**: `GET /api/timeline/spks`
* **Query Parameters**:
  * `client_code` (opsional, `string`): Filter berdasarkan kode klien tertentu (contoh: `BDTA`).

### Contoh Request

```http
GET /api/timeline/spks?client_code=BDTA HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
Accept: application/json
```

### Contoh Response Berhasil (200 OK)

```json
{
  "status": true,
  "message": "Daftar SPK beraktivitas berhasil diambil.",
  "data": [
    {
      "id": 2576,
      "no_spk": "SPK-2026/05/000009",
      "kode_klien": "BDTA",
      "jenis": "Project",
      "periode_awal": "2026-05",
      "periode_akhir": "2026-05",
      "job_code": "TAX-16",
      "job_description": "Review SPT OP Tahun 2025",
      "total_daily_progress": 10,
      "total_progress_report": 2
    },
    {
      "id": 2580,
      "no_spk": "SPK-2026/05/000015",
      "kode_klien": "BDTA",
      "jenis": "Project",
      "periode_awal": "2026-05",
      "periode_akhir": "2026-06",
      "job_code": "TAX-18",
      "job_description": "Pendampingan Pemeriksaan Pajak",
      "total_daily_progress": 4,
      "total_progress_report": 1
    }
  ]
}
```

---

## 3. Feed Timeline Pekerjaan Team

Mengambil feed kronologis gabungan Daily Progress dan Progress Report dari anggota tim.

* **Endpoint**: `GET /api/timeline`
* **Query Parameters**:

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | `string` | Tidak | Filter kode klien (contoh: `BDTA`). Jika diisi tanpa `als_spk_id`, feed akan menampilkan **gabungan seluruh SPK** milik client tersebut. |
| `als_spk_id` | `integer` | Tidak | ID SPK spesifik. Jika diisi bersama `client_code`, sistem memastikan SPK tersebut valid milik client tersebut. Jika tidak diisi, backend mengambil SPK aktif milik client / user. |
| `employee_code`| `string` | Tidak | Filter pengerjaan oleh anggota tim tertentu. |
| `tanggal` | `date` (`YYYY-MM-DD`) | Tidak | Filter pada tanggal tertentu (contoh: `2026-11-03`). |
| `bulan` | `integer` (`1`-`12`) | Tidak | Filter pada bulan tertentu. |
| `tahun` | `integer` (`2000`-`2100`) | Tidak | Filter pada tahun tertentu. |
| `type` | `string` | Tidak | Opsi: `all` (default), `daily_progress`, atau `progress_report`. |

### Skenario Penggunaan Parameter:

1. **Filter per Client (Multi-SPK Aggregated Feed)**:
   `GET /api/timeline?client_code=BDTA`
   Menampilkan seluruh aktivitas tim pada seluruh SPK milik client `BDTA`. Field `current_spk` akan bernilai `null` (jika client memiliki > 1 SPK) atau memuat objek SPK (jika hanya ada 1 SPK), dan `available_spks` memuat seluruh SPK client tersebut.
2. **Filter per SPK Spesifik**:
   `GET /api/timeline?client_code=BDTA&als_spk_id=2576` atau `GET /api/timeline?als_spk_id=2576`
   Menampilkan aktivitas tim pada SPK nomor 2576 saja.
3. **Tanpa Parameter (Default)**:
   `GET /api/timeline`
   Memilih SPK pertama dan Client aktif pertama dari daftar pekerjaan user.

---

### Contoh Request (Filter per Client)

```http
GET /api/timeline?client_code=BDTA HTTP/1.1
Host: localhost:8000
Authorization: Bearer {token}
Accept: application/json
```

### Contoh Response Berhasil (200 OK)

```json
{
  "status": true,
  "message": "Timeline pekerjaan team SPK berhasil diambil.",
  "data": {
    "current_client": "BDTA",
    "current_spk": null,
    "available_clients": [
      {
        "kode_klien": "BDTA",
        "total_spk": 2,
        "total_daily_progress": 14,
        "total_progress_report": 3
      },
      {
        "kode_klien": "YSSI",
        "total_spk": 1,
        "total_daily_progress": 5,
        "total_progress_report": 1
      }
    ],
    "available_spks": [
      {
        "id": 2576,
        "no_spk": "SPK-2026/05/000009",
        "kode_klien": "BDTA",
        "jenis": "Project",
        "periode_awal": "2026-05",
        "periode_akhir": "2026-05",
        "job_code": "TAX-16",
        "job_description": "Review SPT OP Tahun 2025",
        "total_daily_progress": 10,
        "total_progress_report": 2
      },
      {
        "id": 2580,
        "no_spk": "SPK-2026/05/000015",
        "kode_klien": "BDTA",
        "jenis": "Project",
        "periode_awal": "2026-05",
        "periode_akhir": "2026-06",
        "job_code": "TAX-18",
        "job_description": "Pendampingan Pemeriksaan Pajak",
        "total_daily_progress": 4,
        "total_progress_report": 1
      }
    ],
    "summary": {
      "total_feeds": 2,
      "total_daily_progress": 1,
      "total_progress_report": 1,
      "total_tasks_completed": 3,
      "total_tasks_pending": 1,
      "active_contributors_count": 2
    },
    "feeds": [
      {
        "feed_id": "pr_10",
        "type": "progress_report",
        "reference_id": 10,
        "nomor": "PR-2026/11/0001",
        "tanggal": "2026-11-04",
        "bulan": 11,
        "tahun": 2026,
        "created_at": "2026-11-04T15:30:00.000000Z",
        "spk": {
          "id": 2576,
          "no_spk": "SPK-2026/05/000009",
          "kode_klien": "BDTA",
          "job_description": "Review SPT OP Tahun 2025"
        },
        "creator": {
          "employee_code": "wBGVj4ZT",
          "employee_name": "Ingrid Halim",
          "tingkat": 7
        },
        "tasks": [
          {
            "id": 1,
            "type": "master",
            "task_id": 12,
            "task_name": "Review SPT OP",
            "parent_task_name": "Pemeriksaan Dokumen",
            "status": "selesai",
            "notes": [
              {
                "id": 101,
                "catatan": "Koreksi lampiran 1770 Selesai"
              }
            ],
            "documents": [
              {
                "id": 5,
                "path": "documents/progress-reports/pr_doc.pdf",
                "original_name": "pr_doc.pdf",
                "mime_type": "application/pdf",
                "size": 102400
              }
            ]
          }
        ],
        "findings": [
          {
            "id": 3,
            "keterangan": "Bukti potong 1721-A1 belum ditandatangani pemberi kerja",
            "documents": []
          }
        ],
        "notes": [
          {
            "id": 201,
            "catatan": "Pekerjaan berjalan lancar dan siap finalisasi"
          }
        ],
        "documents": []
      },
      {
        "feed_id": "dp_45",
        "type": "daily_progress",
        "reference_id": 45,
        "nomor": "DP-2026/11/0002",
        "tanggal": "2026-11-03",
        "bulan": 11,
        "tahun": 2026,
        "created_at": "2026-11-03T11:00:00.000000Z",
        "spk": {
          "id": 2580,
          "no_spk": "SPK-2026/05/000015",
          "kode_klien": "BDTA",
          "job_description": "Pendampingan Pemeriksaan Pajak"
        },
        "creator": {
          "employee_code": "EMP02",
          "employee_name": "Budi Santoso",
          "tingkat": 5
        },
        "tasks": [
          {
            "id": 99,
            "type": "master",
            "task_id": 10,
            "task_name": "Pengumpulan Dokumen Bukti Potong",
            "parent_task_name": "Pemeriksaan Dokumen",
            "is_checked": true,
            "documents": [
              {
                "id": 22,
                "path": "documents/daily-progress/bukti.jpg",
                "original_name": "bukti.jpg",
                "mime_type": "image/jpeg",
                "size": 54200
              }
            ]
          }
        ],
        "findings": [],
        "notes": [],
        "documents": []
      }
    ]
  }
}
```

---

## Skenario Error & Validasi

### 1. Token Tidak Ditemukan / Kadaluarsa (401 Unauthorized)
```json
{
  "status": false,
  "message": "Token tidak valid atau sudah kadaluarsa."
}
```

### 2. User Tidak Terdaftar di Tim SPK yang Diminta (404 Not Found)
Terjadi jika user mencoba mengakses `als_spk_id` yang bukan merupakan anggota timnya:
```json
{
  "status": false,
  "message": "SPK tidak ditemukan atau Anda tidak terdaftar aktif di tim SPK ini."
}
```

### 3. SPK Tidak Sesuai dengan Kode Klien yang Dikirim (422 Unprocessable Entity)
Terjadi jika user mengirim kombinasi `client_code` dan `als_spk_id` yang tidak cocok:
```json
{
  "status": false,
  "message": "SPK #SPK-2026/05/000009 tidak sesuai dengan kode klien 'YSSI'."
}
```

### 4. Validasi Format Query Parameter Gagal (422 Unprocessable Entity)
```json
{
  "message": "Bulan harus antara 1 sampai 12.",
  "errors": {
    "bulan": [
      "Bulan harus antara 1 sampai 12."
    ]
  }
}
```
