# Dokumentasi API Progress Report

Dokumen ini menjelaskan endpoint Progress Report yang terdaftar pada `routes/api.php`.

## Catatan Perubahan untuk Frontend

Bagian ini merangkum perubahan kontrak Progress Report dibanding dokumentasi sebelumnya:

1. **Penyelesaian Pekerjaan**: Semua penyelesaian pekerjaan dilakukan di Daily Progress (DP). Progress Report (PR) hanya mengambil pekerjaan yang **sudah berstatus selesai** di DP.
2. **Checklist Pekerjaan dari DP**: Di Frontend, user cukup menchecklist task yang sudah selesai di Daily Progress. Request `details` mendukung format ringkas checklist:
   - Array of IDs: `details: [500, 501]` atau `daily_progress_detail_ids: [500, 501]`
   - Array of Objects: `details: [{ "daily_progress_detail_id": 500 }, ...]`
3. **Status Detail PR**: Detail yang masuk ke PR otomatis berstatus `selesai`. Field `status` pada `details.*.status` bersifat opsional (jika dikirim harus `selesai`).
4. **Validasi Status DP**: Jika frontend mengirimkan ID detail Daily Progress yang statusnya masih `open` atau `pending`, sistem akan menolak dengan error `422 Unprocessable Entity`.
5. **Tidak Ada Mutasi Status ke DP**: Karena pekerjaan sudah difinalisasi sebagai `selesai` di Daily Progress, Progress Report tidak mengubah status pada Daily Progress.
6. `POST /api/progress-report` tidak lagi memakai field `catatan` tunggal pada header. Catatan umum dikirim melalui array `notes`.
7. Catatan per pekerjaan dikirim melalui array `details.*.notes` (opsional).
8. Response Progress Report mengembalikan `notes` dan `documents` pada level header.
9. Response detail Progress Report mengembalikan `notes` dan `documents` pada setiap item `details[]`.
10. Response list Progress Report menambahkan `total_catatan` dan `total_dokumen`.
11. Tersedia endpoint upload dokumen Progress Report untuk dokumen umum, dokumen per pekerjaan, dan dokumen temuan.
12. Endpoint upload dokumen menggunakan `multipart/form-data` dengan field `documents[]`, maksimal 10 file per request dan maksimal 20 MB per file.
13. Tersedia endpoint delete dokumen Progress Report untuk dokumen umum, dokumen per pekerjaan, dan dokumen temuan.
14. Endpoint delete dokumen menghapus metadata dokumen dari database tenant dan menghapus file fisik dari disk `public` jika file masih ada.
15. Temuan `master` wajib memilih `als_job_task_id` dari root/master task pekerjaan SPK.
16. Response temuan mengembalikan object `master_task` dan `additional_task`.

```php
Route::prefix('progress-report')->group(function () {
    Route::get('/form-data', ProgressReportFormController::class);
    Route::get('/history', [ProgressReportController::class, 'history']);
    Route::get('/', [ProgressReportController::class, 'index']);
    Route::post('/', [ProgressReportController::class, 'store']);
    Route::get('/{progressReport}', [ProgressReportController::class, 'show'])
        ->whereNumber('progressReport');
    Route::post('/{progressReport}/documents', [ProgressReportDocumentController::class, 'storeProgressReportDocument'])
        ->whereNumber('progressReport');
    Route::delete('/{progressReport}/documents/{document}', [ProgressReportDocumentController::class, 'destroyProgressReportDocument'])
        ->whereNumber('progressReport')
        ->whereNumber('document');
    Route::post('/{progressReport}/details/{detail}/documents', [ProgressReportDocumentController::class, 'storeDetailDocument'])
        ->whereNumber('progressReport')
        ->whereNumber('detail');
    Route::delete('/{progressReport}/details/{detail}/documents/{document}', [ProgressReportDocumentController::class, 'destroyDetailDocument'])
        ->whereNumber('progressReport')
        ->whereNumber('detail')
        ->whereNumber('document');
    Route::post('/{progressReport}/findings/{finding}/documents', [ProgressReportDocumentController::class, 'storeFindingDocument'])
        ->whereNumber('progressReport')
        ->whereNumber('finding');
    Route::delete('/{progressReport}/findings/{finding}/documents/{document}', [ProgressReportDocumentController::class, 'destroyFindingDocument'])
        ->whereNumber('progressReport')
        ->whereNumber('finding')
        ->whereNumber('document');
});
```

## Ringkasan

Semua endpoint berada di bawah prefix `/api/progress-report`.

Endpoint Progress Report berada di dalam middleware:

```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    // progress-report
});
```

Artinya semua request harus mengirim Progress Token, lalu database tenant akan ditentukan dari field `asal_pt` pada data karyawan di token.

