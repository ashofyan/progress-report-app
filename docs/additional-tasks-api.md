# Dokumentasi API Additional Task

Dokumen ini menjelaskan endpoint Additional Task yang terdaftar pada `routes/api.php`.

```php
Route::prefix('additional-tasks')->group(function () {
    Route::get('/', [AdditionalTaskController::class, 'index']);
    Route::post('/', [AdditionalTaskController::class, 'store']);
    Route::get('/{additionalTask}', [AdditionalTaskController::class, 'show']);
    Route::put('/{additionalTask}', [AdditionalTaskController::class, 'update']);
    Route::delete('/{additionalTask}', [AdditionalTaskController::class, 'destroy']);
});
```

## Ringkasan

Semua endpoint berada di bawah prefix `/api/additional-tasks`.

Endpoint Additional Task berada di dalam middleware:

```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    // additional-tasks
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
| `GET` | `/api/additional-tasks` | Mengambil daftar task tambahan. |
| `POST` | `/api/additional-tasks` | Membuat task tambahan baru. |
| `GET` | `/api/additional-tasks/{additionalTask}` | Mengambil detail task tambahan berdasarkan ID. |
| `PUT` | `/api/additional-tasks/{additionalTask}` | Memperbarui task tambahan berdasarkan ID. |
| `DELETE` | `/api/additional-tasks/{additionalTask}` | Menghapus task tambahan berdasarkan ID. |

## Struktur Data

Additional task disimpan pada tabel tenant `als_task_additionals`.
Detail task tambahan disimpan pada tabel tenant `als_task_additional_details`.

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | integer | Primary key additional task. |
| `nomor` | string | Nomor additional task yang dibuat otomatis dengan format `AT-YYYYMMDD-0001` (tambahan) atau `CP-YYYYMMDD-0001` (custom). |
| `client_code` | string | Kode client, maksimal 100 karakter. |
| `als_spk_id` | integer | ID SPK terkait. |
| `type` | string | Tipe task: `'tambahan'` (default) atau `'custom'`. |
| `priority` | integer | Skala prioritas 1-5 (1: Sangat Rendah, 3: Sedang, 5: Kritis). Default: `3`. |
| `job` | object | Master pekerjaan yang terhubung. |
| `details` | array | Daftar detail task tambahan yang dikelompokkan berdasarkan parent task. |
| `created_by` | string | Employee code pembuat data, diambil dari token. |
| `created_at` | datetime | Waktu data dibuat. |
| `updated_at` | datetime | Waktu data diperbarui. |

Field `details.*.parent_id` harus mengarah ke task utama dari master pekerjaan terkait, yaitu record `als_job_tasks` dengan `parent_id = null`.

Status task tambahan yang valid:

| Status | Keterangan |
| --- | --- |
| `open` | Status default saat task dibuat. |
| `pending` | Task sedang tertunda. |
| `batal` | Task dibatalkan. |
| `selesai` | Task selesai. |

## Format Response Additional Task

```json
{
  "id": 1,
  "nomor": "AT-20260814-0001",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "type": "tambahan",
  "priority": 3,
  "job": {
    "id": 1,
    "job_code": "JOB-001",
    "description": "Pekerjaan harian kebun"
  },
  "details": [
    {
      "parent_id": 10,
      "parent_task": "Persiapan lahan",
      "tasks": [
        {
          "id": 100,
          "task_name": "Cek ulang area",
          "status": "open"
        }
      ]
    }
  ],
  "created_by": "EMP001",
  "created_at": "2026-08-14T02:00:00.000000Z",
  "updated_at": "2026-08-14T02:00:00.000000Z"
}
```

## GET /api/additional-tasks

Endpoint untuk mengambil daftar task tambahan pada tenant aktif.

Data diurutkan dari ID terbaru.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter berdasarkan kode client. |
| `job_id` | integer | Tidak | Filter berdasarkan ID master pekerjaan. |
| `als_spk_id` | integer | Tidak | Filter berdasarkan ID SPK. |
| `type` | string | Tidak | Filter berdasarkan tipe: `tambahan` atau `custom`. |
| `priority` | integer | Tidak | Filter berdasarkan skala prioritas: `1` sampai `5`. |

### Request

```http
GET /api/additional-tasks?client_code=CLIENT-001&job_id=1&priority=3
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "message": "Data task tambahan berhasil diambil.",
  "data": [
    {
      "id": 1,
      "nomor": "AT-20260814-0001",
      "client_code": "CLIENT-001",
      "job": {
        "id": 1,
        "job_code": "JOB-001",
        "description": "Pekerjaan harian kebun"
      },
      "details": [
        {
          "parent_id": 10,
          "parent_task": "Persiapan lahan",
          "tasks": [
            {
              "id": 100,
              "task_name": "Cek ulang area",
              "status": "open"
            }
          ]
        }
      ],
      "created_by": "EMP001",
      "created_at": "2026-08-14T02:00:00.000000Z",
      "updated_at": "2026-08-14T02:00:00.000000Z"
    }
  ]
}
```

## POST /api/additional-tasks

Endpoint untuk membuat task tambahan baru.

Nomor additional task dibuat otomatis oleh sistem. Field `created_by` diambil dari `employee_code` pada token.

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
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "job_id": 1,
  "type": "tambahan",
  "priority": 4,
  "details": [
    {
      "parent_id": 10,
      "tasks": [
        {
          "task_name": "Cek ulang area"
        },
        {
          "task_name": "Foto hasil pekerjaan"
        }
      ]
    },
    {
      "parent_id": 20,
      "tasks": [
        {
          "task_name": "Konfirmasi dengan mandor"
        }
      ]
    }
  ]
}
```

