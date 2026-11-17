# Dokumentasi API Temuan (Terpadu)

Dokumen ini menjelaskan endpoint Temuan yang terdaftar pada `routes/api.php`.

Fitur Temuan telah **disatukan (*unified*)**, sehingga mencakup temuan langsung (*Global*) maupun temuan yang dicatat dari lembar Progress Report (*PR*). Temuan dibuat oleh user login dan dapat dipantau, dikomentari, serta diselesaikan oleh seluruh anggota team SPK yang sama.

```php
Route::prefix('temuan')->group(function () {
    Route::get('/', [TemuanController::class, 'index']);
    Route::post('/', [TemuanController::class, 'store']);
    Route::get('/{temuan}', [TemuanController::class, 'show'])->whereNumber('temuan');
    Route::put('/{temuan}', [TemuanController::class, 'update'])->whereNumber('temuan');
    Route::delete('/{temuan}', [TemuanController::class, 'destroy'])->whereNumber('temuan');
    Route::post('/{temuan}/files', [TemuanController::class, 'uploadFiles'])->whereNumber('temuan');
    Route::delete('/{temuan}/files/{file}', [TemuanController::class, 'deleteFile'])
        ->whereNumber('temuan')
        ->whereNumber('file');

    // Endpoint Diskusi / Komentar Temuan
    Route::get('/{temuan}/comments', [TemuanController::class, 'comments'])->whereNumber('temuan');
    Route::post('/{temuan}/comments', [TemuanController::class, 'storeComment'])->whereNumber('temuan');
    Route::delete('/{temuan}/comments/{comment}', [TemuanController::class, 'destroyComment'])
        ->whereNumber('temuan')
        ->whereNumber('comment');
});
```

---

## Ringkasan Endpoint

Semua endpoint berada di bawah prefix `/api/temuan`.

Endpoint Temuan berada di dalam middleware:
```php
Route::middleware([
    'progress.auth',
    'tenant.database',
])->group(function () {
    // temuan
});
```