Headers wajib:

```http
Accept: application/json
Authorization: Bearer {token}
```

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/progress-report/form-data` | Mengambil data pendukung form Progress Report berdasarkan client, SPK, dan tanggal. Hanya menampilkan task DP yang sudah berstatus `selesai`. |
| `GET` | `/api/progress-report` | Mengambil daftar Progress Report milik user login. |
| `GET` | `/api/progress-report/history` | Mengambil riwayat Progress Report untuk satu master task atau Additional Task. |
| `POST` | `/api/progress-report` | Membuat Progress Report dari task Daily Progress yang sudah checklist selesai. |
| `GET` | `/api/progress-report/{progressReport}` | Mengambil detail Progress Report berdasarkan ID. |
| `POST` | `/api/progress-report/{progressReport}/documents` | Upload dokumen umum Progress Report. |
| `DELETE` | `/api/progress-report/{progressReport}/documents/{document}` | Menghapus satu dokumen umum Progress Report. |
| `POST` | `/api/progress-report/{progressReport}/details/{detail}/documents` | Upload dokumen untuk satu detail pekerjaan Progress Report. |
| `DELETE` | `/api/progress-report/{progressReport}/details/{detail}/documents/{document}` | Menghapus satu dokumen dari detail pekerjaan Progress Report. |
| `POST` | `/api/progress-report/{progressReport}/findings/{finding}/documents` | Upload dokumen untuk satu temuan Progress Report. |
| `DELETE` | `/api/progress-report/{progressReport}/findings/{finding}/documents/{document}` | Menghapus satu dokumen dari temuan Progress Report. |

Response endpoint ini menggunakan key `status`, bukan `success`.

## Struktur Data

Header Progress Report disimpan pada tabel tenant `als_progress_reports`.
Detail Progress Report disimpan pada tabel tenant `als_progress_report_details`.
Temuan Progress Report disimpan pada tabel tenant `als_progress_report_findings`.
Dokumen temuan Progress Report disimpan pada tabel tenant `als_progress_report_finding_documents`.
Catatan umum Progress Report disimpan pada tabel tenant `als_progress_report_notes`.
Dokumen umum Progress Report disimpan pada tabel tenant `als_progress_report_documents`.
Catatan detail Progress Report disimpan pada tabel tenant `als_progress_report_detail_notes`.
Dokumen detail Progress Report disimpan pada tabel tenant `als_progress_report_detail_documents`.

Nomor Progress Report dibuat otomatis dengan format:

```text
PR-YYYYMMDD-0001
```

Contoh: `PR-20260819-0001`.

Satu Progress Report dibuat untuk kombinasi SPK, master pekerjaan, client, tanggal, dan user login. Detail Progress Report selalu berasal dari `als_daily_progress_details` yang telah selesai.

## Status Detail

Status detail Progress Report:

| Status | Keterangan |
| --- | --- |
| `selesai` | Pekerjaan telah selesai dikerjakan pada Daily Progress dan dimasukkan ke Progress Report. |

Aturan status:

1. Semua penyelesaian pekerjaan dilakukan di **Daily Progress**.
2. Progress Report hanya mengambil data detail Daily Progress yang **berstatus `selesai`**.
3. Detail Daily Progress yang masih `open` atau `pending` tidak dapat dimasukkan ke Progress Report.
4. Detail yang masuk ke Progress Report otomatis disimpan dengan status `selesai`.

## Sumber Temuan

Temuan Progress Report dapat berasal dari:

| Source Type | Field Pendukung | Keterangan |
| --- | --- | --- |
| `master` | `als_job_task_id` | Temuan pada root/master task pekerjaan SPK. |
| `additional` | `als_task_additional_detail_id` | Temuan pada detail Additional Task. |

Jika `source_type` bernilai `master`, `als_job_task_id` wajib diisi dan harus merupakan root task (`parent_id = null`) dari job pada SPK tersebut. Field `als_task_additional_detail_id` harus `null` atau tidak dikirim.

Jika `source_type` bernilai `additional`, `als_task_additional_detail_id` wajib diisi. Field `als_job_task_id` harus `null` atau tidak dikirim.

Response temuan selalu menyediakan dua object sumber:

| Field | Keterangan |
| --- | --- |
| `master_task` | Terisi jika `source_type = master`, berisi `id` dan `task_name`. |
| `additional_task` | Terisi jika `source_type = additional`, berisi `id` dan `task_name`. |

Catatan: field `documents`, `details[].documents`, dan `findings[].documents` muncul pada response jika data dokumen sudah ada. Endpoint delete dokumen tidak mengembalikan object dokumen; response hanya berisi status dan message.

## Format Response Progress Report

```json
{
  "id": 1,
  "nomor": "PR-20260819-0001",
  "tanggal": "2026-08-19",
  "client_code": "CLIENT-001",
  "spk": {
    "id": 10,
    "source_pt": "ALS",
    "source_id": 1001,
    "no_spk": "SPK-001",
    "kode_product_jasa": "PJ-001",
    "note": "Pekerjaan inspeksi"
  },
  "job": {
    "id": 5,
    "job_code": "JOB-001",
    "description": "Pekerjaan harian kebun"
  },
  "notes": [
    {
      "id": 700,
      "judul": "Catatan umum",
      "catatan": "Catatan umum Progress Report",
      "created_at": "2026-08-19T03:00:00.000000Z"
    }
  ],
  "documents": [
    {
      "id": 800,
      "original_name": "laporan.pdf",
      "path": "progress-reports/1/documents/550e8400-e29b-41d4-a716-446655440000.pdf",
      "mime_type": "application/pdf",
      "size": 204800
    }
  ],
  "created_by": "EMP001",
  "created_by_level": 3,
  "details": [
    {
      "id": 100,
      "daily_progress_detail_id": 500,
      "source_type": "master",
      "task": {
        "id": 20,
        "task_name": "Membersihkan area",
        "parent": {
          "id": 19,
          "task_name": "Persiapan lahan"
        }
      },
      "status": "selesai",
      "notes": [],
      "documents": []
    }
  ],
  "findings": [
    {
      "id": 200,
      "source_type": "master",
      "master_task": {
        "id": 19,
        "task_name": "Persiapan lahan"
      },
      "additional_task": null,
      "keterangan": "Ditemukan saluran tersumbat.",
      "documents": []
    }
  ],
  "created_at": "2026-08-19T03:00:00.000000Z",
  "updated_at": "2026-08-19T03:00:00.000000Z"
}
```

## GET /api/progress-report

Endpoint untuk mengambil daftar Progress Report milik user login.

Data diurutkan dari tanggal terbaru, lalu ID terbaru. Response menggunakan pagination dan hanya mengembalikan ringkasan Progress Report, bukan detail task dan temuan lengkap.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter berdasarkan kode client. |
| `als_spk_id` | integer | Tidak | Filter berdasarkan ID SPK. |
| `tanggal_awal` | date | Tidak | Filter tanggal mulai, format `YYYY-MM-DD`. |
| `tanggal_akhir` | date | Tidak | Filter tanggal akhir, format `YYYY-MM-DD`. Harus lebih besar atau sama dengan `tanggal_awal`. |
| `search` | string | Tidak | Pencarian pada nomor PR, nomor SPK, client code, job code, atau deskripsi job. |
| `per_page` | integer | Tidak | Jumlah data per halaman, `1` sampai `100`. Default `20`. |

### Request

```http
GET /api/progress-report?client_code=CLIENT-001&als_spk_id=10&tanggal_awal=2026-08-01&tanggal_akhir=2026-08-31&search=SPK&per_page=20
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data Progress Report berhasil diambil.",
  "data": [
    {
      "id": 1,
      "nomor": "PR-20260819-0001",
      "tanggal": "2026-08-19",
      "client_code": "CLIENT-001",
      "spk": {
        "id": 10,
        "no_spk": "SPK-001",
        "source_pt": "ALS",
        "kode_product_jasa": "PJ-001",
        "note": "Pekerjaan inspeksi"
      },
      "job": {
        "id": 5,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      },
      "total_task": 2,
      "total_temuan": 1,
      "total_catatan": 1,
      "total_dokumen": 1,
      "created_at": "2026-08-19T03:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 20,
    "total": 1
  }
}
```

### Response Error

Status: `401 Unauthorized`

```json
{
  "status": false,
  "message": "Employee code tidak ditemukan pada token."
}
```

## GET /api/progress-report/form-data

Endpoint untuk mengambil data pendukung form Progress Report berdasarkan client, SPK, dan tanggal yang dipilih.

Data yang dikembalikan:

1. Informasi employee dari Progress Token.
2. Informasi SPK dan master job.
3. Daftar Daily Progress pada tanggal tersebut.
4. Daftar detail Daily Progress yang **hanya berstatus selesai** (`selesai`) dan siap dichecklist untuk dimasukkan ke nomor PR.
5. Pilihan sumber temuan, yaitu root/master task pekerjaan dan Additional Task.
6. Flag `is_already_reported` serta riwayat Progress Report yang sudah pernah dibuat untuk setiap detail Daily Progress.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Ya | Kode client yang dipilih. |
| `als_spk_id` | integer | Ya | ID SPK yang dipilih. User login harus terdaftar pada team SPK tersebut. |
| `tanggal` | date | Ya | Tanggal Progress Report, format `YYYY-MM-DD`. |

### Request

```http
GET /api/progress-report/form-data?client_code=CLIENT-001&als_spk_id=10&tanggal=2026-08-19
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data form Progress Report berhasil diambil.",
  "data": {
    "tanggal": "2026-08-19",
    "client_code": "CLIENT-001",
    "employee": {
      "employee_code": "EMP001",
      "employee_name": "Budi",
      "tingkat": 3
    },
    "spk": {
      "id": 10,
      "source_pt": "ALS",
      "source_id": 1001,
      "no_spk": "SPK-001",
      "client_code": "CLIENT-001",
      "kode_product_jasa": "PJ-001",
      "note": "Pekerjaan inspeksi",
      "jenis": "project",
      "periode_awal": "2026-08-01",
      "periode_akhir": "2026-08-31",
      "job": {
        "id": 5,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      }
    },
    "daily_progress": [
      {
        "id": 50,
        "nomor": "DP-20260819-001",
        "tanggal": "2026-08-19",
        "client_code": "CLIENT-001",
        "als_spk_id": 10,
        "no_spk": "SPK-001"
      }
    ],
    "tasks": [
      {
        "daily_progress_detail_id": 500,
        "daily_progress_id": 50,
        "als_job_id": 5,
        "source_type": "master",
        "task": {
          "id": 20,
          "task_name": "Membersihkan area",
          "parent": {
            "id": 19,
            "task_name": "Persiapan lahan"
          }
        },
        "daily_progress_status": "selesai",
        "daily_progress_catatan": "Pekerjaan selesai di lapangan",
        "allowed_progress_report_statuses": [
          "selesai"
        ],
        "default_progress_report_status": "selesai",
        "is_already_reported": false,
        "history": []
      }
    ],
    "finding_sources": {
      "master": [
        {
          "id": 19,
          "task_name": "Persiapan lahan"
        }
      ],
      "additional_tasks": [
        {
          "id": 30,
          "task_name": "Perbaikan drainase",
          "parent": null
        }
      ]
    }
  }
}
```

Pada response form-data, `tasks` hanya berisi detail yang telah diselesaikan pada Daily Progress (`daily_progress_status = "selesai"`).

### Response Error

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut."
}
```

