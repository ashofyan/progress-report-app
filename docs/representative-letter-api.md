# Dokumentasi API Representative Letter (RL) & Document Engine JSON

Dokumen ini menjelaskan endpoint Representative Letter yang terdaftar pada `routes/api.php`.

Representative Letter telah dirombak untuk mendukung **Document Engine berbasis JSON (WYSIWYG Docs / ala MS Word)** dan terintegrasi langsung dengan data **Progress Report**.

---

### Alur Bisnis Baru (Workflow)
1. **Pilih Sumber Data:** User memilih Klien atau SPK.
2. **Ambil Progress Report Selesai:** Sistem menampilkan daftar Progress Report milik SPK/Klien yang berstatus `selesai` (`GET /api/representative-letters/available-progress-reports`). User memilih checklist Progress Report mana saja yang dimasukkan ke dalam RL.
3. **Inisialisasi Draft RL (Generate Draft):** Backend memuat Master Template RL dan otomatis menginjeksi daftar Progress Report yang dipilih (nomor pekerjaan, deskripsi, temuan/hasil yang selesai) ke dalam template konten (`POST /api/representative-letters/generate-draft`).
4. **Simpan Dokumen:** Dokumen disimpan dalam format **JSON** fleksibel (mencakup teks terstruktur, layout settings A4, margin, watermark, kop surat, dan relasi pivot Progress Report) (`POST /api/representative-letters`).
5. **Re-Open & Update:** Dokumen dapat dibuka kembali via API (`GET /api/representative-letters/{id}`) dengan struktur presisi untuk diedit ulang atau difinalisasi (`PUT /api/representative-letters/{id}`).

---

### Daftar Endpoint

Prefix yang didukung: `/api/representative-letters` dan `/api/representative-letter` (backward compatibility).

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| `GET` | `/api/representative-letters/available-progress-reports` | Mengambil daftar Progress Report berstatus `selesai` (Query params: `?spk_id=123` atau `?client_code=CLI001`). |
| `POST` | `/api/representative-letters/generate-draft` | Mengenerate draft dokumen RL dari template & Progress Report terpilih. |
| `GET` | `/api/representative-letters` | Mengambil daftar RL (filter: `spk_id`, `client_code`, `status`, `search`). |
| `POST` | `/api/representative-letters` | Menyimpan dokumen RL baru (draft atau final). |
| `GET` | `/api/representative-letters/{representativeLetter}` | Mengambil detail dokumen RL lengkap dengan content AST / JSON dan relasi PR. |
| `PUT` | `/api/representative-letters/{representativeLetter}` | Memperbarui dokumen RL (konten, layout settings, status, dll). |
| `DELETE` | `/api/representative-letters/{representativeLetter}` | Menghapus dokumen RL. |
| `GET` | `/api/representative-letters/preview` | Preview rekap task (legacy preview). |
| `GET` | `/api/representative-letter-templates` | Mengambil daftar Master Template RL. |
| `POST` | `/api/representative-letter-templates` | Membuat Master Template RL baru. |
| `GET` | `/api/representative-letter-templates/{template}` | Mengambil detail Master Template RL. |
| `PUT` | `/api/representative-letter-templates/{template}` | Memperbarui Master Template RL. |
| `DELETE` | `/api/representative-letter-templates/{template}` | Menghapus Master Template RL. |
| `GET` | `/api/representative-letter-header` | Mengambil daftar header kop surat RL. |
| `POST` | `/api/representative-letter-header` | Membuat header kop surat baru. |
| `POST` | `/api/representative-letter-header/{header}/activate` | Mengaktifkan header kop surat. |

## Business Rule

Representative Letter tidak bersifat personal. Setelah user login tervalidasi sebagai anggota team SPK, data RL mengambil Progress Report dari seluruh user pada SPK tersebut.

Filter sumber data RL:

1. `als_progress_reports.als_spk_id` sama dengan SPK yang dipilih.
2. Bulan `als_progress_reports.tanggal` sama dengan `bulan` request.
3. Tahun `als_progress_reports.tanggal` sama dengan `tahun` request.
4. Hanya `als_progress_report_details.status = selesai`.

Representative Letter tidak memfilter Progress Report berdasarkan `created_by` user login.

Authorization:

1. User harus login memakai Progress Token.
2. Sistem mengambil `auth_employee.employee_code`.
3. Sistem mengecek membership pada `als_spk_teams`:

