# Notes Service API

[![Laravel](https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.2+-777BB4?style=for-the-badge&logo=php&logoColor=white)](https://www.php.net)
[![JWT](https://img.shields.io/badge/Auth-Stateless%20JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens)](https://jwt.io)

**Notes Service** adalah layanan backend RESTful API berbasis Laravel 12 yang dirancang untuk mengelola catatan internal tim (*Standard Notes*) dan notulen rapat (*Meeting Notes/Minutes*). Layanan ini mendukung integrasi konten blok berbasis [EditorJS](https://editorjs.io/), sistem pembagian akses fleksibel (*Private*, *Public*, *Invited*), otomatisasi hak akses peserta rapat (*Attendance Sync*), serta autentikasi *Stateless JWT*.

---

## Daftar Isi
1. [Fitur Utama](#fitur-utama)
2. [Arsitektur & Tech Stack](#arsitektur--tech-stack)
3. [Panduan Instalasi & Setup](#panduan-instalasi--setup)
4. [Konfigurasi Autentikasi JWT](#konfigurasi-autentikasi-jwt)
5. [Skema Database](#skema-database)
6. [Daftar Endpoint API](#daftar-endpoint-api)
   - [1. Mendapatkan Daftar Catatan (GET /api/notes)](#1-mendapatkan-daftar-catatan)
   - [2. Membuat Catatan Standar (POST /api/notes)](#2-membuat-catatan-standar)
   - [3. Membuat Notulen Rapat (POST /api/notes/meeting)](#3-membuat-notulen-rapat)
   - [4. Memperbarui Catatan (PUT /api/notes/{id})](#4-memperbarui-catatan)
   - [5. Membagikan Catatan ke Semua Tim (POST /api/notes/{id}/share-public)](#5-membagikan-catatan-ke-semua-tim-public)
   - [6. Mengundang Akses Anggota Tertentu (POST /api/notes/{id}/share-invited)](#6-mengundang-akses-anggota-tertentu-invited)
7. [Struktur Response Error & Status Code](#struktur-response-error--status-code)
8. [Pengujian](#pengujian)

---

## Fitur Utama

- **Standard Notes**: Pembuatan catatan pribadi atau tim dengan konten terstruktur (EditorJS JSON).
- **Meeting Minutes (Notulen Rapat)**:
  - Lingkup rapat fleksibel: `umum` (internal tim) atau `client` (terkait klien eksternal dengan `client_id`).
  - **Otomatisasi Presensi & Akses**: Kode karyawan peserta rapat (`attendee_codes`) otomatis menerima hak akses baca (*Read-Only*) dengan penanda kehadiran (*Attendance*).
- **Level Berbagi Catatan (Share Types)**:
  - `private`: Hanya dapat dilihat dan diedit oleh pemilik catatan (*Author*).
  - `public`: Dapat dibaca (*Read-Only*) oleh seluruh karyawan dalam tim.
  - `invited`: Dapat diakses oleh karyawan terpilih dengan izin spesifik (`read` atau `edit`).
- **Autentikasi Stateless JWT**:
  - Diperiksa melalui middleware `DecryptProgressToken` / `VerifyStatelessJwt`.
  - Mengambil identitas user secara stateless dari payload token (`sub`, `employee_code`).
- **Service-Repository Pattern**: Struktur kode rapi memisahkan controller, logika bisnis (Service), dan akses database (Repository).

---

## Arsitektur & Tech Stack

- **Framework**: Laravel 12
- **Language**: PHP 8.2+
- **Pattern**:
  - Controller: `NoteController`
  - Service Layer: `NoteService`
  - Repository Layer: `NoteRepositoryInterface` & `NoteRepository`
  - Form Requests: `StoreStandardNoteRequest`, `StoreMeetingNoteRequest`, `ShareInvitedRequest`
  - Resource Formatter: `NoteResource`
- **Token Parser**: `firebase/php-jwt`

---

## Konfigurasi Autentikasi JWT

Seluruh endpoint API pada rute `routes/api.php` dilindungi oleh middleware JWT (`auth.jwt`).

Kirimkan token JWT pada setiap request melalui header HTTP:
```http
Authorization: Bearer <jwt_token>
Accept: application/json
```

Token didecode dan mengekstrak kode karyawan (`employee_code` / `sub`), kemudian disimpan ke dalam request attribute `auth_employee_code` dan digunakan oleh controller/service.

---

## Skema Database

### 1. Tabel `notes`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `BIGINT UNSIGNED (PK)` | Auto-increment ID |
| `author_employee_code` | `VARCHAR(100) (Index)` | Kode karyawan pembuat catatan |
| `type` | `ENUM('standard', 'meeting')` | Jenis catatan (Default: `standard`) |
| `meeting_scope` | `ENUM('umum', 'client')` | Nullable, cakupan rapat |
| `client_id` | `BIGINT UNSIGNED` | Nullable, ID klien bila `meeting_scope = client` |
| `title` | `VARCHAR(255)` | Judul catatan |
| `content` | `JSON` | Payload blok EditorJS |
| `share_type` | `ENUM('private', 'public', 'invited')` | Level visibilitas (Default: `private`) |
| `created_at` / `updated_at` | `TIMESTAMP` | Waktu dibuat & diubah |

### 2. Tabel `note_shares`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `BIGINT UNSIGNED (PK)` | Auto-increment ID |
| `note_id` | `BIGINT UNSIGNED (FK)` | Relasi ke `notes.id` (Cascade On Delete) |
| `employee_code` | `VARCHAR(100) (Index)` | Kode karyawan yang diberi akses |
| `permission` | `ENUM('read', 'edit')` | Izin akses (Default: `read`) |
| `is_attendance` | `BOOLEAN` | Menandakan kehadiran peserta notulen rapat |
| `created_at` / `updated_at` | `TIMESTAMP` | Waktu dibuat & diubah |
| *Index Unik* | `UNIQUE(note_id, employee_code)` | Mencegah duplikasi entri izin untuk user yang sama |

---

## Daftar Endpoint API

| Method | Endpoint | Deskripsi | Form Request / Handler |
|---|---|---|---|
| `GET` | `/api/notes` | Menampilkan semua catatan yang dapat diakses | `NoteController::index` |
| `POST` | `/api/notes` | Membuat catatan standar baru | `StoreStandardNoteRequest` |
| `POST` | `/api/notes/meeting` | Membuat notulen rapat & auto-share ke peserta | `StoreMeetingNoteRequest` |
| `PUT` | `/api/notes/{id}` | Memperbarui catatan / notulen | `NoteController::update` |
| `POST` | `/api/notes/{id}/share-public` | Membagikan catatan ke semua tim (Read-Only) | `NoteController::sharePublic` |
| `POST` | `/api/notes/{id}/share-invited` | Mengundang akses anggota terpilih (`read`/`edit`) | `ShareInvitedRequest` |

---

### 1. Mendapatkan Daftar Catatan
Mengambil daftar catatan yang dapat diakses oleh user yang sedang login dengan paginasi.

- **HTTP Method**: `GET`
- **URL**: `/api/notes`
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Accept: application/json
  ```
- **Query Parameters**:
  | Parameter | Tipe | Wajib | Deskripsi |
  |---|---|---|---|
  | `page` | `integer` | Tidak | Nomor halaman paginasi (Default: `1`) |

- **Response Success (`200 OK`)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "author_employee_code": "EMP001",
        "type": "meeting",
        "meeting_scope": "client",
        "client_id": 204,
        "title": "Kickoff Meeting Project CRM",
        "content": {
          "time": 1727670000000,
          "blocks": [
            {
              "type": "paragraph",
              "data": {
                "text": "Diskusi timeline delivery modul CRM tahap 1."
              }
            }
          ]
        },
        "share_type": "invited",
        "shares": [
          {
            "id": 1,
            "note_id": 1,
            "employee_code": "EMP002",
            "permission": "read",
            "is_attendance": true,
            "created_at": "2026-09-30T04:45:00.000000Z",
            "updated_at": "2026-09-30T04:45:00.000000Z"
          }
        ],
        "created_at": "2026-09-30T04:45:00.000000Z",
        "updated_at": "2026-09-30T04:45:00.000000Z"
      }
    ],
    "links": {
      "first": "http://localhost:8001/api/notes?page=1",
      "last": "http://localhost:8001/api/notes?page=1",
      "prev": null,
      "next": null
    },
    "meta": {
      "current_page": 1,
      "from": 1,
      "last_page": 1,
      "per_page": 15,
      "to": 1,
      "total": 1
    }
  }
  ```

---

### 2. Membuat Catatan Standar
Membuat catatan standar baru (*Standard Note*). Catatan dibuat dengan `type: standard` dan `share_type: private`.

- **HTTP Method**: `POST`
- **URL**: `/api/notes`
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `title` | `string` | Ya | Judul catatan (maksimal 255 karakter) |
  | `content` | `array / object` | Ya | Struktur JSON blocks EditorJS |

- **Response Success (`200 OK` / `201 Created`)**:
  ```json
  {
    "data": {
      "id": 2,
      "author_employee_code": "EMP001",
      "type": "standard",
      "meeting_scope": null,
      "client_id": null,
      "title": "Ide Rencana Sprint Q4",
      "content": {
        "time": 1727671200000,
        "blocks": [
          {
            "type": "paragraph",
            "data": {
              "text": "Optimalisasi query database dan implementasi caching Redis."
            }
          }
        ],
        "version": "2.31.7"
      },
      "share_type": "private",
      "created_at": "2026-09-30T04:50:00.000000Z",
      "updated_at": "2026-09-30T04:50:00.000000Z"
    },
    "success": true,
    "message": "Catatan berhasil disimpan."
  }
  ```

---

### 3. Membuat Notulen Rapat
Membuat notulen rapat (*Meeting Minutes*). Sistem akan secara otomatis:
1. Menyimpan data dengan `type: meeting` dan `share_type: invited`.
2. Menyinkronkan daftar `attendee_codes` ke tabel `note_shares` dengan `permission: read` dan flag `is_attendance: true`.
3. Menghilangkan kode pembuat (*author*) dari daftar peserta agar izin owner tidak terduplikasi.

- **HTTP Method**: `POST`
- **URL**: `/api/notes/meeting`
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `meeting_scope` | `string` | Ya | Pilihan: `umum` atau `client` |
  | `client_id` | `integer` | Kondisional | Wajib diisi jika `meeting_scope = client`. Boleh null/dikosongkan jika `umum`. |
  | `title` | `string` | Ya | Judul notulen rapat (maksimal 255 karakter) |
  | `attendee_codes` | `array of string` | Ya | Daftar kode karyawan yang hadir rapat (minimal 1) |
  | `attendee_codes.*` | `string` | Ya | Kode karyawan individual (misal: "EMP002") |
  | `content` | `array / object` | Ya | Struktur JSON blocks EditorJS hasil notulen |

- **Contoh Request Body**:
  ```json
  {
    "meeting_scope": "client",
    "client_id": 88,
    "title": "Notulen Sprint Review dengan Klien Acme Corp",
    "attendee_codes": ["EMP002", "EMP003", "EMP005"],
    "content": {
      "time": 1727672000000,
      "blocks": [
        {
          "type": "paragraph",
          "data": {
            "text": "Poin revisi UI pada dashboard telah disetujui."
          }
        }
      ]
    }
  }
  ```

- **Response Success (`200 OK` / `201 Created`)**:
  ```json
  {
    "data": {
      "id": 3,
      "author_employee_code": "EMP001",
      "type": "meeting",
      "meeting_scope": "client",
      "client_id": 88,
      "title": "Notulen Sprint Review dengan Klien Acme Corp",
      "content": {
        "time": 1727672000000,
        "blocks": [
          {
            "type": "paragraph",
            "data": {
              "text": "Poin revisi UI pada dashboard telah disetujui."
            }
          }
        ]
      },
      "share_type": "invited",
      "shares": [
        {
          "id": 5,
          "note_id": 3,
          "employee_code": "EMP002",
          "permission": "read",
          "is_attendance": true,
          "created_at": "2026-09-30T04:55:00.000000Z",
          "updated_at": "2026-09-30T04:55:00.000000Z"
        },
        {
          "id": 6,
          "note_id": 3,
          "employee_code": "EMP003",
          "permission": "read",
          "is_attendance": true,
          "created_at": "2026-09-30T04:55:00.000000Z",
          "updated_at": "2026-09-30T04:55:00.000000Z"
        }
      ],
      "created_at": "2026-09-30T04:55:00.000000Z",
      "updated_at": "2026-09-30T04:55:00.000000Z"
    },
    "success": true,
    "message": "Notulen berhasil disimpan dan dibagikan otomatis ke peserta hadir."
  }
  ```

---

### 4. Memperbarui Catatan
Memperbarui judul (`title`) atau isi (`content`) dari catatan atau notulen rapat yang sudah ada.

- **HTTP Method**: `PUT`
- **URL**: `/api/notes/{id}`
- **Path Parameters**:
  | Parameter | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `id` | `integer` | Ya | ID catatan yang ingin diperbarui |

- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `title` | `string` | Opsional | Judul baru (maksimal 255 karakter) |
  | `content` | `array / object` | Opsional | Blok konten EditorJS yang diperbarui |

- **Response Success (`200 OK`)**:
  ```json
  {
    "data": {
      "id": 2,
      "author_employee_code": "EMP001",
      "type": "standard",
      "meeting_scope": null,
      "client_id": null,
      "title": "Ide Rencana Sprint Q4 - Revisi 1",
      "content": { ... },
      "share_type": "private",
      "created_at": "2026-09-30T04:50:00.000000Z",
      "updated_at": "2026-09-30T05:00:00.000000Z"
    },
    "success": true,
    "message": "Catatan berhasil diperbarui."
  }
  ```

---

### 5. Membagikan Catatan ke Semua Tim (Public)
Mengubah status catatan menjadi `public`. Seluruh karyawan dalam sistem akan dapat melihat catatan ini dalam status *Read-Only*.

> [!WARNING]
> Hanya **pembuat catatan** (`author_employee_code`) yang berhak membagikan catatan ke publik.

- **HTTP Method**: `POST`
- **URL**: `/api/notes/{id}/share-public`
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Accept: application/json
  ```

- **Response Success (`200 OK`)**:
  ```json
  {
    "data": {
      "id": 2,
      "author_employee_code": "EMP001",
      "type": "standard",
      "meeting_scope": null,
      "client_id": null,
      "title": "Ide Rencana Sprint Q4 - Revisi 1",
      "content": { ... },
      "share_type": "public",
      "created_at": "2026-09-30T04:50:00.000000Z",
      "updated_at": "2026-09-30T05:05:00.000000Z"
    },
    "success": true,
    "message": "Catatan berhasil dibagikan ke semua tim (Read-Only)."
  }
  ```

---

### 6. Mengundang Akses Anggota Tertentu (Invited)
Membagikan catatan ke karyawan tertentu dengan izin khusus (`read` atau `edit`). Status catatan akan otomatis diatur menjadi `share_type: invited`.

> [!WARNING]
> Hanya **pembuat catatan** (`author_employee_code`) yang berhak mengundang dan mengatur izin anggota.

- **HTTP Method**: `POST`
- **URL**: `/api/notes/{id}/share-invited`
- **Path Parameters**:
  | Parameter | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `id` | `integer` | Ya | ID catatan |

- **Headers**:
  ```http
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
  Accept: application/json
  ```
- **Request Body**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `shares` | `array of object` | Ya | Daftar karyawan yang diundang (minimal 1) |
  | `shares.*.employee_code` | `string` | Ya | Kode karyawan yang diundang (misal: "EMP002") |
  | `shares.*.permission` | `string` | Ya | Hak akses: `read` (hanya baca) atau `edit` (dapat mengubah catatan) |

- **Contoh Request Body**:
  ```json
  {
    "shares": [
      {
        "employee_code": "EMP002",
        "permission": "edit"
      },
      {
        "employee_code": "EMP003",
        "permission": "read"
      }
    ]
  }
  ```

- **Response Success (`200 OK`)**:
  ```json
  {
    "data": {
      "id": 2,
      "author_employee_code": "EMP001",
      "type": "standard",
      "meeting_scope": null,
      "client_id": null,
      "title": "Ide Rencana Sprint Q4 - Revisi 1",
      "content": { ... },
      "share_type": "invited",
      "shares": [
        {
          "id": 10,
          "note_id": 2,
          "employee_code": "EMP002",
          "permission": "edit",
          "is_attendance": false,
          "created_at": "2026-09-30T05:10:00.000000Z",
          "updated_at": "2026-09-30T05:10:00.000000Z"
        },
        {
          "id": 11,
          "note_id": 2,
          "employee_code": "EMP003",
          "permission": "read",
          "is_attendance": false,
          "created_at": "2026-09-30T05:10:00.000000Z",
          "updated_at": "2026-09-30T05:10:00.000000Z"
        }
      ],
      "created_at": "2026-09-30T04:50:00.000000Z",
      "updated_at": "2026-09-30T05:10:00.000000Z"
    },
    "success": true,
    "message": "Undangan akses catatan berhasil disimpan."
  }
  ```

---

## Struktur Response Error & Status Code

| HTTP Status | Deskripsi | Contoh Format Response |
|---|---|---|
| `200 OK` | Permintaan berhasil diproses | `{ "data": ..., "success": true, "message": "..." }` |
| `401 Unauthorized` | Token tidak valid, kedaluwarsa, atau tidak dikirim | `{ "success": false, "message": "Token otentikasi tidak ditemukan." }` |
| `403 Forbidden` | Tidak memiliki hak akses atas aksi atau catatan ini | `{ "success": false, "message": "Anda tidak memiliki hak akses..." }` |
| `404 Not Found` | Catatan tidak ditemukan | `{ "message": "Record not found." }` |
| `422 Unprocessable Content` | Validasi parameter atau payload gagal | `{ "message": "...", "errors": { ... } }` |
| `500 Internal Server Error` | Terjadi kesalahan server | `{ "message": "Server Error" }` |