Kemungkinan error lain:

| Status | Message |
| --- | --- |
| `401` | `Employee code tidak ditemukan pada token.` |
| `422` | `Master pekerjaan untuk SPK tersebut tidak ditemukan.` |

## GET /api/progress-report/history

Endpoint untuk mengambil riwayat Progress Report pada satu task tertentu.

Endpoint ini berguna untuk melihat pekerjaan yang pernah masuk Progress Report berdasarkan SPK dan task yang dipilih. User harus memilih salah satu antara master task atau Additional Task.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Ya | Kode client. |
| `als_spk_id` | integer | Ya | ID SPK. |
| `als_job_task_id` | integer | Kondisional | ID master task. Wajib jika `als_task_additional_detail_id` tidak dikirim. |
| `als_task_additional_detail_id` | integer | Kondisional | ID detail Additional Task. Wajib jika `als_job_task_id` tidak dikirim. |

Aturan query:

1. Harus mengirim salah satu dari `als_job_task_id` atau `als_task_additional_detail_id`.
2. Tidak boleh mengirim keduanya bersamaan.

### Request

```http
GET /api/progress-report/history?client_code=CLIENT-001&als_spk_id=10&als_job_task_id=20
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "History pekerjaan berhasil diambil.",
  "data": [
    {
      "progress_report_id": 1,
      "nomor_pr": "PR-20260819-0001",
      "tanggal": "2026-08-19",
      "client_code": "CLIENT-001",
      "spk_id": 10,
      "source_type": "master",
      "job": {
        "id": 5,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      },
      "task": {
        "id": 20,
        "task_name": "Membersihkan area",
        "parent": {
          "id": 19,
          "task_name": "Persiapan lahan"
        }
      },
      "status": "selesai",
      "notes": [
        {
          "id": 900,
          "catatan": "Pekerjaan selesai."
        }
      ]
    }
  ]
}
```