```text
als_spk_teams.kode_employee = auth_employee.employee_code
als_spk_teams.als_spk_id = als_spk_id yang dipilih
```

Tidak ada pembatasan `jabatan.tingkat`. Semua level boleh membuat dan melihat RL selama employee login terdaftar sebagai team pada SPK tersebut.

## Struktur Data

Header dokumen Representative Letter disimpan pada tabel tenant `als_representative_letters`.
Detail Representative Letter disimpan pada tabel tenant `als_representative_letter_details`.
Header kop surat Representative Letter disimpan pada tabel tenant `als_representative_letter_headers`.

Nomor Representative Letter dibuat otomatis dengan format:

```text
RL-YYYYMM-001
```

Contoh: `RL-202608-001`.

Satu SPK hanya boleh memiliki satu Representative Letter untuk satu bulan dan satu tahun yang sama.

Unique key:

```text
als_spk_id + bulan + tahun
```

Detail Representative Letter adalah snapshot. Nama task, parent task, nomor PR, tanggal PR, employee pembuat PR, source type, dan status disimpan ke tabel detail RL agar data RL lama tidak berubah jika master task berubah di kemudian hari.

Field editor dan dokumen pada header RL:

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `representative_letter_header_id` | integer nullable | Header kop surat yang dipakai RL. Nullable untuk RL lama. |
| `content` | longText nullable | HTML hasil editor frontend. Saat create, backend mengisi initial HTML sederhana dari snapshot detail. |
| `content_format` | string | Format content. Untuk sekarang hanya `html`. Default `html`. |
| `document_settings` | json nullable | Konfigurasi presentasi dokumen seperti page, header enabled, footer enabled, dan watermark enabled. Backend hanya menyimpan JSON, tidak melakukan render PDF. |

Header kop surat tenant menggunakan versioning. Jika kop surat berubah, buat header baru lalu aktifkan header tersebut. Representative Letter lama tetap menunjuk header lama melalui `representative_letter_header_id`.

Footer dan watermark tidak disimpan per tenant. Keduanya adalah global/static asset dari frontend atau template PDF global nanti. Backend hanya mengirim setting enabled/opacity/width.

Default `document_settings` saat create:

```json
{
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin_top": 20,
    "margin_right": 20,
    "margin_bottom": 20,
    "margin_left": 20
  },
  "header": {
    "enabled": true
  },
  "footer": {
    "enabled": true
  },
  "watermark": {
    "enabled": true,
    "opacity": 0.08,
    "width": 150
  }
}
```

`document_settings` bersifat general. Tidak ada CKEditor-specific logic, upload footer, upload watermark, image processing, atau PDF rendering pada endpoint ini.

## Source Type Detail

| Source Type | Field Sumber | Keterangan |
| --- | --- | --- |
| `master` | `als_job_task_id` | Detail berasal dari master job task. |
| `additional` | `als_task_additional_detail_id` | Detail berasal dari Additional Task Detail. |

Jika source task pada Progress Report Detail tidak valid atau tidak ditemukan, pembuatan/preview RL akan gagal dengan error `422` karena data sumber dianggap corrupt.

## Header Kop Surat

Setiap tenant/PT memiliki header kop surat sendiri pada tabel tenant `als_representative_letter_headers`.

Karena database sudah tenant-specific, tabel header tidak menyimpan `company_code` atau `tenant_code`.

Contoh mapping:

| Tenant | Header Aktif |
| --- | --- |
| `PRO` | Header PRO |
| `MJS` | Header MJS |
| `DNA` | Header DNA |
| `RAC` | Header RAC |

Dalam satu tenant hanya boleh ada satu header aktif. Saat satu header diaktifkan, header lain pada tenant yang sama akan otomatis dinonaktifkan.

Representative Letter baru wajib memakai header aktif. Jika header aktif belum tersedia, create RL akan gagal dengan status `422` dan message:

```json
{
  "status": false,
  "message": "Header Representative Letter aktif belum tersedia."
}
```

Representative Letter lama yang sudah dibuat akan tetap menunjuk header yang sama. Jika kop surat berubah pada tahun berikutnya, buat header versi baru lalu aktifkan header baru tersebut. Header lama tidak boleh dihapus dan image header lama tidak boleh ditimpa jika sudah dipakai RL.

Header image disimpan pada public disk:

```text
representative-letter/headers/{header_id}/header-{uuid}.{extension}
```

