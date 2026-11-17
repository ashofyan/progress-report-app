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
9. Response pending tidak lagi mengembalikan `bulan` dan `tahun` di dalam `daily_progress`.
10. Endpoint pending sekarang mengambil semua detail berstatus `pending` milik user login berdasarkan client, tanpa filter "belum memiliki kelanjutan" di service.
11. Endpoint `POST /api/daily-progress/resolve` tetap tidak tersedia pada route terbaru.
12. Response Daily Progress sekarang dapat mengembalikan top-level `findings` ketika relasi findings di-load. Field ini berisi daftar temuan Progress Report yang ditautkan ke Daily Progress.
13. `POST /api/daily-progress` dan `PUT /api/daily-progress/{dailyProgress}` menerima `finding_ids` opsional untuk menautkan atau melepas temuan Progress Report yang masih open.
14. `POST /api/daily-progress` dan `PUT /api/daily-progress/{dailyProgress}` menerima `temuans` atau `temuan_ids` opsional untuk menautkan dan menindaklanjuti Temuan Global (status `open` atau `pending`).
15. Response Daily Progress sekarang mengembalikan top-level `temuans` lengkap dengan unifikasi: `type` (`TM` / `PR`), `priority` (1-5), `no_pr`, `dp_followup` (`status`: `pending`/`selesai`, `alasan_pending`, `solusi`), serta informasi `notes` dengan `task_category` (`master`/`tambahan`/`custom`).
16. Tindak lanjut temuan di Daily Progress: Jika dikirim object dengan `status: "selesai"` dan `solusi`, sistem otomatis menutup temuan dan mencatat entri solusi dengan `source: "daily_progress"`. Jika dikirim `status: "pending"` dan `alasan_pending`, temuan tetap pending agar dilanjutkan pada DP berikutnya.
17. Tersedia endpoint baru `PUT /api/daily-progress/{dailyProgress}/edit` untuk koreksi/edit total form Daily Progress (pemilihan SPK, tanggal, bulan, tahun, daftar task/detail pekerjaan, finding, dan temuan).
18. **Proteksi Task Selesai**: Task/detail yang sudah berstatus `selesai` dikunci permanen: tidak dapat diubah status/isinya, tidak dapat dihapus (baik melalui delete detail, delete DP, maupun melalui payload edit), dan header DP tidak dapat diubah jika memiliki task yang sudah selesai.
19. **Batasan Hari Edit DP**: Daily Progress hanya dapat diubah pada hari yang sama. Jika sudah berbeda hari, Daily Progress tidak dapat diedit.
20. **Daily Progress Khusus Temuan**: Daily Progress kini dapat disimpan/diperbarui meskipun user **hanya menyelesaikan/menindaklanjuti temuan** (`temuans`, `temuan_ids`, atau `finding_ids`) tanpa memilih task pekerjaan (`details: []` atau dihilangkan). Minimal salah satu antara `details` atau temuan wajib diisi.
21. **Tracking & Proteksi Penggunaan di Progress Report (`is_used_in_progress_report` & `progress_reports`)**:
    - Response Daily Progress (baik header maupun tiap task detail) sekarang menyertakan flag boolean `is_used_in_progress_report`.
    - Jika Daily Progress sudah pernah digunakan/diserap ke dalam Progress Report (`is_used_in_progress_report: true`), response menyertakan array **`progress_reports`** yang berisi rincian Progress Report terkait (`id`, `nomor`, `tanggal`).
    - Jika Daily Progress sudah masuk Progress Report, sistem **mengunci total** DP tersebut: tidak dapat diubah melalui `PUT /api/daily-progress/{id}/edit`, tidak dapat di-update status melalui `PUT /api/daily-progress/{id}`, tidak dapat dihapus (`DELETE`), detail task tidak dapat dihapus (`DELETE details/{detail}`), dan dokumen pendukung tidak dapat ditambah/dihapus.
22. **View Detail Daily Progress Tim (`GET /api/daily-progress/{id_or_nomor}`)**:
    - Endpoint detail `GET /api/daily-progress/{dailyProgress}` sekarang mendukung pencarian menggunakan **ID** (contoh: `/api/daily-progress/45`) maupun **Nomor DP** (contoh: `/api/daily-progress/DP-2026/11/0002`).
    - Hal ini memudahkan implementasi **direct link** dari fitur Timeline (yang menampilkan `nomor` dan `reference_id`) langsung ke halaman detail Daily Progress.
    - Dapat diakses oleh **seluruh anggota tim SPK** yang terdaftar aktif pada SPK yang sama (bukan hanya pembuatnya saja).
    - Response menyertakan field `created_by_name` (nama pembuat DP) dan `is_used_in_progress_report`.