## POST /api/progress-report

Endpoint untuk membuat Progress Report dari detail pekerjaan Daily Progress yang **sudah selesai**.

Frontend dapat mengirim data task dalam bentuk checklist ID sederhana maupun object detail:
- `details: [500, 501]` (array of integer ID)
- `daily_progress_detail_ids: [500, 501]` (alias array of integer ID)
- `details: [{ "daily_progress_detail_id": 500, ... }]` (array of object)

Semua detail yang terpilih otomatis disimpan dengan status `selesai` pada Progress Report.

### Body Parameter

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `tanggal` | date | Ya | Tanggal Progress Report, format `YYYY-MM-DD`. |
| `client_code` | string | Ya | Kode client. |
| `als_spk_id` | integer | Ya | ID SPK. User login harus terdaftar pada team SPK tersebut. |
| `notes` | array | Tidak | Daftar catatan umum Progress Report. |
| `notes.*.judul` | string | Tidak | Judul catatan umum. Maksimal 256 karakter. |
| `notes.*.catatan` | string | Ya jika `notes` dikirim | Isi catatan umum Progress Report. |
| `details` | array | Ya | Minimal satu detail Daily Progress yang sudah checklist selesai. Dapat berupa array of integer `[500, 501]` atau array of object. |
| `details.*.daily_progress_detail_id` | integer | Ya jika dikirim object | ID detail Daily Progress yang sudah berstatus `selesai`. |
| `details.*.status` | string | Tidak | Opsional. Jika dikirim, harus bernilai `selesai`. |
| `details.*.notes` | array | Tidak | Daftar catatan per pekerjaan (opsional). |
| `details.*.notes.*.catatan` | string | Ya jika `details.*.notes` dikirim | Isi catatan pekerjaan. |
| `findings` | array | Tidak | Daftar temuan Progress Report. |
| `findings.*.source_type` | string | Ya jika `findings` dikirim | `master` atau `additional`. |
| `findings.*.als_job_task_id` | integer | Kondisional | Wajib jika `source_type` adalah `master`; harus root/master task dari job SPK. Tidak boleh diisi jika `additional`. |
| `findings.*.als_task_additional_detail_id` | integer | Kondisional | Wajib jika `source_type` adalah `additional`; tidak boleh diisi jika `master`. |
| `findings.*.keterangan` | string | Ya jika `findings` dikirim | Keterangan temuan. |