Allowed file: `png`, `jpg`, `jpeg`, `webp`.
Maksimal file: `10 MB`.
Backend tidak menerima base64 dan tidak memakai filename asli sebagai filename storage.

## Format Response Header Kop Surat

```json
{
  "id": 1,
  "code": "PRO-2026",
  "name": "Kop Surat PRO 2026",
  "is_active": true,
  "image": {
    "path": "representative-letter/headers/1/header-uuid.png",
    "url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
  },
  "created_by": "EMP001",
  "created_at": "2026-08-21T03:00:00.000000Z",
  "updated_at": "2026-08-21T03:00:00.000000Z"
}
```

## GET /api/representative-letters/available-progress-reports

Endpoint untuk mengambil daftar Progress Report milik SPK / Klien yang berstatus `selesai`.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `spk_id` | integer | Opsional | Filter berdasarkan ID SPK. |
| `client_code` | string | Opsional | Filter berdasarkan Kode Klien (contoh: `CLI001`). |

### Request

```http
GET /api/representative-letters/available-progress-reports?spk_id=123
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "nomor": "PR/2026/XI/001",
      "tanggal": "2026-11-15",
      "task_name": "Pemeriksaan Rekonsiliasi Bank",
      "status": "selesai",
      "temuans_count": 2,
      "ringkasan": "Semua selisih telah dikonfirmasi dan disesuaikan."
    }
  ]
}
```

---

## POST /api/representative-letters/generate-draft

Endpoint untuk menginisialisasi draft dokumen RL. Backend memuat Master Template RL dan otomatis menginjeksi daftar Progress Report yang dipilih (nomor pekerjaan, deskripsi, temuan/hasil yang selesai) ke dalam template konten WYSIWYG Docs / ala MS Word (JSON fleksibel).

### Request Body

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `spk_id` | integer | Ya | ID SPK sumber data. |
| `progress_report_ids` | array of int | Ya | Array ID Progress Report berstatus selesai yang dipilih user. |
| `template_id` | integer | Opsional | ID Master Template RL. Jika kosong, memakai template default aktif. |
| `header_id` | integer | Opsional | ID header kop surat. Jika kosong, memakai default header template/aktif. |
| `title` | string | Opsional | Judul draft dokumen RL. |

```json
{
  "spk_id": 123,
  "progress_report_ids": [101, 102],
  "template_id": 1
}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "success": true,
  "status": true,
  "message": "Draft Representative Letter berhasil digenerate.",
  "data": {
    "title": "Representative Letter - SPK/2026/XI/001",
    "nomor_surat": null,
    "client_code": "CLI001",
    "spk_id": 123,
    "header_id": 1,
    "header": {
      "id": 1,
      "code": "PRO-2026",
      "name": "Kop Surat Resmi ALS",
      "image_url": "http://localhost:8000/storage/representative-letter/headers/1/header.png"
    },
    "settings": {
      "paper_size": "A4",
      "orientation": "portrait",
      "margin": {
        "top": "25mm",
        "right": "20mm",
        "bottom": "25mm",
        "left": "20mm"
      },
      "watermark": {
        "enabled": false,
        "image_url": null,
        "opacity": 0.15
      },
      "header_footer": {
        "header_enabled": true,
        "footer_enabled": true
      }
    },
    "content": {
      "format": "wysiwyg_json",
      "version": "1.0",
      "html": "<p>...</p>",
      "sections": [
        { "id": "intro", "type": "html", "content": "..." },
        { "id": "progress_reports_table", "type": "table", "html": "...", "items": [] }
      ]
    },
    "status": "draft",
    "selected_progress_reports": [
      {
        "id": 101,
        "nomor": "PR/2026/XI/001",
        "tanggal": "2026-11-15",
        "task_name": "Pemeriksaan Rekonsiliasi Bank",
        "status": "selesai",
        "temuans_count": 2,
        "ringkasan": "Semua selisih telah dikonfirmasi dan disesuaikan."
      }
    ]
  }
}
```

---

## GET /api/representative-letter-header

Endpoint untuk mengambil daftar header kop surat Representative Letter pada tenant aktif.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `per_page` | integer | Tidak | Jumlah data per halaman. Default `20`. |

### Request