Headers wajib:
```http
Accept: application/json
Authorization: Bearer {token}
```

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/temuan` | Mengambil daftar Temuan yang dapat diakses user login (filter client, SPK, tanggal, status, type, priority). |
| `POST` | `/api/temuan` | Membuat Temuan baru (mendukung multi-temuan per task & additional/custom task). |
| `GET` | `/api/temuan/{temuan}` | Mengambil detail Temuan beserta notes, solusi, file, dan riwayat PR jika ada. |
| `PUT` | `/api/temuan/{temuan}` | Memperbarui tanggal, prioritas, dan daftar note Temuan. |
| `DELETE` | `/api/temuan/{temuan}` | Menghapus Temuan (hanya jika belum selesai). |
| `POST` | `/api/temuan/{temuan}/files` | Upload file/foto bukti Temuan. |
| `DELETE` | `/api/temuan/{temuan}/files/{file}` | Menghapus file Temuan. |
| `GET` | `/api/temuan/{temuan}/comments` | Mengambil daftar diskusi komentar pada temuan. |
| `POST` | `/api/temuan/{temuan}/comments` | Menambahkan komentar/saran pada temuan oleh tim SPK. |
| `DELETE` | `/api/temuan/{temuan}/comments/{comment}` | Menghapus komentar milik user login. |

---

## Aturan Bisnis (*Business Rules*)

1. **Unifikasi & Format Nomor**:
   - Semua temuan memakai format nomor seragam: `TM-YYYYMMDD-001`.
   - Field `type` membedakan asal temuan:
     - `'TM'`: Temuan murni yang dicatat dari menu Temuan.
     - `'PR'`: Temuan yang dicatat saat pembuatan lembar Progress Report.
   - Temuan tipe `'PR'` memiliki tag visual `no_pr` (contoh: `PR-20261111-0001`) dan relasi `als_progress_report_id`.
2. **Skala Prioritas (1 – 5) per Note**:
   - Skala prioritas melekat **per catatan temuan (*note*)** di `notes.*.priority`.
   - Nilai integer `1` sampai `5` (Default: `3`).
   - `1: Sangat Rendah`, `2: Rendah`, `3: Sedang / Normal`, `4: Tinggi`, `5: Kritis / Urgent`.
3. **Multi-Temuan dalam 1 Task**:
   - Pengguna **dapat mencatat lebih dari 1 temuan dalam task yang sama**. Tidak ada lagi batasan duplikasi task.
4. **Cakupan Task (Header / Parent Task Saja)**:
   - Temuan **hanya dapat dikaitkan dengan Header / Parent Task Pekerjaan utama SPK** (`als_job_task_id` di mana `parent_id IS NULL`). Temuan menjadi *children* dari Parent Task tersebut berdampingan dengan sub-task pekerjaan.
   - Sub-task (`parent_id IS NOT NULL`) tidak diizinkan.
   - Tidak ada integrasi dengan Pekerjaan Tambahan maupun Custom Pekerjaan pada Temuan dan Solusi.
5. **3 Status Siklus Hidup**:
   - `open`: Masih terbuka, belum ada tindak lanjut.
   - `pending`: Sedang ditindaklanjuti pada Daily Progress namun belum beres (memiliki alasan pending).
   - `selesai`: Semua note pada temuan ini telah diselesaikan dengan solusi final (disinkronkan otomatis saat solusi diberikan).
6. **Hak Akses & Otorisasi**:
   - User harus terdaftar pada `als_spk_teams` di SPK terkait.
   - Anggota tim SPK dapat saling melihat temuan, berkomentar, dan memberikan solusi.
   - Edit dan delete header temuan hanya dapat dilakukan oleh pembuatnya sebelum statusnya `selesai`.

---

## Format Data Response Temuan

```json
{
  "id": 1,
  "nomor": "TM-20261111-001",
  "type": "PR",
  "als_progress_report_id": 12,
  "no_pr": "PR-20261111-0001",
  "progress_report": {
    "id": 12,
    "nomor": "PR-20261111-0001",
    "tanggal": "2026-11-11"
  },
  "tanggal": "2026-11-11",
  "client_code": "CLIENT-001",
  "spk": {
    "id": 10,
    "no_spk": "SPK-001",
    "client_code": "CLIENT-001",
    "kode_product_jasa": "JOB-001"
  },
  "job": {
    "id": 5,
    "job_code": "JOB-001",
    "description": "Pekerjaan audit & instalasi"
  },
  "status": "pending",
  "notes": [
    {
      "id": 100,
      "als_job_task_id": 20,
      "task": {
        "id": 20,
        "task_name": "Pemasangan Pompa"
      },
      "priority": 4,
      "note": "Sambungan pipa utama bocor di sektor barat.",
      "solution": null,
      "created_at": "2026-11-11T03:00:00.000000Z",
      "updated_at": "2026-11-11T03:00:00.000000Z"
    },
    {
      "id": 101,
      "als_job_task_id": 20,
      "task": {
        "id": 20,
        "task_name": "Pemasangan Pompa"
      },
      "priority": 2,
      "note": "Tekanan air drop di sektor barat.",
      "solution": null,
      "created_at": "2026-11-11T03:00:00.000000Z",
      "updated_at": "2026-11-11T03:00:00.000000Z"
    }
  ],
  "files": [
    {
      "id": 200,
      "original_name": "foto-bocor.jpg",
      "mime_type": "image/jpeg",
      "size": 204800,
      "path": "temuan/1/files/550e8400-e29b-41d4-a716-446655440000.jpg",
      "url": "/storage/temuan/1/files/550e8400-e29b-41d4-a716-446655440000.jpg",
      "created_at": "2026-11-11T03:10:00.000000Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "temuan_id": 1,
      "temuan_note_id": 100,
      "comment": "Sudah disiapkan suku cadang seal pengganti, akan dipasang besok.",
      "created_by": "EMP002",
      "created_by_name": "Budi Santoso",
      "created_by_level": 2,
      "created_at": "2026-11-11T04:00:00.000000Z",
      "updated_at": "2026-11-11T04:00:00.000000Z"
    }
  ],
  "created_by": "EMP001",
  "created_by_name": "Achmad Shofyan",
  "created_by_level": 3,
  "created_at": "2026-11-11T03:00:00.000000Z",
  "updated_at": "2026-11-11T03:00:00.000000Z"
}
```

---

## GET /api/temuan

Mengambil daftar Temuan yang dapat diakses user login.

### Query Parameters

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `client_code` | string | Tidak | Filter kode client. |
| `als_spk_id` | integer | Tidak | Filter ID SPK. |
| `tanggal` | date | Tidak | Filter tanggal format `YYYY-MM-DD`. |
| `status` | string | Tidak | Filter status: `open`, `pending`, `selesai`. |
| `type` | string | Tidak | Filter sumber temuan: `TM` (Global) atau `PR` (Progress Report). |
| `priority` | integer | Tidak | Filter skala prioritas `1` sampai `5`. |

---

## POST /api/temuan

Membuat temuan baru.

### Body Parameters

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `tanggal` | date | Ya | Tanggal temuan (`YYYY-MM-DD`). |
| `client_code` | string | Ya | Kode client. |
| `als_spk_id` | integer | Ya | ID SPK. |
| `type` | string | Tidak | `'TM'` (default) atau `'PR'`. |
| `notes` | array | Ya | Minimal 1 note temuan. Boleh beberapa note dalam 1 header task yang sama. |
| `notes.*.als_job_task_id` | integer | Ya | ID Header / Parent Task pekerjaan utama SPK (`parent_id IS NULL`). Sub-task tidak diizinkan. |
| `notes.*.note` | string | Ya | Isi catatan temuan. |
| `notes.*.priority` | integer | Tidak | Skala prioritas catatan temuan (1-5). Default: `3`. |

### Contoh Request Body

```json
{
  "tanggal": "2026-11-11",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "type": "TM",
  "notes": [
    {
      "als_job_task_id": 20,
      "priority": 5,
      "note": "Masalah 1: Sambungan pipa bocor bertekanan tinggi."
    },
    {
      "als_job_task_id": 20,
      "priority": 2,
      "note": "Masalah 2: Tekanan air drop di sektor barat."
    }
  ]
}
```

---

## Diskusi / Komentar Temuan

### GET /api/temuan/{temuan}/comments
Mengambil daftar diskusi komentar pada temuan terkait.

**Response:**
```json
{
  "status": true,
  "message": "Daftar komentar temuan berhasil diambil.",
  "data": [
    {
      "id": 1,
      "temuan_id": 1,
      "temuan_note_id": 100,
      "comment": "Sudah diverifikasi di lapangan, butuh penggantian seal.",
      "created_by": "EMP002",
      "created_by_name": "Budi Santoso",
      "created_by_level": 2,
      "created_at": "2026-11-11T04:00:00.000000Z",
      "updated_at": "2026-11-11T04:00:00.000000Z"
    }
  ]
}
```

### POST /api/temuan/{temuan}/comments
Menambahkan komentar baru oleh anggota tim SPK.

**Body Parameters:**
| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `comment` | string | Ya | Teks komentar atau masukan. |
| `temuan_note_id` | integer | Tidak | ID sub-note temuan jika komentar spesifik pada masalah tertentu. |

**Request Body:**
```json
{
  "comment": "Seal pengganti sudah dipesan oleh divisi logistik.",
  "temuan_note_id": 100
}
```

### DELETE /api/temuan/{temuan}/comments/{comment}
Menghapus komentar yang dibuat oleh user login.