### Request (Contoh Checklist ID Sederhana)

```http
POST /api/progress-report
Accept: application/json
Authorization: Bearer {token}
Content-Type: application/json
```

```json
{
  "tanggal": "2026-08-19",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "notes": [
    {
      "judul": "Catatan umum",
      "catatan": "Catatan umum Progress Report"
    }
  ],
  "details": [500, 501],
  "findings": [
    {
      "source_type": "master",
      "als_job_task_id": 19,
      "keterangan": "Area kerja perlu dibersihkan ulang."
    }
  ]
}
```

### Request (Contoh Object)

```json
{
  "tanggal": "2026-08-19",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "notes": [
    {
      "judul": "Catatan umum",
      "catatan": "Catatan umum Progress Report"
    }
  ],
  "details": [
    {
      "daily_progress_detail_id": 500
    },
    {
      "daily_progress_detail_id": 501,
      "notes": [
        {
          "catatan": "Penyelesaian berjalan sesuai standar SOP."
        }
      ]
    }
  ]
}
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Progress Report berhasil dibuat.",
  "data": {
    "id": 1,
    "nomor": "PR-20260819-0001",
    "tanggal": "2026-08-19",
    "client_code": "CLIENT-001",
    "spk": {
      "id": 10,
      "source_pt": "ALS",
      "source_id": 1001,
      "no_spk": "SPK-001",
      "kode_product_jasa": "PJ-001",
      "note": "Pekerjaan inspeksi"
    },
    "job": {
      "id": 5,
      "job_code": "JOB-001",
      "description": "Pekerjaan harian kebun"
    },
    "notes": [
      {
        "id": 700,
        "judul": "Catatan umum",
        "catatan": "Catatan umum Progress Report",
        "created_at": "2026-08-19T03:00:00.000000Z"
      }
    ],
    "documents": [],
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [
      {
        "id": 100,
        "daily_progress_detail_id": 500,
        "source_type": "master",
        "task": {
          "id": 20,
          "task_name": "Membersihkan area",
          "parent": {
            "id": 19,
            "task_name": "Persiapan lahan"
          }
        },
        "status": "selesai",
        "notes": [],
        "documents": []
      },
      {
        "id": 101,
        "daily_progress_detail_id": 501,
        "source_type": "additional",
        "task": {
          "id": 30,
          "task_name": "Perbaikan drainase",
          "parent": null
        },
        "status": "selesai",
        "notes": [
          {
            "id": 701,
            "catatan": "Penyelesaian berjalan sesuai standar SOP.",
            "created_at": "2026-08-19T03:00:00.000000Z"
          }
        ],
        "documents": []
      }
    ],
    "findings": [
      {
        "id": 200,
        "source_type": "master",
        "master_task": {
          "id": 19,
          "task_name": "Persiapan lahan"
        },
        "additional_task": null,
        "keterangan": "Area kerja perlu dibersihkan ulang.",
        "documents": []
      }
    ],
    "created_at": "2026-08-19T03:00:00.000000Z",
    "updated_at": "2026-08-19T03:00:00.000000Z"
  }
}
```