```http
GET /api/representative-letter-header?per_page=20
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data Header Representative Letter berhasil diambil.",
  "data": [
    {
      "id": 1,
      "code": "PRO-2026",
      "name": "Kop Surat PRO 2026",
      "is_active": true,
      "image": {
        "path": "representative-letter/headers/1/header-uuid.png",
        "url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
      },
      "created_by": "EMP001",
      "created_at": "2026-08-21T03:00:00.000000Z",
      "updated_at": "2026-08-21T03:00:00.000000Z"
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

## POST /api/representative-letter-header

Endpoint untuk membuat header kop surat baru.

Jika `is_active = true`, header baru akan langsung diaktifkan dan header lain pada tenant yang sama akan dinonaktifkan.

### Form Data

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `code` | string | Ya | Kode unik header, maksimal 100 karakter. Contoh `PRO-2026`. |
| `name` | string | Ya | Nama header, maksimal 255 karakter. |
| `header_image` | file | Ya | File header. Format `png`, `jpg`, `jpeg`, atau `webp`. Maksimal 10 MB. |
| `is_active` | boolean | Tidak | Jika true, header langsung menjadi header aktif. |

### Request

```http
POST /api/representative-letter-header
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Header Representative Letter berhasil dibuat.",
  "data": {
    "id": 1,
    "code": "PRO-2026",
    "name": "Kop Surat PRO 2026",
    "is_active": true,
    "image": {
      "path": "representative-letter/headers/1/header-uuid.png",
      "url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "created_by": "EMP001",
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T03:00:00.000000Z"
  }
}
```

### Response Error

Kode sudah digunakan:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Kode header Representative Letter sudah digunakan."
}
```

## GET /api/representative-letter-header/{header}

Endpoint untuk mengambil detail header kop surat Representative Letter.

### Request

```http
GET /api/representative-letter-header/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Header Representative Letter berhasil diambil.",
  "data": {
    "id": 1,
    "code": "PRO-2026",
    "name": "Kop Surat PRO 2026",
    "is_active": true,
    "image": {
      "path": "representative-letter/headers/1/header-uuid.png",
      "url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "created_by": "EMP001",
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T03:00:00.000000Z"
  }
}
```

## PUT /api/representative-letter-header/{header}

Endpoint untuk memperbarui nama, status aktif, atau image header.

Jika header sudah digunakan oleh Representative Letter, `header_image` tidak boleh diganti. Buat header versi baru untuk mengganti kop surat.

### Form Data

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `name` | string | Tidak | Nama header baru. |
| `is_active` | boolean | Tidak | Jika true, header ini aktif dan header lain nonaktif. Jika false, header ini menjadi nonaktif. |
| `header_image` | file | Tidak | File header baru. Hanya boleh jika header belum digunakan RL. |

### Request

```http
PUT /api/representative-letter-header/1
Accept: application/json
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Response Error Jika Header Sudah Dipakai RL

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Header sudah digunakan oleh Representative Letter. Buat header versi baru untuk mengganti kop surat."
}
```

## POST /api/representative-letter-header/{header}/activate

Endpoint untuk mengaktifkan satu header kop surat. Header lain pada tenant yang sama akan otomatis dinonaktifkan.

### Request

```http
POST /api/representative-letter-header/1/activate
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Header Representative Letter berhasil diaktifkan.",
  "data": {
    "id": 1,
    "code": "PRO-2026",
    "name": "Kop Surat PRO 2026",
    "is_active": true,
    "image": {
      "path": "representative-letter/headers/1/header-uuid.png",
      "url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "created_by": "EMP001",
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T03:30:00.000000Z"
  }
}
```

## Format Response Representative Letter

Untuk Representative Letter lama yang belum memiliki `representative_letter_header_id`, field `header` bernilai `null`.

```json
{
  "id": 1,
  "nomor": "RL-202608-001",
  "header": {
    "id": 1,
    "code": "PRO-2026",
    "name": "Kop Surat PRO 2026",
    "image_url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
  },
  "spk": {
    "id": 384,
    "no_spk": "SPK-001",
    "client_code": "HSMA"
  },
  "job": {
    "id": 8,
    "job_code": "INT-02",
    "description": "Internal Audit"
  },
  "periode": {
    "bulan": 8,
    "tahun": 2026,
    "label": "Agustus 2026"
  },
  "created_by": "EMP001",
  "created_by_level": 3,
  "content": "<h2>Progress Report</h2><h3>Persiapan audit</h3><ul><li>Review dokumen awal</li></ul>",
  "content_format": "html",
  "document_settings": {
    "page": {
      "size": "A4",
      "orientation": "portrait",
      "margin_top": 20,
      "margin_right": 20,
      "margin_bottom": 20,
      "margin_left": 20
    },
    "header": {
      "enabled": true
    },
    "footer": {
      "enabled": true
    },
    "watermark": {
      "enabled": true,
      "opacity": 0.08,
      "width": 150
    }
  },
  "details": [
    {
      "id": 10,
      "progress_report": {
        "id": 100,
        "nomor": "PR-20260803-0001",
        "tanggal": "2026-08-03"
      },
      "employee": {
        "employee_code": "EMP002",
        "name": "Budi"
      },
      "type": "master",
      "parent_task_name": "Persiapan audit",
      "task_name": "Review dokumen awal",
      "status": "selesai"
    }
  ],
  "created_at": "2026-08-21T03:00:00.000000Z",
  "updated_at": "2026-08-21T03:00:00.000000Z"
}
```