23. **Auto-Selected SPK Forwarding Support (`als_spk_id` & `spk_id`)**:
    - Response Daily Progress (baik list maupun detail) sekarang menyertakan `als_spk_id` dan `spk_id` di top-level header.
    - Hal ini mempermudah frontend saat melakukan redirect/forward ke halaman pembuatan Progress Report (`/progress-report/create`) agar dapat langsung mem-passing ID SPK tanpa harus mencocokkan string `no_spk`.

```php
Route::prefix('daily-progress')->group(function () {
    Route::get('/form-data', DailyProgressFormController::class);
    Route::get('/', [DailyProgressController::class, 'index']);
    Route::post('/', [DailyProgressController::class, 'store']);
    Route::get('/pending', [DailyProgressController::class, 'pending']);
    Route::get('/{dailyProgress}', [DailyProgressController::class, 'show'])
        ->where('dailyProgress', '.*');
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

Semua endpoint berada di bawah prefix `/api/daily-progress`.

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
| `selesai` | Task selesai (terkunci, tidak dapat diubah/dihapus lagi). |

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
          "url": "http://localhost:8000/storage/daily-progress/1/details/100/documents/example.pdf",
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
      "type": "PR",
      "priority": 4,
      "no_pr": "PR-20260813-001",
      "tanggal": "2026-08-27",
      "status": "pending",
      "dp_followup": {
        "status": "pending",
        "alasan_pending": "Menunggu komponen pengganti tiba besok",
        "solusi": null
      },
      "notes": [
        {
          "id": 910,
          "source_type": "master",
          "task_category": "master",
          "task": {
            "id": 20,
            "task_name": "Persiapan lahan",
            "category": "master"
          },
          "note": "Area kerja perlu dibersihkan ulang."
        }
      ],
      "files": []
    }
  ],
  "created_at": "2026-08-14T02:00:00.000000Z",
  "updated_at": "2026-08-14T02:00:00.000000Z"
}
```

Field `findings` hanya muncul pada response yang memuat relasi `findings`. Setiap item berasal dari temuan Progress Report yang ditautkan ke Daily Progress melalui `finding_ids`.

