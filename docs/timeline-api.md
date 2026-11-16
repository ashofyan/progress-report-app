# Dokumentasi API Timeline Pekerjaan Team SPK

Dokumen ini menjelaskan endpoint **Timeline Pekerjaan per Team SPK** yang terdaftar pada `routes/api.php`.

Fitur ini dirancang bagi Senior / PIC / Anggota Tim SPK untuk memantau aktivitas pengerjaan seluruh anggota tim di dalam suatu SPK dalam bentuk **Chronological Activity Feed** (gabungan Daily Progress & Progress Report).

---

## Ringkasan Fitur

1. **Seleksi SPK Berdasarkan Aktivitas Tim**:
   - Menampilkan daftar SPK aktif yang dimiliki oleh user yang sedang login.
   - **Hanya menampilkan SPK yang sudah memiliki minimal 1 Daily Progress atau 1 Progress Report dari anggota tim**. SPK yang belum ada aktivitas tim tidak akan dimunculkan di opsi dropdown.
2. **Unified Chronological Activity Feed**:
   - Menggabungkan log pengerjaan dari **Daily Progress** (laporan harian) dan **Progress Report** (laporan berkala) dari **seluruh anggota tim** pada SPK terpilih.
   - Diurutkan secara kronologis terbalik (`tanggal DESC`, `created_at DESC`), sehingga aktivitas tim paling baru selalu berada di baris teratas.
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
| `GET` | `/api/timeline/spks` | Mengambil daftar SPK aktif milik user yang sudah memiliki aktivitas Daily Progress / Progress Report untuk dropdown filter. |
| `GET` | `/api/timeline` | Mengambil data Feed Timeline aktivitas pekerjaan seluruh anggota tim pada SPK yang dipilih beserta ringkasan statistik. |

---

## 1. Daftar Opsi SPK untuk Filter Dropdown

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
      "total_daily_progress": 4,
      "total_progress_report": 1
    }
  ]
}
```

---

## 2. Feed Timeline Pekerjaan Team per SPK

Mengambil feed gabungan Daily Progress dan Progress Report dari seluruh anggota tim pada SPK terkait.

* **Endpoint**: `GET /api/timeline`
* **Query Parameters**:

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `als_spk_id` | `integer` | Tidak | ID SPK yang ingin dilihat. Jika tidak diisi, backend otomatis memilih SPK pertama yang aktif dari daftar SPK beraktivitas milik user. |
| `client_code` | `string` | Tidak | Filter kode klien. |
| `employee_code`| `string` | Tidak | Filter pengerjaan oleh anggota tim tertentu. |
| `tanggal` | `date` (`YYYY-MM-DD`) | Tidak | Filter pada tanggal tertentu (contoh: `2026-11-03`). |
| `bulan` | `integer` (`1`-`12`) | Tidak | Filter pada bulan tertentu. |
| `tahun` | `integer` (`2000`-`2100`) | Tidak | Filter pada tahun tertentu. |
| `type` | `string` | Tidak | Opsi: `all` (default), `daily_progress`, atau `progress_report`. |

### Contoh Request

```http
GET /api/timeline?als_spk_id=2576 HTTP/1.1
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
    "current_spk": {
      "id": 2576,
      "no_spk": "SPK-2026/05/000009",
      "source_pt": "DNA",
      "kode_klien": "BDTA",
      "periode_awal": "2026-05",
      "periode_akhir": "2026-05",
      "tanggal": "2026-05-01",
      "jenis": "Project",
      "kode_product_jasa": "TAX-16",
      "note": "Review SPT OP Tahun 2025",
      "job": {
        "id": 12,
        "job_code": "TAX-16",
        "description": "Review SPT OP Tahun 2025"
      },
      "teams": [
        {
          "kode_employee": "wBGVj4ZT",
          "name_employee": "Ingrid Halim",
          "tingkat": 7,
          "status_employee": 1
        },
        {
          "kode_employee": "EMP02",
          "name_employee": "Budi Santoso",
          "tingkat": 5,
          "status_employee": 1
        }
      ]
    },
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
        "creator": {
          "employee_code": "wBGVj4ZT",
          "name_employee": "Ingrid Halim",
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
        "creator": {
          "employee_code": "EMP02",
          "name_employee": "Budi Santoso",
          "tingkat": 5
        },
        "tasks": [
          {
            "id": 99,
            "type": "master",
            "task_id": 10,
            "task_name": "Pengumpulan Bukti Potong",
            "parent_task_name": "Pemeriksaan Dokumen",
            "status": "pending",
            "catatan": "Masih menunggu dokumen tambahan dari klien",
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

### 3. Validasi Query Parameter Gagal (422 Unprocessable Entity)
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
