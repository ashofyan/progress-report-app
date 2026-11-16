# Dokumentasi API Solusi

Dokumen ini menjelaskan endpoint Solusi Temuan yang terdaftar pada `routes/api.php`.

Solusi dipakai untuk menyelesaikan satu note Temuan Global. Satu note Temuan hanya boleh memiliki satu solusi final.

```php
Route::prefix('solusi')->group(function () {
    Route::get('/form-data', [SolusiController::class, 'formData']);
    Route::get('/', [SolusiController::class, 'index']);
    Route::post('/', [SolusiController::class, 'store']);
    Route::get('/{solusi}', [SolusiController::class, 'show'])->whereNumber('solusi');
    Route::put('/{solusi}', [SolusiController::class, 'update'])->whereNumber('solusi');
    Route::post('/{solusi}/files', [SolusiController::class, 'uploadFiles'])->whereNumber('solusi');
    Route::delete('/{solusi}/files/{file}', [SolusiController::class, 'deleteFile'])
        ->whereNumber('solusi')
        ->whereNumber('file');
});
```

## Ringkasan

Semua endpoint berada di bawah prefix `/api/solusi`.

Endpoint Solusi berada di dalam middleware:

```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    // solusi
});
```

Headers wajib:

```http
Accept: application/json
Authorization: Bearer {token}
```

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/solusi/form-data` | Mengambil Temuan open yang masih memiliki note tanpa solusi. |
| `GET` | `/api/solusi` | Mengambil daftar Solusi yang dapat diakses user login. |
| `POST` | `/api/solusi` | Membuat Solusi untuk satu note Temuan. |
| `GET` | `/api/solusi/{solusi}` | Mengambil detail Solusi. |
| `PUT` | `/api/solusi/{solusi}` | Memperbarui isi Solusi. |
| `POST` | `/api/solusi/{solusi}/files` | Upload file Solusi. |
| `DELETE` | `/api/solusi/{solusi}/files/{file}` | Menghapus file Solusi. |

Response endpoint ini menggunakan key `status`, bukan `success`.

## Business Rule

Authorization:

1. User harus login memakai Progress Token.
2. Sistem mengambil `auth_employee.employee_code`.
3. User harus menjadi anggota team SPK dari Temuan terkait.
4. Create Solusi dapat dilakukan anggota team SPK selama Temuan masih berstatus `open` atau `pending` dan note belum memiliki solusi.
5. Update, upload file, dan delete file hanya dapat dilakukan oleh pembuat Solusi.
6. List dan show dapat diakses anggota team SPK yang sama.

Setelah Solusi dibuat, backend memanggil sinkronisasi status Temuan:

1. Jika masih ada note Temuan tanpa solusi, status Temuan tetap `open` (atau `pending`).
2. Jika semua note sudah memiliki solusi, status Temuan otomatis berubah menjadi `selesai`.

Sumber Solusi (`source`):

| Source | Keterangan |
| --- | --- |
| `menu` | Solusi dibuat langsung dari menu Solusi (`/api/solusi`). |
| `daily_progress` | Solusi dibuat secara otomatis saat tindak lanjut temuan diselesaikan melalui Daily Progress. |
| `progress_report` | Solusi diselesaikan melalui lembar Progress Report. |

## Struktur Data

Solusi disimpan pada tabel tenant `als_temuan_solutions`.
File Solusi disimpan pada tabel tenant `als_temuan_solution_files`.

Unique key:
```text
temuan_note_id
```
Artinya satu note Temuan hanya dapat diselesaikan satu kali secara final.

## Format Response Solusi

```json
{
  "id": 1,
  "source": "menu",
  "temuan": {
    "id": 10,
    "nomor": "TM-20261111-001",
    "type": "PR",
    "priority": 4,
    "no_pr": "PR-20261111-0001",
    "tanggal": "2026-11-11",
    "client_code": "CLIENT-001",
    "status": "selesai",
    "spk": {
      "id": 100,
      "no_spk": "SPK-001"
    },
    "job": {
      "id": 5,
      "job_code": "JOB-001",
      "description": "Pekerjaan audit & instalasi"
    }
  },
  "note": {
    "id": 200,
    "task": {
      "id": 20,
      "task_name": "Pemasangan Pompa"
    },
    "note": "Sambungan pipa utama bocor di sektor barat."
  },
  "solution": "Seal pipa telah diganti dengan tipe high-pressure dan diuji tekanan.",
  "progress_report": null,
  "daily_progress": null,
  "files": [
    {
      "id": 300,
      "original_name": "bukti-solusi.jpg",
      "mime_type": "image/jpeg",
      "size": 204800,
      "path": "temuan/solutions/1/files/550e8400-e29b-41d4-a716-446655440000.jpg",
      "url": "/storage/temuan/solutions/1/files/550e8400-e29b-41d4-a716-446655440000.jpg",
      "created_at": "2026-11-11T05:00:00.000000Z"
    }
  ],
  "created_by": "EMP001",
  "created_by_level": 3,
  "resolved_at": "2026-11-11T05:00:00.000000Z",
  "created_at": "2026-11-11T05:00:00.000000Z",
  "updated_at": "2026-11-11T05:00:00.000000Z"
}
```

## GET /api/solusi/form-data

Endpoint untuk mengambil daftar Temuan yang masih dapat diselesaikan.

Data yang dikembalikan:

1. Temuan dengan status `open`.
2. Temuan yang dapat diakses user login berdasarkan membership SPK.
3. Temuan yang masih memiliki minimal satu note tanpa solusi.

### Request

```http
GET /api/solusi/form-data
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Form data Solusi berhasil diambil.",
  "data": [
    {
      "id": 10,
      "nomor": "TM-20260827-001",
      "tanggal": "2026-08-27",
      "client_code": "CLIENT-001",
      "spk": {
        "id": 100,
        "no_spk": "SPK-001"
      },
      "job": {
        "id": 5,
        "job_code": "JOB-001",
        "description": "Pekerjaan audit"
      },
      "notes": [
        {
          "id": 200,
          "task": {
            "id": 20,
            "task_name": "Persiapan audit"
          },
          "note": "Dokumen pembukaan belum lengkap."
        }
      ]
    }
  ]
}
```

## GET /api/solusi

Endpoint untuk mengambil daftar Solusi yang dapat diakses user login.

Data difilter berdasarkan membership SPK dari Temuan terkait.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter berdasarkan client Temuan. |
| `als_spk_id` | integer | Tidak | Filter berdasarkan SPK Temuan. |
| `source` | string | Tidak | Filter sumber solusi, yaitu `menu` atau `progress_report`. |

### Request

```http
GET /api/solusi?client_code=CLIENT-001&als_spk_id=100&source=menu
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data Solusi berhasil diambil.",
  "data": []
}
```

## POST /api/solusi

Endpoint untuk membuat Solusi dari menu Solusi.

### Body Parameter

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `temuan_note_id` | integer | Ya | ID note Temuan yang akan diselesaikan. Temuan harus masih `open`, user login harus anggota team SPK, dan note belum memiliki solusi. |
| `solution` | string | Ya | Isi solusi. Tidak boleh kosong setelah trim. |

### Request

```http
POST /api/solusi
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "temuan_note_id": 200,
  "solution": "Dokumen sudah dilengkapi dan diverifikasi."
}
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Solusi berhasil dibuat.",
  "data": {
    "id": 1,
    "source": "menu",
    "solution": "Dokumen sudah dilengkapi dan diverifikasi.",
    "progress_report": null
  }
}
```

### Response Error

| Status | Message |
| --- | --- |
| `401` | `Employee code tidak ditemukan pada token.` |
| `404` | `Temuan tidak ditemukan atau tidak dapat diselesaikan.` |
| `422` | `Temuan tersebut sudah memiliki solusi.` |
| `422` | `Solusi tidak boleh kosong.` |

## GET /api/solusi/{solusi}

Endpoint untuk mengambil detail Solusi berdasarkan ID.

### Request

```http
GET /api/solusi/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Solusi berhasil diambil.",
  "data": {
    "id": 1,
    "source": "menu",
    "solution": "Dokumen sudah dilengkapi dan diverifikasi."
  }
}
```

### Response Error

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Solusi tidak ditemukan."
}
```