Field `temuans` hanya muncul pada response yang memuat relasi `temuans`. Setiap item berasal dari Temuan Global endpoint `/api/temuan` yang ditautkan ke Daily Progress melalui `temuan_ids` atau `temuans`. Field `dp_followup` memuat status penanganan temuan khusus pada Daily Progress bersangkutan (`status`: `pending`/`selesai`, `alasan_pending`, `solusi`).

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
          ],
          "additional_tasks": [
            {
              "parent_id": 10,
              "parent_task": "Persiapan lahan",
              "children": [
                {
                  "id": 100,
                  "task_name": "Pembersihan saluran khusus",
                  "parent_id": 10,
                  "status": "open",
                  "last_progress_report": null,
                  "history": []
                }
              ]
            }
          ]
        },
        "additional_tasks": [
          {
            "parent_id": 10,
            "parent_task": "Persiapan lahan",
            "children": [
              {
                "id": 100,
                "task_name": "Pembersihan saluran khusus",
                "parent_id": 10,
                "status": "open",
                "last_progress_report": null,
                "history": []
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Jika `kode_product_jasa` pada SPK belum ada di master `als_jobs`, field `job` akan bernilai `null`.

Task utama/parent pada `spks[].job.tasks[]` atau `spks[].job.additional_tasks[]` digunakan sebagai grouping. Task yang dapat dipilih untuk `POST /api/daily-progress` adalah:
- Master child task: dikirim via field `als_job_task_id` dengan nilai `spks[].job.tasks[].children[].id`.
- Additional / Custom task: dikirim via field `als_task_additional_detail_id` dengan nilai `spks[].job.additional_tasks[].children[].id`.

Field `last_progress_report` berisi Progress Report terbaru task tersebut pada SPK yang sama. Nilainya `null` jika task belum pernah masuk Progress Report.

Field `history` berisi semua histori Progress Report task tersebut pada SPK yang sama. Setiap item histori menyertakan `progress_report_detail_id`, `progress_report_id`, `nomor`, `tanggal`, `status`, dan array `notes`.

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

Body hanya menyelesaikan Temuan (tanpa detail pekerjaan):

```json
{
  "tanggal": "2026-08-14",
  "client_code": "CLIENT-001",
  "als_spk_id": 1,
  "bulan": 8,
  "tahun": 2026,
  "temuans": [
    {
      "id": 901,
      "status": "selesai",
      "solusi": "Penggantian kran valve yang bocor telah selesai dilakukan."
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
| `temuans` / `temuan_ids` | `nullable`, `array` | Opsional. Daftar Temuan Global dari `/api/temuan` (status `open` atau `pending`) pada SPK yang sama. Mendukung 2 format: **Array ID sederhana** `[901, 902]` (default status `pending`), atau **Array Object Tindak Lanjut** `[{"id": 901, "status": "selesai", "solusi": "Perbaikan baut"}, {"id": 902, "status": "pending", "alasan_pending": "Menunggu part"}]`. |
| `temuans.*.id` | `nullable`, `integer` | ID temuan. |
| `temuans.*.status` | `nullable`, `in:pending,selesai` | Status penanganan temuan pada DP ini. Jika `selesai`, temuan langsung ditutup dan dicatat ke Solusi (`source: 'daily_progress'`). |
| `temuans.*.alasan_pending` | `nullable`, `string` | Alasan jika temuan belum tuntas dan berstatus pending. |
| `temuans.*.solusi` | `nullable`, `string` | Uraian solusi jika temuan dinyatakan selesai pada DP ini. |
| `details` | `nullable`, `array` | Opsional jika temuan disertakan. Minimal satu pekerjaan atau temuan (`details`, `temuans`, `temuan_ids`, atau `finding_ids`) harus diisi. |
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
2. Daily Progress hanya dapat diubah pada hari yang sama. Jika sudah berbeda hari (`tanggal` atau `created_at` berbeda dari hari ini), request edit akan ditolak. Tanggal Daily Progress juga tidak dapat diubah ke hari yang berbeda dari hari ini.
3. Header Daily Progress (client_code, als_spk_id, bulan, tahun) dapat diperbarui selama belum ada task yang berstatus selesai.
4. **Proteksi Task Selesai**:
   - Jika Daily Progress memiliki task/detail yang sudah berstatus `selesai`, header Daily Progress tidak dapat diubah.
   - Detail task yang sudah berstatus `selesai` tidak dapat diubah status maupun field isiannya.
   - Detail task yang sudah berstatus `selesai` tidak dapat dihapus.
5. User login harus terdaftar pada team SPK terpilih (`als_spk_id`).
6. Detail pekerjaan (`details`) disinkronkan:
   - Jika `details.*.id` dikirim dan ada pada DP tersebut, detail tersebut akan diupdate (`als_job_id`, task, status, catatan) asalkan belum berstatus `selesai`.
   - Jika `details.*.id` kosong/baru, detail baru akan dibuat.
   - Detail yang tidak lagi disertakan dalam request akan dihapus (jika detail belum masuk ke Progress Report dan belum berstatus `selesai`).
7. Jika detail lama yang dihapus sudah pernah masuk ke `AlsProgressReportDetail`, request akan ditolak untuk menjaga integritas relasi.
8. Relasi `finding_ids` dan `temuan_ids` akan disinkronkan. Kirim `[]` untuk mengosongkan relasi temuan.

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

Task sudah selesai dan dicoba diubah:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Detail ID 100 sudah berstatus selesai dan tidak dapat diubah."
}
```

Header diubah padahal memiliki task selesai:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Header Daily Progress tidak dapat diubah karena memiliki task yang sudah berstatus selesai."
}
```

Sudah berbeda hari:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Daily Progress tidak dapat diubah karena sudah berbeda hari."
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
3. Detail task yang sudah berstatus `selesai` dikunci dan tidak dapat diubah lagi.
4. Update hanya mengubah `no_spk`, `status`, `catatan`, relasi temuan jika `finding_ids` dikirim, dan relasi Temuan Global jika `temuan_ids` dikirim.
5. Jika status detail diubah menjadi `pending`, `catatan` wajib diisi.
6. Jika `finding_ids` dikirim, daftar temuan yang tertaut akan disinkronkan sesuai isi array. Kirim `[]` untuk melepas semua temuan dari Daily Progress tersebut.
7. Temuan yang boleh ditautkan harus masih `open`, milik user login, memiliki client yang sama, dan berada pada SPK yang sama.
8. Jika `temuan_ids` dikirim, daftar Temuan Global yang tertaut akan disinkronkan sesuai isi array. Kirim `[]` untuk melepas semua Temuan Global dari Daily Progress tersebut.
9. Temuan Global yang boleh ditautkan harus masih `open`, dapat diakses oleh team user login, memiliki client yang sama, dan berada pada SPK yang sama.

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

Detail sudah berstatus selesai:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Detail Daily Progress ID 100 sudah berstatus selesai dan tidak dapat diubah."
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
2. Daily Progress yang memiliki task dengan status `selesai` tidak dapat dihapus.
3. Jika berhasil, detail akan ikut terhapus karena relasi database memakai cascade delete.

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

### Response Gagal

Daily Progress memiliki task yang sudah selesai:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Daily Progress tidak dapat dihapus karena memiliki task yang sudah berstatus selesai."
}
```

## DELETE /api/daily-progress/{dailyProgress}/details/{detail}

Endpoint untuk menghapus satu detail Daily Progress.

### Aturan Delete Detail

1. Daily Progress hanya dapat diubah oleh pembuatnya.
2. Detail harus berasal dari Daily Progress yang ada di URL.
3. Detail yang sudah berstatus `selesai` tidak dapat dihapus.

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

Detail sudah berstatus selesai:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Detail Daily Progress yang sudah berstatus selesai tidak dapat dihapus."
}
```

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
      "url": "http://localhost:8000/storage/daily-progress/1/details/100/documents/example.pdf",
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
  -d '{"tanggal":"2026-08-14","client_code":"CLIENT-001","als_spk_id":1,"bulan":8,"tahun":2026,"finding_ids":[900],"temuan_ids":[901],"details":[{"als_job_id":1,"als_job_task_id":11,"status":"open","catatan":null}]}'
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

---

## 11. Monitoring Daily Progress Team (Read-Only)

Digunakan untuk melihat dan memonitor seluruh Daily Progress dari semua rekan tim yang terdaftar pada SPK yang sama secara **read-only**.

### Endpoint

- **Method**: `GET`
- **URL**: `/api/daily-progress/team`
- **Auth**: Bearer Token (`progress.auth`, `tenant.database`)

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_code` | string | **Ya** | Kode klien (contoh: `YSSI`, `LUBE`) |
| `als_spk_id` | integer | **Ya** | ID SPK (user login harus terdaftar di SPK ini) |
| `tanggal` | date (Y-m-d) | Tidak | Filter tanggal tertentu (contoh: `2026-09-30`) |
| `bulan` | integer (1-12) | Tidak | Filter periode bulan |
| `tahun` | integer (4 digit) | Tidak | Filter periode tahun |
| `employee_code` | string | Tidak | Filter data hanya untuk anggota tim tertentu |

### Contoh Request

```bash
curl -X GET "http://localhost:8000/api/daily-progress/team?client_code=YSSI&als_spk_id=1325&tanggal=2026-09-30" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

### Format Response Sukses (200 OK)

```json
{
  "status": true,
  "message": "Monitoring Daily Progress Team berhasil diambil.",
  "data": {
    "spk": {
      "id": 1325,
      "no_spk": "SPK-2026/09/YSSI/001",
      "source_pt": "ALS",
      "kode_product_jasa": "JASA-01",
      "job": {
        "id": 10,
        "job_code": "JOB-01",
        "description": "Perawatan Rutin"
      },
      "teams": [
        {
          "kode_employee": "EMP01",
          "name_employee": "Budi Santoso",
          "tingkat": 3
        },
        {
          "kode_employee": "EMP02",
          "name_employee": "Ahmad Dani",
          "tingkat": 2
        }
      ]
    },
    "summary": {
      "total_daily_progress": 2,
      "total_task": 5,
      "total_task_selesai": 4,
      "total_task_pending": 1,
      "total_employee": 2
    },
    "items": [
      {
        "id": 55,
        "nomor": "DP-20260930-001",
        "tanggal": "2026-09-30",
        "client_code": "YSSI",
        "als_spk_id": 1325,
        "no_spk": "SPK-2026/09/YSSI/001",
        "bulan": 9,
        "tahun": 2026,
        "created_by": "EMP02",
        "created_by_name": "Ahmad Dani",
        "created_by_level": 2,
        "details": [
          {
            "id": 101,
            "status": "selesai",
            "catatan": null,
            "job": { "id": 10, "job_code": "JOB-01" },
            "job_task": { "id": 15, "task_name": "Pemeriksaan Panel" }
          }
        ]
      }
    ]
  }
}
```

> **Catatan Keamanan:**
> Rekan satu SPK dapat melihat detail DP secara read-only (`GET /api/daily-progress/{id}`), namun aksi manipulasi (Edit, Update status, Delete, Delete Detail, Dokumen) tetap dibatasi hanya dapat dilakukan oleh pemilik data asli (`created_by`).
