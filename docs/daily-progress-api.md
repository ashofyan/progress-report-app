# Dokumentasi API Daily Progress

Dokumen ini menjelaskan endpoint Daily Progress yang terdaftar pada `routes/api.php`.

## Catatan Perubahan untuk Frontend

Bagian ini merangkum perubahan kontrak Daily Progress dibanding dokumentasi sebelumnya:

1. `GET /api/daily-progress/form-data` tidak lagi mengembalikan top-level `pending`.
2. Histori pekerjaan sekarang diambil dari Progress Report, bukan dari Daily Progress terakhir.
3. Data Progress Report dikirim langsung pada setiap child master task di `spks[].job.tasks[].children[].last_progress_report` dan `spks[].job.tasks[].children[].history`.
4. `children[].last_progress_report` berisi Progress Report terbaru untuk kombinasi SPK dan child master task tersebut, atau `null` jika belum pernah masuk Progress Report.
5. `children[].history` berisi seluruh histori Progress Report untuk kombinasi SPK dan child master task tersebut, diurutkan dari data terbaru.
6. `GET /api/daily-progress/pending` sekarang hanya membaca query `client_code`; query `bulan` dan `tahun` tidak lagi dipakai oleh controller.
7. Message sukses endpoint pending berubah menjadi `Data pending berhasil diambil.`
8. Response pending berubah: field `type` menjadi `task_type`, ditambahkan object `client`, object `spk` lebih lengkap, serta `created_at` dan `updated_at`.
9. Response pending tidak lagi mengembalikan `bulan` dan `tahun` di dalam `daily_progress`.\n10. Endpoint pending sekarang mengambil semua detail berstatus `pending` milik user login berdasarkan client, tanpa filter "belum memiliki kelanjutan" di service.
11. Endpoint `POST /api/daily-progress/resolve` tetap tidak tersedia pada route terbaru.
12. Response Daily Progress sekarang dapat mengembalikan top-level `findings` ketika relasi findings di-load. Field ini berisi daftar temuan Progress Report yang ditautkan ke Daily Progress.
13. `POST /api/daily-progress` dan `PUT /api/daily-progress/{dailyProgress}` menerima `finding_ids` opsional untuk menautkan atau melepas temuan Progress Report yang masih open.
14. `POST /api/daily-progress` dan `PUT /api/daily-progress/{dailyProgress}` menerima `temuan_ids` opsional untuk menautkan atau melepas Temuan Global yang masih open.
15. Response Daily Progress sekarang dapat mengembalikan top-level `temuans` ketika relasi Temuan Global di-load. Field ini berisi daftar Temuan Global yang ditautkan ke Daily Progress.
16. Tersedia endpoint baru `PUT /api/daily-progress/{dailyProgress}/edit` untuk koreksi/edit total form Daily Progress (pemilihan SPK, tanggal, bulan, tahun, daftar task/detail pekerjaan, finding, dan temuan).

```php
Route::prefix('daily-progress')->group(function () {
    Route::get('/form-data', DailyProgressFormController::class);
    Route::get('/', [DailyProgressController::class, 'index']);
    Route::post('/', [DailyProgressController::class, 'store']);
    Route::get('/pending', [DailyProgressController::class, 'pending']);
    Route::get('/{dailyProgress}', [DailyProgressController::class, 'show'])
        ->whereNumber('dailyProgress');
    Route::put('/{dailyProgress}', [DailyProgressController::class, 'update'])
        ->whereNumber('dailyProgress');
    Route::put('/{dailyProgress}/edit', [DailyProgressController::class, 'edit'])
        ->whereNumber('dailyProgress');
    Route::delete('/{dailyProgress}', [DailyProgressController::class, 'destroy'])
        ->whereNumber('dailyProgress');
    Route::delete('/{dailyProgress}/details/{detail}', [DailyProgressController::class, 'deleteDetail'])
        ->whereNumber('dailyProgress')
        ->whereNumber('detail');
    Route::post('/{dailyProgress}/details/{detail}/documents', [DailyProgressController::class, 'uploadDocuments'])
        ->whereNumber('dailyProgress')
        ->whereNumber('detail');
    Route::delete('/{dailyProgress}/details/{detail}/documents/{document}', [DailyProgressController::class, 'deleteDocument'])
        ->whereNumber('dailyProgress')
        ->whereNumber('detail')
        ->whereNumber('document');
});
```

## Ringkasan

Semua endpoint berada di bawah prefix `/api/daily-progress`.\n
Endpoint Daily Progress berada di dalam middleware:

```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    // daily-progress
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
| `GET` | `/api/daily-progress/form-data` | Mengambil data pendukung form Daily Progress, termasuk SPK user pada client terpilih serta Progress Report terbaru dan histori per child task. |
| `GET` | `/api/daily-progress` | Mengambil daftar Daily Progress milik user login. |
| `POST` | `/api/daily-progress` | Membuat atau menambahkan detail ke Daily Progress. |
| `GET` | `/api/daily-progress/pending` | Mengambil daftar detail Daily Progress yang masih pending. |
| `GET` | `/api/daily-progress/{dailyProgress}` | Mengambil detail Daily Progress berdasarkan ID. |
| `PUT` | `/api/daily-progress/{dailyProgress}` | Memperbarui status dan catatan detail Daily Progress (untuk update penyelesaian DP). |
| `PUT` | `/api/daily-progress/{dailyProgress}/edit` | Mengoreksi/mengedit data form Daily Progress (header, task/detail, finding, temuan) ketika user salah memilih data DP. |
| `DELETE` | `/api/daily-progress/{dailyProgress}` | Menghapus Daily Progress. |
| `DELETE` | `/api/daily-progress/{dailyProgress}/details/{detail}` | Menghapus satu detail Daily Progress. |
| `POST` | `/api/daily-progress/{dailyProgress}/details/{detail}/documents` | Upload satu atau beberapa dokumen untuk satu detail Daily Progress. |
| `DELETE` | `/api/daily-progress/{dailyProgress}/details/{detail}/documents/{document}` | Menghapus dokumen dari satu detail Daily Progress. |

Response endpoint ini menggunakan key `status`, bukan `success`.

## Struktur Data

Header Daily Progress disimpan pada tabel tenant `als_daily_progresses`.
Detail Daily Progress disimpan pada tabel tenant `als_daily_progress_details`.
Dokumen detail Daily Progress disimpan pada tabel tenant `als_daily_progress_detail_documents`.
Relasi temuan Daily Progress ke temuan Progress Report disimpan pada tabel tenant `als_daily_progress_findings`.
Relasi Temuan Global Daily Progress ke endpoint `/api/temuan` disimpan pada tabel tenant `als_daily_progress_temuans`.

Nomor Daily Progress dibuat otomatis dengan format:

```text
DP-YYYYMMDD-001
```

Contoh: `DP-20260814-001`.

Satu header Daily Progress unik untuk kombinasi:

```text
created_by + client_code + tanggal + bulan + tahun
```

Jika `POST /api/daily-progress` dikirim untuk kombinasi yang sudah ada, sistem memakai header yang sama dan menambahkan detail baru ke nomor Daily Progress existing. Field `no_spk` pada header diambil otomatis dari SPK berdasarkan `als_spk_id`.

## Status Detail

Status detail yang valid:

| Status | Keterangan |
| --- | --- |
| `open` | Task masih terbuka. |
| `pending` | Task belum selesai dan perlu dilanjutkan. |
| `batal` | Task dibatalkan. |
| `selesai` | Task selesai. |

Jika status `pending`, field `catatan` wajib diisi pada create, edit, dan update.

## Tipe Detail

Setiap detail harus memilih salah satu tipe task:

| Tipe | Field yang dikirim | Keterangan |
| --- | --- | --- |
| Master Task | `als_job_task_id` | Task dari master pekerjaan. Harus berupa sub task, bukan parent/root task. |
| Additional Task | `als_task_additional_detail_id` | Detail dari Additional Task. |

`als_job_task_id` dan `als_task_additional_detail_id` tidak boleh dikirim bersamaan.

## Format Response Daily Progress

```json
{
  "id": 1,
  "nomor": "DP-20260814-001",
  "tanggal": "2026-08-14",
  "client_code": "CLIENT-001",
  "no_spk": "SPK-001",
  "bulan": 8,
  "tahun": 2026,
  "created_by": "EMP001",
  "created_by_level": 3,
  "details": [
    {
      "id": 100,
      "als_job_id": 1,
      "job": {
        "id": 1,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      },
      "type": "master",
      "als_job_task_id": 11,
      "als_task_additional_detail_id": null,
      "task": {
        "id": 11,
        "task_name": "Membersihkan area",
        "parent": {
          "id": 10,
          "task_name": "Persiapan lahan"
        }
      },
      "status": "open",
      "catatan": null,
      "documents": [
        {
          "id": 500,
          "als_daily_progress_detail_id": 100,
          "path": "daily-progress/1/details/100/documents/example.pdf",
          "original_name": "example.pdf",
          "mime_type": "application/pdf",
          "size": 204800,
          "created_at": "2026-08-14T02:05:00.000000Z",
          "updated_at": "2026-08-14T02:05:00.000000Z"
        }
      ],
      "created_at": "2026-08-14T02:00:00.000000Z",
      "updated_at": "2026-08-14T02:00:00.000000Z"
    }
  ],
  "findings": [
    {
      "id": 900,
      "progress_report_id": 50,
      "nomor_pr": "PR-20260813-001",
      "tanggal": "2026-08-13",
      "source_type": "master",
      "keterangan": "Dokumen pendukung belum lengkap",
      "status": "open"
    }
  ],
  "temuans": [
    {
      "id": 901,
      "nomor": "TM-20260827-001",
      "tanggal": "2026-08-27",
      "status": "open",
      "notes": [
        {
          "id": 910,
          "task": {
            "id": 20,
            "task_name": "Persiapan lahan"
          },
          "note": "Area kerja perlu dibersihkan ulang."
        }
      ]
    }
  ],
  "created_at": "2026-08-14T02:00:00.000000Z",
  "updated_at": "2026-08-14T02:00:00.000000Z"
}
```

Field `findings` hanya muncul pada response yang memuat relasi `findings`. Setiap item berasal dari temuan Progress Report yang ditautkan ke Daily Progress melalui `finding_ids`.

Field `temuans` hanya muncul pada response yang memuat relasi `temuans`. Setiap item berasal dari Temuan Global endpoint `/api/temuan` yang ditautkan ke Daily Progress melalui `temuan_ids`.

## GET /api/daily-progress/form-data

Endpoint untuk mengambil data pendukung form Daily Progress berdasarkan client yang dipilih.

Data yang dikembalikan:

1. Informasi employee dari Progress Token.
2. Daftar SPK pada client terpilih yang memiliki team dengan `kode_employee` user login.
3. Master job dan task dari masing-masing SPK.
4. Progress Report terbaru untuk setiap child master task pada SPK tersebut.
5. Histori Progress Report untuk setiap child master task pada SPK tersebut.

Filter `bulan` dan `tahun` bersifat opsional. Jika keduanya dikirim, SPK difilter berdasarkan overlap periode SPK dengan bulan/tahun tersebut. Jika salah satu atau keduanya tidak dikirim, seluruh SPK user untuk client tersebut dikembalikan.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Ya | Kode client yang dipilih. |
| `bulan` | integer | Tidak | Filter bulan periode SPK, `1` sampai `12`. |
| `tahun` | integer | Tidak | Filter tahun periode SPK, `2000` sampai `2100`. |

### Request

```http
GET /api/daily-progress/form-data?client_code=CLIENT-001&bulan=8&tahun=2026
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data form Daily Progress berhasil diambil.",
  "data": {
    "client_code": "CLIENT-001",
    "employee": {
      "employee_code": "EMP001",
      "employee_name": "Budi Santoso",
      "tingkat": 3
    },
    "spks": [
      {
        "spk_id": 1,
        "source_pt": "ALS",
        "source_id": 123,
        "no_spk": "SPK-001",
        "client_code": "CLIENT-001",
        "periode_awal": "2026-08-01",
        "periode_akhir": "2026-08-31",
        "tanggal": "2026-08-01",
        "jenis": "regular",
        "status": "active",
        "kode_product_jasa": "JOB-001",
        "note": "Pekerjaan harian kebun",
        "job": {
          "id": 1,
          "job_code": "JOB-001",
          "description": "Pekerjaan harian kebun",
          "tasks": [
            {
              "id": 10,
              "task_name": "Persiapan lahan",
              "parent_id": null,
              "children": [
                {
                  "id": 11,
                  "task_name": "Membersihkan area",
                  "parent_id": 10,
                  "last_progress_report": {
                    "progress_report_detail_id": 300,
                    "progress_report_id": 20,
                    "nomor": "PR-20260819-0001",
                    "tanggal": "2026-08-19",
                    "status": "pending",
                    "notes": [
                      {
                        "id": 900,
                        "catatan": "Menunggu konfirmasi client"
                      }
                    ]
                  },
                  "history": [
                    {
                      "progress_report_detail_id": 300,
                      "progress_report_id": 20,
                      "nomor": "PR-20260819-0001",
                      "tanggal": "2026-08-19",
                      "status": "pending",
                      "notes": [
                        {
                          "id": 900,
                          "catatan": "Menunggu konfirmasi client"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

Jika `kode_product_jasa` pada SPK belum ada di master `als_jobs`, field `job` akan bernilai `null`.

Parent task pada `spks[].job.tasks[]` hanya digunakan sebagai grouping. Task yang dapat dipilih untuk `POST /api/daily-progress` adalah child task, yaitu `spks[].job.tasks[].children[].id`.

Field `spks[].job.tasks[].children[].last_progress_report` berisi Progress Report terbaru child task tersebut pada SPK yang sama. Nilainya `null` jika task belum pernah masuk Progress Report.

Field `spks[].job.tasks[].children[].history` berisi semua histori Progress Report child task tersebut pada SPK yang sama. Setiap item histori menyertakan `progress_report_detail_id`, `progress_report_id`, `nomor`, `tanggal`, `status`, dan array `notes`.

### Response Gagal

Client tidak dikirim:

Status: `422 Unprocessable Entity`

```json
{
  "message": "Client wajib dipilih.",
  "errors": {
    "client_code": [
      "Client wajib dipilih."
    ]
  }
}
```

Employee code tidak ada pada token:

Status: `401 Unauthorized`

```json
{
  "status": false,
  "message": "Employee code tidak ditemukan pada token."
}
```

## GET /api/daily-progress

Endpoint untuk mengambil daftar Daily Progress milik user yang sedang login.

Data difilter otomatis berdasarkan `employee_code` pada token.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter berdasarkan kode client. |
| `tanggal` | date | Tidak | Filter berdasarkan tanggal, format `YYYY-MM-DD`. |
| `bulan` | integer | Tidak | Filter bulan, `1` sampai `12`. |
| `tahun` | integer | Tidak | Filter tahun. |

### Request

```http
GET /api/daily-progress?client_code=CLIENT-001&tanggal=2026-08-14&bulan=8&tahun=2026
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Daily Progress berhasil diambil.",
  "data": [
    {
      "id": 1,
      "nomor": "DP-20260814-001",
      "tanggal": "2026-08-14",
      "client_code": "CLIENT-001",
      "no_spk": "SPK-001",
      "bulan": 8,
      "tahun": 2026,
      "created_by": "EMP001",
      "created_by_level": 3,
      "details": [],
      "findings": [],
      "temuans": [],
      "created_at": "2026-08-14T02:00:00.000000Z",
      "updated_at": "2026-08-14T02:00:00.000000Z"
    }
  ]
}
```

## POST /api/daily-progress

Endpoint untuk membuat Daily Progress baru atau menambahkan detail ke header Daily Progress yang sudah ada pada tanggal, client, SPK, bulan, tahun, dan user yang sama. Endpoint ini juga dapat menautkan temuan Progress Report melalui `finding_ids` dan Temuan Global melalui `temuan_ids`.

User login harus terdaftar sebagai team pada SPK yang dikirim melalui `als_spk_id`. Field `no_spk` tidak dikirim dari client; nilainya diambil otomatis dari data SPK.

### Request

Headers:

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

Body dengan master task:

```json
{
  "tanggal": "2026-08-14",
  "client_code": "CLIENT-001",
  "als_spk_id": 1,
  "bulan": 8,
  "tahun": 2026,
  "finding_ids": [900],
  "temuan_ids": [901],
  "details": [
    {
      "als_job_id": 1,
      "als_job_task_id": 11,
      "status": "open",
      "catatan": null
    }
  ]
}
```

Body dengan additional task:

```json
{
  "tanggal": "2026-08-14",
  "client_code": "CLIENT-001",
  "als_spk_id": 1,
  "bulan": 8,
  "tahun": 2026,
  "finding_ids": [900],
  "temuan_ids": [901],
  "details": [
    {
      "als_job_id": 1,
      "als_task_additional_detail_id": 100,
      "status": "pending",
      "catatan": "Menunggu konfirmasi client"
    }
  ]
}
```

### Validasi

| Field | Rule | Keterangan |
| --- | --- | --- |
| `tanggal` | `required`, `date` | Tanggal Daily Progress. |
| `client_code` | `required`, `string`, `max:256` | Kode client. |
| `als_spk_id` | `required`, `integer` | ID SPK. User login harus terdaftar pada team SPK tersebut dan `kode_klien` SPK harus sama dengan `client_code`. |
| `bulan` | `required`, `integer`, `between:1,12` | Bulan periode. |
| `tahun` | `required`, `integer`, `min:2000`, `max:2100` | Tahun periode. |
| `finding_ids` | `nullable`, `array` | Opsional. ID temuan Progress Report yang akan ditautkan ke Daily Progress. Kirim `[]` atau kosongkan untuk tidak menautkan temuan. |
| `finding_ids.*` | `integer`, `distinct` | ID temuan harus unik. Temuan harus masih `open`, milik user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `temuan_ids` | `nullable`, `array` | Opsional. ID Temuan Global dari endpoint `/api/temuan` yang akan ditautkan ke Daily Progress. Kirim `[]` atau kosongkan untuk tidak menautkan Temuan Global. |
| `temuan_ids.*` | `integer`, `distinct` | ID Temuan Global harus unik. Temuan harus masih `open`, dapat diakses oleh team user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `details` | `required`, `array`, `min:1` | Minimal satu pekerjaan harus dipilih. |
| `details.*.als_job_id` | `required`, `integer` | ID master pekerjaan. Job harus sesuai dengan `kode_product_jasa` pada SPK. |
| `details.*.als_job_task_id` | `nullable`, `integer` | ID child task master pekerjaan. Parent/root task tidak dapat dipilih. |
| `details.*.als_task_additional_detail_id` | `nullable`, `integer` | ID detail additional task. Additional task harus berada pada job yang dipilih. |
| `details.*.status` | `required`, `string`, `in:open,pending,batal,selesai` | Status detail. |
| `details.*.catatan` | `nullable`, `string` | Catatan detail. Wajib diisi jika status `pending`. |

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Daily Progress berhasil disimpan.",
  "data": {
    "id": 1,
    "nomor": "DP-20260814-001",
    "tanggal": "2026-08-14",
    "client_code": "CLIENT-001",
    "no_spk": "SPK-001",
    "bulan": 8,
    "tahun": 2026,
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [
      {
        "id": 100,
        "als_job_id": 1,
        "type": "master",
        "als_job_task_id": 11,
        "als_task_additional_detail_id": null,
        "status": "open",
        "catatan": null
      }
    ],
    "findings": [
      {
        "id": 900,
        "progress_report_id": 50,
        "nomor_pr": "PR-20260813-001",
        "tanggal": "2026-08-13",
        "source_type": "master",
        "keterangan": "Dokumen pendukung belum lengkap",
        "status": "open"
      }
    ],
    "temuans": [
      {
        "id": 901,
        "nomor": "TM-20260827-001",
        "tanggal": "2026-08-27",
        "status": "open",
        "notes": [
          {
            "id": 910,
            "task": {
              "id": 20,
              "task_name": "Persiapan lahan"
            },
            "note": "Area kerja perlu dibersihkan ulang."
          }
        ]
      }
    ],
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T02:00:00.000000Z"
  }
}
```

### Response Gagal

SPK tidak ditemukan, client tidak sesuai, atau user tidak terdaftar pada team SPK:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut."
}
```

Temuan tidak valid, bukan milik user login, berbeda SPK/client, atau sudah tidak open:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Terdapat Temuan yang tidak valid, bukan milik Anda, berbeda SPK, atau sudah selesai."
}
```

Temuan Global tidak valid, berbeda SPK/client, tidak dapat diakses oleh team user login, atau sudah tidak open:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Terdapat Temuan yang tidak valid, berbeda SPK, tidak dapat diakses oleh team Anda, atau sudah selesai."
}
```

Job tidak sesuai dengan SPK:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Pekerjaan tidak sesuai dengan SPK."
}
```

Task tidak dipilih:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Task wajib dipilih."
}
```

Master Task dan Additional Task dikirim bersamaan:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Pilih salah satu antara Master Task atau Additional Task."
}
```

Catatan kosong saat status pending:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Catatan wajib diisi jika status pending."
}
```

## GET /api/daily-progress/pending

Endpoint untuk mengambil detail Daily Progress yang masih berstatus `pending` milik user login.

Endpoint ini hanya memfilter status `pending` dan optional `client_code`. Saat ini tidak ada filter `bulan`, `tahun`, atau filter kelanjutan di service.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter berdasarkan kode client. |

### Request

```http
GET /api/daily-progress/pending?client_code=CLIENT-001
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data pending berhasil diambil.",
  "data": [
    {
      "detail_id": 100,
      "daily_progress": {
        "id": 1,
        "nomor": "DP-20260814-001",
        "tanggal": "2026-08-14",
        "client_code": "CLIENT-001",
        "als_spk_id": 1,
        "no_spk": "SPK-001"
      },
      "client": {
        "code": "CLIENT-001"
      },
      "spk": {
        "id": 1,
        "source_pt": "ALS",
        "source_id": 123,
        "no_spk": "SPK-001",
        "kode_product_jasa": "JOB-001",
        "note": "Pekerjaan harian kebun",
        "jenis": "regular",
        "periode_awal": "2026-08-01",
        "periode_akhir": "2026-08-31"
      },
      "job": {
        "id": 1,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      },
      "task_type": "master",
      "task": {
        "id": 11,
        "task_name": "Membersihkan area",
        "parent": {
          "id": 10,
          "task_name": "Persiapan lahan"
        }
      },
      "status": "pending",
      "catatan": "Menunggu konfirmasi client",
      "created_at": "2026-08-14T02:00:00.000000Z",
      "updated_at": "2026-08-14T02:00:00.000000Z"
    }
  ]
}
```

## GET /api/daily-progress/{dailyProgress}

Endpoint untuk mengambil detail Daily Progress berdasarkan ID.

### Request

```http
GET /api/daily-progress/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Daily Progress berhasil diambil.",
  "data": {
    "id": 1,
    "nomor": "DP-20260814-001",
    "tanggal": "2026-08-14",
    "client_code": "CLIENT-001",
    "no_spk": "SPK-001",
    "bulan": 8,
    "tahun": 2026,
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [],
    "findings": [
      {
        "id": 900,
        "progress_report_id": 50,
        "nomor_pr": "PR-20260813-001",
        "tanggal": "2026-08-13",
        "source_type": "master",
        "keterangan": "Dokumen pendukung belum lengkap",
        "status": "open"
      }
    ],
    "temuans": [
      {
        "id": 901,
        "nomor": "TM-20260827-001",
        "tanggal": "2026-08-27",
        "status": "open",
        "notes": [
          {
            "id": 910,
            "task": {
              "id": 20,
              "task_name": "Persiapan lahan"
            },
            "note": "Area kerja perlu dibersihkan ulang."
          }
        ]
      }
    ],
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T02:00:00.000000Z"
  }
}
```

### Response Gagal

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Daily Progress tidak ditemukan."
}
```

## PUT /api/daily-progress/{dailyProgress}/edit

Endpoint untuk mengoreksi/mengedit total data Daily Progress ketika user melakukan kesalahan pemilihan data (misalnya salah memilih SPK, salah client, salah tanggal/bulan/tahun, atau salah memilih task/pekerjaan).

Berbeda dari `PUT /api/daily-progress/{dailyProgress}` yang hanya digunakan untuk mengubah status penyelesaian, endpoint ini mengizinkan konfigurasi ulang menyeluruh pada form Daily Progress.

### Aturan Edit

1. Daily Progress hanya dapat diubah oleh pembuatnya (`created_by === employee_code`).
2. Header Daily Progress (tanggal, client_code, als_spk_id, bulan, tahun) diperbarui. Jika tanggal berubah, nomor DP otomatis disesuaikan.
3. User login harus terdaftar pada team SPK terpilih (`als_spk_id`).
4. Detail pekerjaan (`details`) disinkronkan:
   - Jika `details.*.id` dikirim dan ada pada DP tersebut, detail tersebut akan diupdate (`als_job_id`, task, status, catatan).
   - Jika `details.*.id` kosong/baru, detail baru akan dibuat.
   - Detail yang tidak lagi disertakan dalam request akan dihapus (jika detail belum masuk ke Progress Report).
5. Jika detail lama yang dihapus sudah pernah masuk ke `AlsProgressReportDetail`, request akan ditolak untuk menjaga integritas relasi.
6. Relasi `finding_ids` dan `temuan_ids` akan disinkronkan. Kirim `[]` untuk mengosongkan relasi temuan.

### Request

Headers:

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

Body:

```json
{
  "tanggal": "2026-08-14",
  "client_code": "CLIENT-001",
  "als_spk_id": 1,
  "bulan": 8,
  "tahun": 2026,
  "finding_ids": [900],
  "temuan_ids": [901],
  "details": [
    {
      "id": 100,
      "als_job_id": 1,
      "als_job_task_id": 11,
      "als_task_additional_detail_id": null,
      "status": "open",
      "catatan": null
    },
    {
      "als_job_id": 1,
      "als_job_task_id": 12,
      "als_task_additional_detail_id": null,
      "status": "pending",
      "catatan": "Menunggu konfirmasi material"
    }
  ]
}
```

### Validasi

| Field | Rule | Keterangan |
| --- | --- | --- |
| `tanggal` | `required`, `date` | Tanggal Daily Progress. |
| `client_code` | `required`, `string`, `max:256` | Kode client. |
| `als_spk_id` | `required`, `integer` | ID SPK. User login harus terdaftar pada team SPK tersebut dan `kode_klien` SPK harus sama dengan `client_code`. |
| `bulan` | `required`, `integer`, `between:1,12` | Bulan periode. |
| `tahun` | `required`, `integer`, `min:2000`, `max:2100` | Tahun periode. |
| `finding_ids` | `sometimes`, `nullable`, `array` | Opsional. ID temuan Progress Report yang akan ditautkan ke Daily Progress. |
| `finding_ids.*` | `integer`, `distinct` | ID temuan harus unik. Temuan harus masih `open`, milik user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `temuan_ids` | `sometimes`, `nullable`, `array` | Opsional. ID Temuan Global dari endpoint `/api/temuan` yang akan ditautkan ke Daily Progress. |
| `temuan_ids.*` | `integer`, `distinct` | ID Temuan Global harus unik. Temuan harus masih `open`, dapat diakses oleh team user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `details` | `required`, `array`, `min:1` | Minimal satu pekerjaan harus dipilih. |
| `details.*.id` | `nullable`, `integer` | ID detail yang ada saat ini (opsional jika ingin mengupdate detail existing). |
| `details.*.als_job_id` | `required`, `integer` | ID master pekerjaan. Job harus sesuai dengan `kode_product_jasa` pada SPK. |
| `details.*.als_job_task_id` | `nullable`, `integer` | ID child task master pekerjaan. Parent/root task tidak dapat dipilih. |
| `details.*.als_task_additional_detail_id` | `nullable`, `integer` | ID detail additional task. Additional task harus berada pada job yang dipilih. |
| `details.*.status` | `required`, `string`, `in:open,pending,batal,selesai` | Status detail. |
| `details.*.catatan` | `nullable`, `string` | Catatan detail. Wajib diisi jika status `pending`. |

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Daily Progress berhasil diperbarui.",
  "data": {
    "id": 1,
    "nomor": "DP-20260814-001",
    "tanggal": "2026-08-14",
    "client_code": "CLIENT-001",
    "no_spk": "SPK-001",
    "bulan": 8,
    "tahun": 2026,
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [
      {
        "id": 100,
        "als_job_id": 1,
        "type": "master",
        "als_job_task_id": 11,
        "als_task_additional_detail_id": null,
        "status": "open",
        "catatan": null
      }
    ],
    "findings": [
      {
        "id": 900,
        "progress_report_id": 50,
        "nomor_pr": "PR-20260813-001",
        "tanggal": "2026-08-13",
        "source_type": "master",
        "keterangan": "Dokumen pendukung belum lengkap",
        "status": "open"
      }
    ],
    "temuans": [
      {
        "id": 901,
        "nomor": "TM-20260827-001",
        "tanggal": "2026-08-27",
        "status": "open",
        "notes": [
          {
            "id": 910,
            "task": {
              "id": 20,
              "task_name": "Persiapan lahan"
            },
            "note": "Area kerja perlu dibersihkan ulang."
          }
        ]
      }
    ],
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T03:00:00.000000Z"
  }
}
```

### Response Gagal

User bukan pembuat Daily Progress:

Status: `403 Forbidden`

```json
{
  "status": false,
  "message": "Daily Progress hanya dapat diubah oleh pembuatnya."
}
```

SPK tidak ditemukan atau bukan team:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut."
}
```

Detail tidak dapat dihapus karena sudah di-Progress Report:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Detail ID 100 tidak dapat dihapus karena sudah masuk dalam Progress Report."
}
```

## PUT /api/daily-progress/{dailyProgress}

Endpoint untuk memperbarui `no_spk`, status, catatan detail Daily Progress, relasi temuan Progress Report, dan relasi Temuan Global (untuk status/penyelesaian DP).

Header identity tidak berubah. Field yang dapat dikoreksi di header hanya `no_spk`.
Jika update catatan penyelesaian membutuhkan dokumen, lakukan upload file setelah update melalui `POST /api/daily-progress/{dailyProgress}/details/{detail}/documents`.

### Aturan Update

1. Daily Progress hanya dapat diubah oleh pembuatnya.
2. Semua `details.*.id` harus berasal dari Daily Progress yang sama.
3. Update hanya mengubah `no_spk`, `status`, `catatan`, relasi temuan jika `finding_ids` dikirim, dan relasi Temuan Global jika `temuan_ids` dikirim.
4. Jika status detail diubah menjadi `pending`, `catatan` wajib diisi.
5. Jika `finding_ids` dikirim, daftar temuan yang tertaut akan disinkronkan sesuai isi array. Kirim `[]` untuk melepas semua temuan dari Daily Progress tersebut.
6. Temuan yang boleh ditautkan harus masih `open`, milik user login, memiliki client yang sama, dan berada pada SPK yang sama.
7. Jika `temuan_ids` dikirim, daftar Temuan Global yang tertaut akan disinkronkan sesuai isi array. Kirim `[]` untuk melepas semua Temuan Global dari Daily Progress tersebut.
8. Temuan Global yang boleh ditautkan harus masih `open`, dapat diakses oleh team user login, memiliki client yang sama, dan berada pada SPK yang sama.

### Request

Headers:

```http
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

Body:

```json
{
  "no_spk": "SPK-001-REV",
  "finding_ids": [900],
  "temuan_ids": [901],
  "details": [
    {
      "id": 100,
      "status": "pending",
      "catatan": "Menunggu konfirmasi client"
    }
  ]
}
```

### Validasi

| Field | Rule | Keterangan |
| --- | --- | --- |
| `no_spk` | `nullable`, `string`, `max:256` | Nomor SPK. |
| `finding_ids` | `sometimes`, `nullable`, `array` | Opsional. Jika tidak dikirim, relasi temuan tidak diubah. Jika dikirim, relasi temuan akan disinkronkan sesuai isi array. |
| `finding_ids.*` | `integer`, `distinct` | ID temuan harus unik. Temuan harus masih `open`, milik user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `temuan_ids` | `sometimes`, `nullable`, `array` | Opsional. Jika tidak dikirim, relasi Temuan Global tidak diubah. Jika dikirim, relasi Temuan Global akan disinkronkan sesuai isi array. |
| `temuan_ids.*` | `integer`, `distinct` | ID Temuan Global harus unik. Temuan harus masih `open`, dapat diakses oleh team user login, memiliki client yang sama, dan berada pada SPK yang sama. |
| `details` | `required`, `array`, `min:1` | Detail Daily Progress wajib dikirim. |
| `details.*.id` | `required`, `integer` | ID detail Daily Progress. |
| `details.*.status` | `required`, `in:open,pending,batal,selesai` | Status detail. |
| `details.*.catatan` | `nullable`, `string` | Wajib jika status `pending`. |

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Daily Progress berhasil diperbarui.",
  "data": {
    "id": 1,
    "nomor": "DP-20260814-001",
    "tanggal": "2026-08-14",
    "client_code": "CLIENT-001",
    "no_spk": "SPK-001-REV",
    "bulan": 8,
    "tahun": 2026,
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [
      {
        "id": 100,
        "status": "pending",
        "catatan": "Menunggu konfirmasi client"
      }
    ],
    "findings": [
      {
        "id": 900,
        "progress_report_id": 50,
        "nomor_pr": "PR-20260813-001",
        "tanggal": "2026-08-13",
        "source_type": "master",
        "keterangan": "Dokumen pendukung belum lengkap",
        "status": "open"
      }
    ],
    "temuans": [
      {
        "id": 901,
        "nomor": "TM-20260827-001",
        "tanggal": "2026-08-27",
        "status": "open",
        "notes": [
          {
            "id": 910,
            "task": {
              "id": 20,
              "task_name": "Persiapan lahan"
            },
            "note": "Area kerja perlu dibersihkan ulang."
          }
        ]
      }
    ],
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T03:00:00.000000Z"
  }
}
```

### Response Gagal

User bukan pembuat Daily Progress:

Status: `403 Forbidden`

```json
{
  "status": false,
  "message": "Daily Progress hanya dapat diubah oleh pembuatnya."
}
```

Detail tidak ditemukan pada Daily Progress tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Detail Daily Progress ID 100 tidak ditemukan pada DP ini."
}
```

Temuan tidak valid, bukan milik user login, berbeda SPK/client, atau sudah tidak open:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Terdapat Temuan yang tidak valid, bukan milik Anda, berbeda SPK, atau sudah selesai."
}
```

Temuan Global tidak valid, berbeda SPK/client, tidak dapat diakses oleh team user login, atau sudah tidak open:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Terdapat Temuan yang tidak valid, berbeda SPK, tidak dapat diakses oleh team Anda, atau sudah selesai."
}
```

## DELETE /api/daily-progress/{dailyProgress}

Endpoint untuk menghapus Daily Progress berdasarkan ID.

### Aturan Delete

1. Daily Progress hanya dapat dihapus oleh pembuatnya.
2. Jika berhasil, detail akan ikut terhapus karena relasi database memakai cascade delete.

### Request

```http
DELETE /api/daily-progress/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Daily Progress berhasil dihapus."
}
```

## DELETE /api/daily-progress/{dailyProgress}/details/{detail}

Endpoint untuk menghapus satu detail Daily Progress.

### Aturan Delete Detail

1. Daily Progress hanya dapat diubah oleh pembuatnya.
2. Detail harus berasal dari Daily Progress yang ada di URL.

### Request

```http
DELETE /api/daily-progress/1/details/100
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Detail Daily Progress berhasil dihapus.",
  "data": {
    "id": 1,
    "nomor": "DP-20260814-001",
    "tanggal": "2026-08-14",
    "client_code": "CLIENT-001",
    "no_spk": "SPK-001",
    "bulan": 8,
    "tahun": 2026,
    "created_by": "EMP001",
    "created_by_level": 3,
    "details": [],
    "findings": [],
    "temuans": [],
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T02:00:00.000000Z"
  }
}
```

### Response Gagal

Detail tidak ditemukan:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Detail Daily Progress tidak ditemukan."
}
```

## POST /api/daily-progress/{dailyProgress}/details/{detail}/documents

Endpoint untuk upload satu atau beberapa dokumen ke satu detail Daily Progress.

Dokumen terkait ke `DailyProgressDetail`, bukan ke header Daily Progress.
Payload `POST /api/daily-progress` dan `PUT /api/daily-progress/{dailyProgress}` tidak menerima file dokumen. Jika catatan penyelesaian membutuhkan lampiran, simpan/update detail terlebih dahulu, lalu upload dokumen ke endpoint ini menggunakan ID detail tersebut.

### Aturan Upload Dokumen

1. Daily Progress harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Detail harus berasal dari Daily Progress yang ada di URL.
3. File disimpan menggunakan Laravel Storage.
4. Database hanya menyimpan path dan metadata file.
5. Request menggunakan `multipart/form-data`.

### Request

```http
POST /api/daily-progress/1/details/100/documents
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

Form data:

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `documents[]` | file[] | Ya | Satu atau beberapa file dokumen. Maksimal 10 MB per file. Untuk kebutuhan satu dokumen per catatan, kirim satu file saja pada array ini. |

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Dokumen Daily Progress berhasil diupload.",
  "data": [
    {
      "id": 500,
      "als_daily_progress_detail_id": 100,
      "path": "daily-progress/1/details/100/documents/example.pdf",
      "original_name": "example.pdf",
      "mime_type": "application/pdf",
      "size": 204800,
      "created_at": "2026-08-14T02:05:00.000000Z",
      "updated_at": "2026-08-14T02:05:00.000000Z"
    }
  ]
}
```

### Response Gagal

Daily Progress bukan milik user login:

Status: `403 Forbidden`

```json
{
  "status": false,
  "message": "Daily Progress bukan milik user yang sedang login."
}
```

Detail tidak ditemukan pada Daily Progress tersebut:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Detail Daily Progress tidak ditemukan pada Daily Progress ini."
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

## DELETE /api/daily-progress/{dailyProgress}/details/{detail}/documents/{document}

Endpoint untuk menghapus satu dokumen dari detail Daily Progress.

### Aturan Delete Dokumen

1. Daily Progress harus milik user yang sedang login berdasarkan `auth_employee.employee_code`.
2. Detail harus berasal dari Daily Progress yang ada di URL.
3. Dokumen harus berasal dari detail yang ada di URL.
4. Row dokumen dihapus dari database.
5. File fisik juga dihapus dari storage.

### Request

```http
DELETE /api/daily-progress/1/details/100/documents/500
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Dokumen Daily Progress berhasil dihapus."
}
```

### Response Gagal

Dokumen tidak ditemukan:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Dokumen Daily Progress tidak ditemukan."
}
```

File gagal dihapus dari storage:

Status: `500 Internal Server Error`

```json
{
  "status": false,
  "message": "File dokumen gagal dihapus dari storage."
}
```

## Response Error Middleware

Karena endpoint ini memakai `progress.auth`, response error token sama seperti dokumentasi authentication.

Token tidak dikirim:

Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Token tidak ditemukan."
}
```

Tenant tidak dapat ditentukan karena data karyawan tidak memiliki `asal_pt`:

Status: `403 Forbidden`

```json
{
  "success": false,
  "message": "Asal PT tidak ditemukan."
}
```

PT dari token tidak terdaftar pada konfigurasi tenant:

Status: `403 Forbidden`

```json
{
  "success": false,
  "message": "PT tidak terdaftar pada Progress Report."
}
```

## Contoh cURL

Ambil data form Daily Progress:

```bash
curl -X GET "http://localhost:8000/api/daily-progress/form-data?client_code=CLIENT-001&bulan=8&tahun=2026" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Ambil daftar Daily Progress:

```bash
curl -X GET "http://localhost:8000/api/daily-progress?bulan=8&tahun=2026" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Buat Daily Progress:

```bash
curl -X POST "http://localhost:8000/api/daily-progress" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"tanggal":"2026-08-14","client_code":"CLIENT-001","als_spk_id":1,"bulan":8,"tahun":2026,"finding_ids Sheryl":[900],"temuan_ids":[901],"details":[{"als_job_id":1,"als_job_task_id":11,"status":"open","catatan":null}]}'
```

Ambil pending:

```bash
curl -X GET "http://localhost:8000/api/daily-progress/pending?client_code=CLIENT-001" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Edit Daily Progress (koreksi form/pilihan DP):

```bash
curl -X PUT "http://localhost:8000/api/daily-progress/1/edit" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"tanggal":"2026-08-14","client_code":"CLIENT-001","als_spk_id":1,"bulan":8,"tahun":2026,"finding_ids":[900],"temuan_ids":[901],"details":[{"id":100,"als_job_id":1,"als_job_task_id":11,"status":"open","catatan":null}]}'
```

Update Daily Progress (status & catatan penyelesaian):

```bash
curl -X PUT "http://localhost:8000/api/daily-progress/1" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"no_spk":"SPK-001-REV","finding_ids":[900],"temuan_ids":[901],"details":[{"id":100,"status":"pending","catatan":"Menunggu konfirmasi client"}]}'
```

Hapus detail:

```bash
curl -X DELETE "http://localhost:8000/api/daily-progress/1/details/100" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Upload dokumen detail:

```bash
curl -X POST "http://localhost:8000/api/daily-progress/1/details/100/documents" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "documents[]=@/path/to/example.pdf"
```

Hapus dokumen detail:

```bash
curl -X DELETE "http://localhost:8000/api/daily-progress/1/details/100/documents/500" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Hapus Daily Progress:

```bash
curl -X DELETE "http://localhost:8000/api/daily-progress/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```