## GET /api/representative-letter/preview

Endpoint untuk mengambil preview Representative Letter tanpa menyimpan data ke database.

Preview mengambil semua Progress Report Detail selesai dari seluruh user pada SPK dan periode yang dipilih. User login hanya dipakai untuk validasi membership SPK.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `als_spk_id` | integer | Ya | ID SPK. User login harus terdaftar pada team SPK ini. |
| `bulan` | integer | Ya | Bulan periode RL, `1` sampai `12`. |
| `tahun` | integer | Ya | Tahun periode RL, `2000` sampai `2100`. |

### Request

```http
GET /api/representative-letter/preview?als_spk_id=384&bulan=8&tahun=2026
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Preview Representative Letter berhasil diambil.",
  "data": {
    "spk": {
      "id": 384,
      "no_spk": "SPK-001",
      "client_code": "HSMA"
    },
    "job": {
      "id": 8,
      "job_code": "INT-02",
      "description": "Internal Audit"
    },
    "periode": {
      "bulan": 8,
      "tahun": 2026,
      "label": "Agustus 2026"
    },
    "summary": {
      "total_progress_report": 4,
      "total_task_selesai": 12,
      "total_employee": 3
    },
    "tasks": [
      {
        "progress_report": {
          "id": 100,
          "nomor": "PR-20260803-0001",
          "tanggal": "2026-08-03"
        },
        "employee": {
          "employee_code": "EMP002",
          "name": "Budi"
        },
        "type": "master",
        "parent": {
          "id": 70,
          "task_name": "Persiapan audit"
        },
        "task": {
          "id": 240,
          "task_name": "Review dokumen awal"
        },
        "status": "selesai",
        "notes": [
          {
            "id": 501,
            "catatan": "Dokumen sudah direview."
          }
        ]
      },
      {
        "progress_report": {
          "id": 101,
          "nomor": "PR-20260805-0001",
          "tanggal": "2026-08-05"
        },
        "employee": {
          "employee_code": "EMP003",
          "name": "Siti"
        },
        "type": "additional",
        "parent": {
          "id": 70,
          "task_name": "Persiapan audit"
        },
        "task": {
          "id": 300,
          "task_name": "Konfirmasi ulang data client"
        },
        "status": "selesai",
        "notes": []
      }
    ]
  }
}
```

Jika tidak ada task selesai, response tetap berhasil dengan `summary.total_task_selesai = 0` dan `tasks = []`.

### Response Error

Employee code tidak ada pada token:

Status: `401 Unauthorized`

```json
{
  "status": false,
  "message": "Employee code tidak ditemukan pada token."
}
```

User tidak terdaftar pada team SPK:

Status: `403 Forbidden`

```json
{
  "status": false,
  "message": "SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut."
}
```