### Response Error

Jika Daily Progress Detail yang dipilih belum selesai di DP:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Daily Progress Detail #500 belum selesai. Hanya pekerjaan yang sudah berstatus selesai di Daily Progress yang dapat dimasukkan ke Progress Report."
}
```

Kemungkinan error lain:

| Status | Message |
| --- | --- |
| `401` | `Employee code tidak ditemukan pada token.` |
| `422` | `SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut.` |
| `422` | `Master pekerjaan SPK tidak ditemukan.` |
| `422` | `Terdapat Daily Progress Detail yang dipilih lebih dari satu kali.` |
| `422` | `Daily Progress Detail tidak valid atau tidak sesuai dengan Progress Report.` |
| `422` | `Daily Progress Detail #{id} sudah pernah masuk Progress Report.` |
| `422` | `Status pekerjaan pada Progress Report harus selesai karena penyelesaian dilakukan pada Daily Progress.` |
| `422` | `Master Pekerjaan wajib dipilih untuk temuan.` |
| `422` | `Master Pekerjaan untuk temuan tidak valid.` |
| `422` | `Temuan Master Pekerjaan tidak boleh memiliki Task Tambahan.` |
| `422` | `Task Tambahan wajib dipilih untuk temuan.` |
| `422` | `Temuan Task Tambahan tidak boleh memiliki Master Pekerjaan.` |

## GET /api/progress-report/{progressReport}

Endpoint untuk mengambil detail Progress Report berdasarkan ID.

Data hanya dapat diambil oleh user pembuat Progress Report tersebut.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. Route hanya menerima angka. |

### Request

```http
GET /api/progress-report/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Progress Report berhasil diambil.",
  "data": {
    "id": 1,
    "nomor": "PR-20260819-0001",
    "tanggal": "2026-08-19",
    "client_code": "CLIENT-001",
    "spk": {
      "id": 10,
      "source_pt": "ALS",
      "source_id": 1001,
      "no_spk": "SPK-001",
      "kode_product_jasa": "PJ-001",
      "note": "Pekerjaan inspeksi"
    },
    "job": {
      "id": 5,
      "job_code": "JOB-001",
      "description": "Pekerjaan harian kebun"
    },
    "notes": [
      {
        "id": 700,
        "judul": "Catatan umum",
        "catatan": "Catatan umum Progress Report",
        "created_at": "2026-08-19T03:00:00.000000Z"
      }
    ],
    "documents": [],
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [],
    "findings": [],
    "created_at": "2026-08-19T03:00:00.000000Z",
    "updated_at": "2026-08-19T03:00:00.000000Z"
  }
}
```

### Response Error

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Progress Report tidak ditemukan."
}
```

## POST /api/progress-report/{progressReport}/documents

Endpoint untuk upload satu atau beberapa dokumen umum pada header Progress Report.

### Aturan Upload

1. Progress Report harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Request menggunakan `multipart/form-data`.
3. File disimpan pada disk Laravel `public`.
4. Database menyimpan path dan metadata file.
5. Untuk menghapus dokumen umum, gunakan `DELETE /api/progress-report/{progressReport}/documents/{document}`.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |

### Form Data

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `documents[]` | file[] | Ya | Satu sampai 10 file. Maksimal 20 MB per file. Format: `jpg`, `jpeg`, `png`, `webp`, `pdf`, `xls`, `xlsx`, `doc`, `docx`. |

### Request

```http
POST /api/progress-report/1/documents
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Dokumen Progress Report berhasil diupload.",
  "data": [
    {
      "id": 800,
      "original_name": "laporan.pdf",
      "mime_type": "application/pdf",
      "size": 204800,
      "path": "progress-reports/1/documents/550e8400-e29b-41d4-a716-446655440000.pdf",
      "url": "/storage/progress-reports/1/documents/550e8400-e29b-41d4-a716-446655440000.pdf",
      "created_at": "2026-08-20T03:45:00.000000Z"
    }
  ]
}
```

### Response Gagal

Progress Report tidak ditemukan atau bukan milik user login:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Progress Report tidak ditemukan."
}
```

Validasi file gagal:

Status: `422 Unprocessable Entity`

```json
{
  "message": "Minimal satu dokumen wajib diupload.",
  "errors": {
    "documents": [
      "Minimal satu dokumen wajib diupload."
    ]
  }
}
```

Kemungkinan error validasi lain:

| Field | Message |
| --- | --- |
| `documents` | `Format dokumen tidak valid.` |
| `documents` | `Maksimal 10 dokumen dalam satu kali upload.` |
| `documents.*` | `File dokumen tidak valid.` |
| `documents.*` | `Ukuran maksimal setiap dokumen adalah 20 MB.` |
| `documents.*` | `Format dokumen hanya diperbolehkan jpg, jpeg, png, webp, pdf, xls, xlsx, doc, dan docx.` |

## DELETE /api/progress-report/{progressReport}/documents/{document}

Endpoint untuk menghapus satu dokumen umum pada header Progress Report.

### Aturan Delete

1. Progress Report harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Dokumen harus berasal dari Progress Report yang ada pada URL.
3. Metadata dokumen dihapus dari tabel tenant `als_progress_report_documents`.
4. File fisik pada disk Laravel `public` ikut dihapus jika file masih ada.
5. Jika file fisik sudah tidak ada, delete tetap dianggap berhasil selama row dokumen ditemukan.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |
| `document` | integer | Ya | ID dokumen umum Progress Report dari `documents[].id`. |

### Request

```http
DELETE /api/progress-report/1/documents/800
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Dokumen Progress Report berhasil dihapus."
}
```

### Response Gagal

Progress Report tidak ditemukan atau bukan milik user login:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Progress Report tidak ditemukan."
}
```

Dokumen tidak ditemukan pada Progress Report tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Dokumen Progress Report tidak ditemukan."
}
```

## POST /api/progress-report/{progressReport}/details/{detail}/documents

Endpoint untuk upload satu atau beberapa dokumen pada satu detail pekerjaan Progress Report.

### Aturan Upload

1. Progress Report harus milik user yang sedang login.
2. Detail harus berasal dari Progress Report yang ada pada URL.
3. Request dan validasi file sama dengan upload dokumen umum Progress Report.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |
| `detail` | integer | Ya | ID detail Progress Report, bukan ID detail Daily Progress. |

### Request

```http
POST /api/progress-report/1/details/100/documents
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

Form data:

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `documents[]` | file[] | Ya | Satu sampai 10 file. Maksimal 20 MB per file. Format: `jpg`, `jpeg`, `png`, `webp`, `pdf`, `xls`, `xlsx`, `doc`, `docx`. |

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Dokumen pekerjaan berhasil diupload.",
  "data": [
    {
      "id": 810,
      "original_name": "foto-pekerjaan.jpg",
      "mime_type": "image/jpeg",
      "size": 512000,
      "path": "progress-reports/1/details/100/550e8400-e29b-41d4-a716-446655440001.jpg",
      "url": "/storage/progress-reports/1/details/100/550e8400-e29b-41d4-a716-446655440001.jpg",
      "created_at": "2026-08-20T03:45:00.000000Z"
    }
  ]
}
```

### Response Gagal

Detail tidak ditemukan atau tidak sesuai dengan Progress Report:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Detail Progress Report tidak ditemukan atau tidak sesuai dengan Progress Report."
}
```

Validasi file gagal sama seperti endpoint upload dokumen umum.

## DELETE /api/progress-report/{progressReport}/details/{detail}/documents/{document}

Endpoint untuk menghapus satu dokumen pada satu detail pekerjaan Progress Report.

### Aturan Delete

1. Progress Report harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Detail harus berasal dari Progress Report yang ada pada URL.
3. Dokumen harus berasal dari detail Progress Report yang ada pada URL.
4. Metadata dokumen dihapus dari tabel tenant `als_progress_report_detail_documents`.
5. File fisik pada disk Laravel `public` ikut dihapus jika file masih ada.
6. Jika file fisik sudah tidak ada, delete tetap dianggap berhasil selama row dokumen ditemukan.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |
| `detail` | integer | Ya | ID detail Progress Report, bukan ID detail Daily Progress. |
| `document` | integer | Ya | ID dokumen detail pekerjaan dari `details[].documents[].id`. |

### Request

```http
DELETE /api/progress-report/1/details/100/documents/810
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Dokumen pekerjaan berhasil dihapus."
}
```

### Response Gagal

Progress Report tidak ditemukan atau bukan milik user login:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Progress Report tidak ditemukan."
}
```

Detail tidak ditemukan pada Progress Report tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Detail Progress Report tidak ditemukan."
}
```

Dokumen tidak ditemukan pada detail tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Dokumen pekerjaan tidak ditemukan."
}
```

## POST /api/progress-report/{progressReport}/findings/{finding}/documents

Endpoint untuk upload satu atau beberapa dokumen pada satu temuan Progress Report.

### Aturan Upload

1. Progress Report harus milik user yang sedang login.
2. Temuan harus berasal dari Progress Report yang ada pada URL.
3. Request dan validasi file sama dengan upload dokumen umum Progress Report.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |
| `finding` | integer | Ya | ID temuan Progress Report. |