## PUT /api/solusi/{solusi}

Endpoint untuk memperbarui isi Solusi.

Hanya pembuat Solusi yang dapat memperbarui. User juga harus masih menjadi anggota team SPK Temuan terkait.

### Body Parameter

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `solution` | string | Ya | Isi solusi baru. Tidak boleh kosong setelah trim. |

### Request

```http
PUT /api/solusi/1
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "solution": "Dokumen sudah dilengkapi, diverifikasi, dan disetujui client."
}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Solusi berhasil diperbarui.",
  "data": {
    "id": 1,
    "solution": "Dokumen sudah dilengkapi, diverifikasi, dan disetujui client."
  }
}
```

### Response Error

| Status | Message |
| --- | --- |
| `404` | `Solusi tidak ditemukan.` |
| `422` | `Solusi tidak boleh kosong.` |

## POST /api/solusi/{solusi}/files

Endpoint untuk upload satu atau beberapa file Solusi.

File disimpan pada disk Laravel `public`:

```text
temuan/solutions/{solution_id}/files/{uuid}.{extension}
```

### Form Data

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `files[]` | file[] | Ya | Satu sampai 10 file. Maksimal 20 MB per file. Format: `jpg`, `jpeg`, `png`, `webp`, `pdf`, `xls`, `xlsx`, `doc`, `docx`. |

### Request

```http
POST /api/solusi/1/files
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "File Solusi berhasil diupload.",
  "data": [
    {
      "id": 300,
      "original_name": "bukti-solusi.pdf",
      "mime_type": "application/pdf",
      "size": 204800,
      "path": "temuan/solutions/1/files/550e8400-e29b-41d4-a716-446655440000.pdf",
      "url": "/storage/temuan/solutions/1/files/550e8400-e29b-41d4-a716-446655440000.pdf",
      "created_at": "2026-08-28T03:00:00.000000Z"
    }
  ]
}
```

### Response Error

| Status | Message |
| --- | --- |
| `404` | `Solusi tidak ditemukan atau Anda tidak memiliki akses untuk mengubah Solusi tersebut.` |
| `500` | `Gagal menyimpan file Solusi.` |

## DELETE /api/solusi/{solusi}/files/{file}

Endpoint untuk menghapus satu file Solusi.

### Request

```http
DELETE /api/solusi/1/files/300
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "File Solusi berhasil dihapus."
}
```

### Response Error

| Status | Message |
| --- | --- |
| `404` | `Solusi tidak ditemukan atau Anda tidak memiliki akses untuk mengubah Solusi tersebut.` |
| `404` | `File Solusi tidak ditemukan.` |

## Contoh cURL

```bash
curl -X GET "http://localhost:8000/api/solusi/form-data" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

```bash
curl -X POST "http://localhost:8000/api/solusi" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"temuan_note_id":200,"solution":"Dokumen sudah dilengkapi dan diverifikasi."}'
```

```bash
curl -X POST "http://localhost:8000/api/solusi/1/files" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "files[]=@/path/to/bukti-solusi.pdf"
```