SPK tidak memiliki master pekerjaan:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Master pekerjaan SPK tidak ditemukan."
}
```

## GET /api/representative-letter

Endpoint untuk mengambil daftar Representative Letter yang dapat diakses user login.

Data difilter berdasarkan membership SPK. User dapat melihat RL yang dibuat user lain selama user login merupakan anggota team SPK yang sama.

### Query Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `als_spk_id` | integer | Tidak | Filter berdasarkan ID SPK. |
| `bulan` | integer | Tidak | Filter bulan, `1` sampai `12`. |
| `tahun` | integer | Tidak | Filter tahun. |
| `per_page` | integer | Tidak | Jumlah data per halaman. Default `20`. |

### Request

```http
GET /api/representative-letter?als_spk_id=384&bulan=8&tahun=2026&per_page=20
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Data Representative Letter berhasil diambil.",
  "data": [
    {
      "id": 1,
      "nomor": "RL-202608-001",
      "spk": {
        "id": 384,
        "no_spk": "SPK-001",
        "client_code": "HSMA"
      },
      "job": {
        "id": 8,
        "job_code": "INT-02",
        "description": "Internal Audit"
      },
      "periode": {
        "bulan": 8,
        "tahun": 2026,
        "label": "Agustus 2026"
      },
      "total_detail": 12,
      "created_by": "EMP001",
      "created_by_level": 3,
      "created_at": "2026-08-21T03:00:00.000000Z"
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

## POST /api/representative-letter

Endpoint untuk membuat Representative Letter berdasarkan SPK, bulan, dan tahun.

Saat dibuat, sistem membuat header RL, snapshot seluruh Progress Report Detail selesai yang memenuhi rule, initial HTML content, dan default document settings. Jika RL untuk SPK dan periode yang sama sudah ada, sistem tidak membuat duplikat.

Initial HTML content dibuat dari snapshot detail dan boleh diedit oleh frontend melalui endpoint `PUT /api/representative-letter/{representativeLetter}`. Snapshot database tetap menyimpan semua source PR detail secara lengkap.

Untuk tampilan initial content, task yang sama boleh tampil satu kali berdasarkan kombinasi `source_type + parent_task_name + task_name`. Tetapi database snapshot tetap menyimpan semua source record dari PR detail.

### Body Parameter

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `als_spk_id` | integer | Ya | ID SPK. User login harus terdaftar pada team SPK ini. |
| `bulan` | integer | Ya | Bulan periode RL, `1` sampai `12`. |
| `tahun` | integer | Ya | Tahun periode RL, `2000` sampai `2100`. |

### Request

```http
POST /api/representative-letter
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "als_spk_id": 384,
  "bulan": 8,
  "tahun": 2026
}
```

### Response Berhasil

Status: `201 Created`

```json
{
  "status": true,
  "message": "Representative Letter berhasil dibuat.",
  "data": {
    "id": 1,
    "nomor": "RL-202608-001",
    "header": {
      "id": 1,
      "code": "PRO-2026",
      "name": "Kop Surat PRO 2026",
      "image_url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "spk": {
      "id": 384,
      "no_spk": "SPK-001",
      "client_code": "HSMA"
    },
    "job": {
      "id": 8,
      "job_code": "INT-02",
      "description": "Internal Audit"
    },
    "periode": {
      "bulan": 8,
      "tahun": 2026,
      "label": "Agustus 2026"
    },
    "created_by": "EMP001",
    "created_by_level": 3,
    "content": "<h2>Progress Report</h2><h3>Persiapan audit</h3><ul><li>Review dokumen awal</li></ul>",
    "content_format": "html",
    "document_settings": {
      "page": {
        "size": "A4",
        "orientation": "portrait",
        "margin_top": 20,
        "margin_right": 20,
        "margin_bottom": 20,
        "margin_left": 20
      },
      "header": {
        "enabled": true
      },
      "footer": {
        "enabled": true
      },
      "watermark": {
        "enabled": true,
        "opacity": 0.08,
        "width": 150
      }
    },
    "details": [
      {
        "id": 10,
        "progress_report": {
          "id": 100,
          "nomor": "PR-20260803-0001",
          "tanggal": "2026-08-03"
        },
        "employee": {
          "employee_code": "EMP002",
          "name": "Budi"
        },
        "type": "master",
        "parent_task_name": "Persiapan audit",
        "task_name": "Review dokumen awal",
        "status": "selesai"
      }
    ],
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T03:00:00.000000Z"
  }
}
```

### Response Error

RL untuk periode tersebut sudah ada:

Status: `409 Conflict`

```json
{
  "status": false,
  "message": "Representative Letter untuk SPK dan periode tersebut sudah ada."
}
```

Tidak ada task selesai:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Tidak terdapat task Progress Report selesai pada periode tersebut."
}
```

Data source corrupt:

Status: `422 Unprocessable Entity`

```json
{
  "status": false,
  "message": "Master task untuk Progress Report Detail #10 tidak ditemukan."
}
```

Kemungkinan error lain:

| Status | Message |
| --- | --- |
| `401` | `Employee code tidak ditemukan pada token.` |
| `403` | `SPK tidak ditemukan atau Anda tidak terdaftar pada SPK tersebut.` |
| `422` | `Master pekerjaan SPK tidak ditemukan.` |
| `422` | `Task tambahan untuk Progress Report Detail #{id} tidak ditemukan.` |
| `422` | `Source task Progress Report Detail #{id} tidak valid.` |

## GET /api/representative-letter/{representativeLetter}

Endpoint untuk mengambil detail Representative Letter berdasarkan ID.

User dapat mengambil RL jika user login merupakan anggota team pada SPK RL tersebut. Tidak ada filter `created_by` pada RL.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `representativeLetter` | integer | Ya | ID Representative Letter. Route hanya menerima angka. |

### Request

```http
GET /api/representative-letter/1
Accept: application/json
Authorization: Bearer {token}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Representative Letter berhasil diambil.",
  "data": {
    "id": 1,
    "nomor": "RL-202608-001",
    "header": {
      "id": 1,
      "code": "PRO-2026",
      "name": "Kop Surat PRO 2026",
      "image_url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "spk": {
      "id": 384,
      "no_spk": "SPK-001",
      "client_code": "HSMA"
    },
    "job": {
      "id": 8,
      "job_code": "INT-02",
      "description": "Internal Audit"
    },
    "periode": {
      "bulan": 8,
      "tahun": 2026,
      "label": "Agustus 2026"
    },
    "created_by": "EMP001",
    "created_by_level": 3,
    "content": "<h2>Progress Report</h2><h3>Persiapan audit</h3><ul><li>Review dokumen awal</li></ul>",
    "content_format": "html",
    "document_settings": {
      "page": {
        "size": "A4",
        "orientation": "portrait",
        "margin_top": 20,
        "margin_right": 20,
        "margin_bottom": 20,
        "margin_left": 20
      },
      "header": {
        "enabled": true
      },
      "footer": {
        "enabled": true
      },
      "watermark": {
        "enabled": true,
        "opacity": 0.08,
        "width": 150
      }
    },
    "details": [],
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T03:00:00.000000Z"
  }
}
```

### Response Error

Representative Letter tidak ditemukan atau user tidak memiliki akses pada SPK RL:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Representative Letter tidak ditemukan."
}
```

## PUT /api/representative-letter/{representativeLetter}

Endpoint untuk memperbarui HTML content dan document settings Representative Letter.

Endpoint ini hanya untuk kebutuhan editor/document configuration. Identity RL dan source snapshot tidak dapat diubah lewat endpoint ini.

Field yang tidak boleh diubah melalui endpoint ini:

1. `als_spk_id`
2. `bulan`
3. `tahun`
4. `no_spk`
5. `als_job_id`
6. `job_code`
7. `details`
8. source Progress Report Detail

User dapat mengedit RL jika user login merupakan anggota team pada SPK RL tersebut. Tidak ada filter `created_by` pada RL, sehingga user A dapat membuat RL dan user B dapat mengedit selama keduanya berada pada team SPK yang sama.

### Path Parameter

| Parameter | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `representativeLetter` | integer | Ya | ID Representative Letter. Route hanya menerima angka. |

### Body Parameter

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `content` | string nullable | Tidak | HTML hasil rich-text editor frontend. |
| `content_format` | string | Tidak | Hanya menerima `html`. |
| `document_settings` | object nullable | Tidak | Konfigurasi dokumen. Jika dikirim object, akan digabung dengan default/existing settings. Jika dikirim `null`, settings disimpan `null`. |
| `document_settings.page.size` | string | Tidak | Hanya menerima `A4`. |
| `document_settings.page.orientation` | string | Tidak | `portrait` atau `landscape`. |
| `document_settings.page.margin_top` | numeric | Tidak | Minimal `0`. |
| `document_settings.page.margin_right` | numeric | Tidak | Minimal `0`. |
| `document_settings.page.margin_bottom` | numeric | Tidak | Minimal `0`. |
| `document_settings.page.margin_left` | numeric | Tidak | Minimal `0`. |
| `document_settings.header.enabled` | boolean | Tidak | Mengaktifkan header dokumen. |
| `document_settings.footer.enabled` | boolean | Tidak | Mengaktifkan footer dokumen. |
| `document_settings.watermark.enabled` | boolean | Tidak | Mengaktifkan watermark. |
| `document_settings.watermark.opacity` | numeric | Tidak | `0` sampai `1`. |
| `document_settings.watermark.width` | numeric | Tidak | Minimal `1`. |

### Request

```http
PUT /api/representative-letter/1
Accept: application/json
Content-Type: application/json
Authorization: Bearer {token}
```

```json
{
  "content": "<h2>Progress Report</h2><h3>Siklus Kas dan Bank</h3><ul><li>Rekonsiliasi rekening bank</li></ul>",
  "content_format": "html",
  "document_settings": {
    "page": {
      "size": "A4",
      "orientation": "portrait",
      "margin_top": 20,
      "margin_right": 20,
      "margin_bottom": 20,
      "margin_left": 20
    },
    "header": {
      "enabled": true
    },
    "footer": {
      "enabled": true
    },
    "watermark": {
      "enabled": true,
      "opacity": 0.08,
      "width": 150
    }
  }
}
```

### Response Berhasil

Status: `200 OK`

```json
{
  "status": true,
  "message": "Representative Letter berhasil diperbarui.",
  "data": {
    "id": 1,
    "nomor": "RL-202608-001",
    "header": {
      "id": 1,
      "code": "PRO-2026",
      "name": "Kop Surat PRO 2026",
      "image_url": "http://localhost:8000/storage/representative-letter/headers/1/header-uuid.png"
    },
    "spk": {
      "id": 384,
      "no_spk": "SPK-001",
      "client_code": "HSMA"
    },
    "job": {
      "id": 8,
      "job_code": "INT-02",
      "description": "Internal Audit"
    },
    "periode": {
      "bulan": 8,
      "tahun": 2026,
      "label": "Agustus 2026"
    },
    "created_by": "EMP001",
    "created_by_level": 3,
    "content": "<h2>Progress Report</h2><h3>Siklus Kas dan Bank</h3><ul><li>Rekonsiliasi rekening bank</li></ul>",
    "content_format": "html",
    "document_settings": {
      "page": {
        "size": "A4",
        "orientation": "portrait",
        "margin_top": 20,
        "margin_right": 20,
        "margin_bottom": 20,
        "margin_left": 20
      },
      "header": {
        "enabled": true
      },
      "footer": {
        "enabled": true
      },
      "watermark": {
        "enabled": true,
        "opacity": 0.08,
        "width": 150
      }
    },
    "details": [],
    "created_at": "2026-08-21T03:00:00.000000Z",
    "updated_at": "2026-08-21T04:00:00.000000Z"
  }
}
```

### Response Error

Representative Letter tidak ditemukan atau user tidak memiliki akses pada SPK RL:

Status: `404 Not Found`

```json
{
  "status": false,
  "message": "Representative Letter tidak ditemukan."
}
```

Validasi `content_format` gagal:

Status: `422 Unprocessable Entity`

```json
{
  "message": "The selected content format is invalid.",
  "errors": {
    "content_format": [
      "The selected content format is invalid."
    ]
  }
}
```

## Migration

Jalankan tenant migration untuk menambahkan tabel RL, field document editor, tabel header kop surat, dan FK header pada RL:

```bash
php artisan tenant:database MJS
```

Ganti `MJS` dengan kode tenant yang sesuai.

Jangan jalankan:

```bash
php artisan tenant:database:fresh MJS
```

## Contoh cURL

Create Header Representative Letter:

```bash
curl -X POST "http://localhost:8000/api/representative-letter-header" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}" \
  -F "code=PRO-2026" \
  -F "name=Kop Surat PRO 2026" \
  -F "is_active=1" \
  -F "header_image=@/path/to/header-pro.png"
```

Activate Header Representative Letter:

```bash
curl -X POST "http://localhost:8000/api/representative-letter-header/1/activate" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Preview Representative Letter:

```bash
curl -X GET "http://localhost:8000/api/representative-letter/preview?als_spk_id=384&bulan=8&tahun=2026" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

List Representative Letter:

```bash
curl -X GET "http://localhost:8000/api/representative-letter?als_spk_id=384&bulan=8&tahun=2026&per_page=20" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Create Representative Letter:

```bash
curl -X POST "http://localhost:8000/api/representative-letter" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"als_spk_id":384,"bulan":8,"tahun":2026}'
```

Show Representative Letter:

```bash
curl -X GET "http://localhost:8000/api/representative-letter/1" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer {token}"
```

Update Representative Letter content/settings:

```bash
curl -X PUT "http://localhost:8000/api/representative-letter/1" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"content":"<h2>Progress Report</h2><ul><li>Rekonsiliasi rekening bank</li></ul>","content_format":"html","document_settings":{"page":{"size":"A4","orientation":"portrait","margin_top":20,"margin_right":20,"margin_bottom":20,"margin_left":20}}}'
```