### Request

```http
POST /api/progress-report/1/findings/200/documents
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

Form data:

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `documents[]` | file[] | Ya | Satu sampai 10 file. Maksimal 20 MB per file. Format: `jpg`, `jpeg`, `png`, `webp`, `pdf`, `xls`, `xlsx`, `doc`, `docx`. |

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Dokumen temuan berhasil diupload.",
  "data": [
    {
      "id": 820,
      "original_name": "temuan.png",
      "mime_type": "image/png",
      "size": 409600,
      "path": "progress-reports/1/findings/200/550e8400-e29b-41d4-a716-446655440002.png",
      "url": "/storage/progress-reports/1/findings/200/550e8400-e29b-41d4-a716-446655440002.png",
      "created_at": "2026-08-20T03:45:00.000000Z"
    }
  ]
}
```

### Response Gagal

Temuan tidak ditemukan atau tidak sesuai dengan Progress Report:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Temuan tidak ditemukan atau tidak sesuai dengan Progress Report."
}
```

Validasi file gagal sama seperti endpoint upload dokumen umum.

## DELETE /api/progress-report/{progressReport}/findings/{finding}/documents/{document}

Endpoint untuk menghapus satu dokumen pada satu temuan Progress Report.

### Aturan Delete

1. Progress Report harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Temuan harus berasal dari Progress Report yang ada pada URL.
3. Dokumen harus berasal dari temuan Progress Report yang ada pada URL.
4. Metadata dokumen dihapus dari tabel tenant `als_progress_report_finding_documents`.
5. File fisik pada disk Laravel `public` ikut dihapus jika file masih ada.
6. Jika file fisik sudah tidak ada, delete tetap dianggap berhasil selama row dokumen ditemukan.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `progressReport` | integer | Ya | ID Progress Report. |
| `finding` | integer | Ya | ID temuan Progress Report. |
| `document` | integer | Ya | ID dokumen temuan dari `findings[].documents[].id`. |

### Request

```http
DELETE /api/progress-report/1/findings/200/documents/820
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Dokumen temuan berhasil dihapus."
}
```

### Response Gagal

Progress Report tidak ditemukan atau bukan milik user login:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Progress Report tidak ditemukan."
}
```

Temuan tidak ditemukan pada Progress Report tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Temuan Progress Report tidak ditemukan."
}
```

Dokumen tidak ditemukan pada temuan tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Dokumen temuan tidak ditemukan."
}
```

## Contoh cURL

### List Progress Report

```bash
curl -X GET "http://localhost:8000/api/progress-report?client_code=CLIENT-001&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Form Data

```bash
curl -X GET "http://localhost:8000/api/progress-report/form-data?client_code=CLIENT-001&als_spk_id=10&tanggal=2026-08-19" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### History Task

```bash
curl -X GET "http://localhost:8000/api/progress-report/history?client_code=CLIENT-001&als_spk_id=10&als_job_task_id=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Create Progress Report (Checklist ID)

```bash
curl -X POST "http://localhost:8000/api/progress-report" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tanggal": "2026-08-19",
    "client_code": "CLIENT-001",
    "als_spk_id": 10,
    "notes": [
      {
        "judul": "Catatan umum",
        "catatan": "Catatan umum Progress Report"
      }
    ],
    "details": [500, 501],
    "findings": [
      {
        "source_type": "master",
        "als_job_task_id": 19,
        "keterangan": "Area kerja perlu dibersihkan ulang."
      }
    ]
  }'
```

### Upload Dokumen Umum Progress Report

```bash
curl -X POST "http://localhost:8000/api/progress-report/1/documents" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "documents[]=@/path/to/laporan.pdf"
```

### Hapus Dokumen Umum Progress Report

```bash
curl -X DELETE "http://localhost:8000/api/progress-report/1/documents/800" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Upload Dokumen Detail Pekerjaan

```bash
curl -X POST "http://localhost:8000/api/progress-report/1/details/100/documents" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "documents[]=@/path/to/foto-pekerjaan.jpg"
```

### Hapus Dokumen Detail Pekerjaan

```bash
curl -X DELETE "http://localhost:8000/api/progress-report/1/details/100/documents/810" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Upload Dokumen Temuan

```bash
curl -X POST "http://localhost:8000/api/progress-report/1/findings/200/documents" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "documents[]=@/path/to/temuan.png"
```

### Hapus Dokumen Temuan

```bash
curl -X DELETE "http://localhost:8000/api/progress-report/1/findings/200/documents/820" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Show Progress Report

```bash
curl -X GET "http://localhost:8000/api/progress-report/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```