### Validasi

| Field | Rule | Keterangan |
| --- | --- | --- |
| `client_code` | `required`, `string`, `max:100` | Kode client wajib diisi. |
| `als_spk_id` | `required`, `integer` | ID SPK wajib diisi. |
| `job_id` | `required`, `integer` | ID master pekerjaan wajib diisi. |
| `type` | `nullable`, `string`, `in:custom,tambahan` | Tipe pekerjaan: `'tambahan'` (default) atau `'custom'`. |
| `priority` | `nullable`, `integer`, `between:1,5` | Skala prioritas pekerjaan (1-5). Default: `3`. |
| `details` | `required`, `array`, `min:1` | Minimal terdapat satu parent task. |
| `details.*` | `required`, `array:parent_id,tasks` | Setiap detail hanya menerima field `parent_id` dan `tasks`. |
| `details.*.parent_id` | `required`, `integer`, `distinct` | Parent task wajib diisi dan tidak boleh duplikat. |
| `details.*.tasks` | `required`, `array`, `min:1` | Minimal terdapat satu task tambahan pada setiap parent. |
| `details.*.tasks.*` | `required`, `array:task_name` | Setiap task hanya menerima field `task_name`. |
| `details.*.tasks.*.task_name` | `required`, `string`, `max:256` | Nama task tambahan wajib diisi. |

### Response Berhasil

Status: `201 Created`

```json
{
  "success": true,
  "message": "Task tambahan berhasil dibuat.",
  "data": {
    "id": 1,
    "nomor": "AT-20260814-0001",
    "client_code": "CLIENT-001",
    "als_spk_id": 10,
    "type": "tambahan",
    "priority": 4,
    "job": {
      "id": 1,
      "job_code": "JOB-001",
      "description": "Pekerjaan harian kebun"
    },
    "details": [
      {
        "parent_id": 10,
        "parent_task": "Persiapan lahan",
        "tasks": [
          {
            "id": 100,
            "task_name": "Cek ulang area",
            "status": "open"
          },
          {
            "id": 101,
            "task_name": "Foto hasil pekerjaan",
            "status": "open"
          }
        ]
      }
    ],
    "created_by": "EMP001",
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T02:00:00.000000Z"
  }
}
```

### Response Gagal

Pekerjaan tidak ditemukan:

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "message": "Pekerjaan tidak ditemukan.",
  "data": null
}
```

Parent task tidak valid untuk pekerjaan yang dipilih:

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "message": "Parent task tidak valid untuk pekerjaan ini: 10",
  "data": null
}
```

Employee code tidak ada pada token:

Status: `401 Unauthorized`

```json
{
  "success": false,
  "message": "Employee code tidak ditemukan.",
  "data": null
}
```

## GET /api/additional-tasks/{additionalTask}

Endpoint untuk mengambil detail task tambahan berdasarkan ID.

### Request

```http
GET /api/additional-tasks/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "message": "Detail task tambahan berhasil diambil.",
  "data": {
    "id": 1,
    "nomor": "AT-20260814-0001",
    "client_code": "CLIENT-001",
    "job": {
      "id": 1,
      "job_code": "JOB-001",
      "description": "Pekerjaan harian kebun"
    },
    "details": [
      {
        "parent_id": 10,
        "parent_task": "Persiapan lahan",
        "tasks": [
          {
            "id": 100,
            "task_name": "Cek ulang area",
            "status": "open"
          }
        ]
      }
    ],
    "created_by": "EMP001",
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T02:00:00.000000Z"
  }
}
```

### Response Gagal

Status: `404 Not Found`

```json
{
  "success": false,
  "message": "Task tambahan tidak ditemukan.",
  "data": null
}
```

## PUT /api/additional-tasks/{additionalTask}

Endpoint untuk memperbarui task tambahan berdasarkan ID.

Saat update, field `details` wajib dikirim. Sistem akan melakukan sinkronisasi detail:

1. Detail task dengan `id` yang valid akan diperbarui.
2. Detail task tanpa `id` akan dibuat sebagai detail baru.
3. Detail task lama yang tidak dikirim lagi akan dihapus.
4. Status yang tidak dikirim akan mempertahankan status lama untuk detail yang sudah ada.
5. Status yang tidak dikirim pada detail baru akan menggunakan `open`.

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
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "job_id": 1,
  "type": "tambahan",
  "priority": 4,
  "details": [
    {
      "parent_id": 10,
      "tasks": [
        {
          "id": 100,
          "task_name": "Cek ulang area blok",
          "status": "pending"
        },
        {
          "task_name": "Validasi hasil pekerjaan",
          "status": "open"
        }
      ]
    }
  ]
}
```

### Validasi

| Field | Rule | Keterangan |
| --- | --- | --- |
| `client_code` | `required`, `string`, `max:100` | Kode client wajib diisi. |
| `als_spk_id` | `nullable`, `integer` | ID SPK terkait. |
| `job_id` | `required`, `integer` | ID master pekerjaan wajib diisi. |
| `type` | `nullable`, `string`, `in:custom,tambahan` | Tipe pekerjaan: `'tambahan'` atau `'custom'`. |
| `priority` | `sometimes`, `nullable`, `integer`, `between:1,5` | Skala prioritas pekerjaan (1-5). |
| `details` | `required`, `array`, `min:1` | Minimal terdapat satu parent task. |
| `details.*` | `required`, `array:parent_id,tasks` | Setiap detail hanya menerima field `parent_id` dan `tasks`. |
| `details.*.parent_id` | `required`, `integer`, `distinct` | Parent task wajib diisi dan tidak boleh duplikat. |
| `details.*.tasks` | `required`, `array`, `min:1` | Minimal terdapat satu task tambahan pada setiap parent. |
| `details.*.tasks.*` | `required`, `array:id,task_name,status` | Setiap task hanya menerima field `id`, `task_name`, dan `status`. |
| `details.*.tasks.*.id` | `nullable`, `integer` | ID detail task tambahan yang sudah ada. |
| `details.*.tasks.*.task_name` | `required`, `string`, `max:256` | Nama task tambahan wajib diisi. |
| `details.*.tasks.*.status` | `nullable`, `string`, `in:open,pending,batal,selesai` | Status task tambahan. |

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "message": "Task tambahan berhasil diperbarui.",
  "data": {
    "id": 1,
    "nomor": "AT-20260814-0001",
    "client_code": "CLIENT-001",
    "als_spk_id": 10,
    "type": "tambahan",
    "priority": 4,
    "job": {
      "id": 1,
      "job_code": "JOB-001",
      "description": "Pekerjaan harian kebun"
    },
    "details": [
      {
        "parent_id": 10,
        "parent_task": "Persiapan lahan",
        "tasks": [
          {
            "id": 100,
            "task_name": "Cek ulang area blok",
            "status": "pending"
          },
          {
            "id": 102,
            "task_name": "Validasi hasil pekerjaan",
            "status": "open"
          }
        ]
      }
    ],
    "created_by": "EMP001",
    "created_at": "2026-08-14T02:00:00.000000Z",
    "updated_at": "2026-08-14T03:00:00.000000Z"
  }
}
```

### Response Gagal

Detail task tidak ditemukan pada additional task terkait:

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "message": "Detail task ID 100 tidak ditemukan.",
  "data": null
}
```

Status tidak valid:

Status: `422 Unprocessable Entity`

```json
{
  "message": "Status task tidak valid.",
  "errors": {
    "details.0.tasks.0.status": [
      "Status task tidak valid."
    ]
  }
}
```

## DELETE /api/additional-tasks/{additionalTask}

Endpoint untuk menghapus task tambahan berdasarkan ID.

Saat additional task dihapus, sistem juga menghapus semua detail milik additional task tersebut.

### Request

```http
DELETE /api/additional-tasks/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "message": "Task tambahan berhasil dihapus.",
  "data": null
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

Ambil semua task tambahan:

```bash
curl -X GET "http://localhost:8000/api/additional-tasks" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Ambil task tambahan berdasarkan filter:

```bash
curl -X GET "http://localhost:8000/api/additional-tasks?client_code=CLIENT-001&job_id=1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Buat task tambahan:

```bash
curl -X POST "http://localhost:8000/api/additional-tasks" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"client_code":"CLIENT-001","job_id":1,"details":[{"parent_id":10,"tasks":[{"task_name":"Cek ulang area"}]}]}'
```

Perbarui task tambahan:

```bash
curl -X PUT "http://localhost:8000/api/additional-tasks/1" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"client_code":"CLIENT-001","job_id":1,"details":[{"parent_id":10,"tasks":[{"id":100,"task_name":"Cek ulang area blok","status":"pending"}]}]}'
```

Hapus task tambahan:

```bash
curl -X DELETE "http://localhost:8000/api/additional-tasks/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

