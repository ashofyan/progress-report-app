# Dokumentasi API - Group Catatan Standar (`/api/notes`)

Dokumentasi endpoint untuk modul **Catatan Standar (Standard Notes)** pada microservice Notes Service.

---

## Informasi Umum & Database
- **Database Target**: `progress_notes_db` (Koneksi: `mysql`)
- **Tabel Terkait**: `notes`, `note_shares`
- **Model**: [`App\Models\Note`](file:///home/shofyan/Developments/notes-service/app/Models/Note.php), [`App\Models\NoteShare`](file:///home/shofyan/Developments/notes-service/app/Models/NoteShare.php)
- **Controller**: [`App\Http\Controllers\NoteController`](file:///home/shofyan/Developments/notes-service/app/Http/Controllers/NoteController.php)
- **Karakteristik Header**: Header dokumen sederhana (`title`, `content`, `share_type`).

---

## Autentikasi & Header Permintaan
Semua request wajib menyertakan token autentikasi Progress:

```http
Authorization: Bearer <encrypted_progress_token>
Content-Type: application/json
Accept: application/json
```

Identitas user login diambil otomatis dari token:
- `auth_employee_code`: Kode karyawan pembuat (contoh: `x7rhtim8`)
- `auth_employee_name`: Nama lengkap karyawan (contoh: `Achmad Shofyan`)

---

## Daftar Endpoint

| HTTP Method | URI | Deskripsi | Handler |
|---|---|---|---|
| `GET` | `/api/notes` | Mengambil daftar catatan standar yang dapat diakses | `NoteController@index` |
| `POST` | `/api/notes` | Membuat catatan standar baru | `NoteController@storeStandard` |
| `PUT` | `/api/notes/{id}` | Mengubah judul dan konten catatan | `NoteController@update` |
| `POST` | `/api/notes/{id}/share-public` | Membagikan catatan ke seluruh tim (Read-Only) | `NoteController@sharePublic` |
| `POST` | `/api/notes/{id}/share-invited` | Mengundang akses karyawan tertentu (read / edit) | `NoteController@shareInvited` |
| `POST` | `/api/notes/meeting` | *(Kompatibilitas)* Diteruskan ke modul notulen rapat | `MeetingNoteController@store` |

---

## Rincian Endpoint

### 1. List Catatan Standar (`GET /api/notes`)
Mengambil catatan milik user yang sedang login, catatan berstatus `public`, atau catatan yang dibagikan kepadanya lewat `note_shares`.

- **Method**: `GET`
- **URL**: `/api/notes`
- **Query Parameters**:
  | Parameter | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `page` | `integer` | Tidak | Nomor halaman paginasi (Default: `1`) |

- **Response Success (`200 OK`)**:
```json
{
  "data": [
    {
      "id": 1,
      "author_employee_code": "x7rhtim8",
      "author_employee_name": "Achmad Shofyan",
      "title": "Ide Rencana Sprint Q4",
      "content": {
        "time": 1727670000000,
        "blocks": [
          {
            "type": "paragraph",
            "data": { "text": "Prioritas pengerjaan refactor modul notes." }
          }
        ]
      },
      "share_type": "private",
      "shares": [],
      "created_at": "2026-10-12T03:30:00.000000Z",
      "updated_at": "2026-10-12T03:30:00.000000Z"
    }
  ],
  "links": {
    "first": "http://localhost:8000/api/notes?page=1",
    "last": "http://localhost:8000/api/notes?page=1",
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

### 2. Buat Catatan Standar (`POST /api/notes`)
Membuat catatan baru dengan status visibilitas awal `private`.

- **Method**: `POST`
- **URL**: `/api/notes`
- **Body Request**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `title` | `string` | Ya | Judul catatan (maks 255 karakter) |
  | `content` | `array/object` | Ya | Struktur JSON blocks EditorJS |
  | `author_employee_name` | `string` | Opsional | Nama pembuat (fallback otomatis dari token jika kosong) |

- **Contoh Request Body**:
```json
{
  "title": "Catatan Review Arsitektur",
  "content": {
    "time": 1727670000000,
    "blocks": [
      {
        "type": "paragraph",
        "data": { "text": "Dokumentasi pemisahan database notes service." }
      }
    ]
  }
}
```

- **Response Success (`201 Created`)**:
```json
{
  "data": {
    "id": 2,
    "author_employee_code": "x7rhtim8",
    "author_employee_name": "Achmad Shofyan",
    "title": "Catatan Review Arsitektur",
    "content": { ... },
    "share_type": "private",
    "created_at": "2026-10-12T03:35:00.000000Z",
    "updated_at": "2026-10-12T03:35:00.000000Z"
  },
  "success": true,
  "message": "Catatan berhasil disimpan."
}
```

---

### 3. Update Catatan Standar (`PUT /api/notes/{id}`)
Memperbarui judul atau isi blok EditorJS. Hanya dapat dilakukan oleh pemilik catatan atau user yang memiliki permission `edit`.

- **Method**: `PUT`
- **URL**: `/api/notes/{id}`
- **Body Request**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `title` | `string` | Opsional | Judul baru catatan |
  | `content` | `array/object` | Opsional | Struktur JSON blok EditorJS baru |

- **Contoh Request Body**:
```json
{
  "title": "Catatan Review Arsitektur (Revisi 1)",
  "content": {
    "time": 1727671000000,
    "blocks": [
      {
        "type": "paragraph",
        "data": { "text": "Poin revisi ditambahkan." }
      }
    ]
  }
}
```

- **Response Success (`200 OK`)**:
```json
{
  "data": {
    "id": 2,
    "title": "Catatan Review Arsitektur (Revisi 1)",
    "content": { ... },
    "share_type": "private",
    "updated_at": "2026-10-12T03:40:00.000000Z"
  },
  "success": true,
  "message": "Catatan berhasil diperbarui."
}
```

---

### 4. Bagikan Catatan ke Semua Tim (`POST /api/notes/{id}/share-public`)
Mengubah visibilitas catatan menjadi `public` (semua anggota tim dapat membaca catatan ini secara Read-Only). Hanya pemilik catatan yang dapat membagikan.

- **Method**: `POST`
- **URL**: `/api/notes/{id}/share-public`
- **Response Success (`200 OK`)**:
```json
{
  "data": {
    "id": 2,
    "share_type": "public"
  },
  "success": true,
  "message": "Catatan berhasil dibagikan ke semua tim (Read-Only)."
}
```

---

### 5. Undang Akses Karyawan Tertentu (`POST /api/notes/{id}/share-invited`)
Mengundang karyawan tertentu dengan hak akses baca (`read`) atau edit (`edit`). Status share otomatis berubah menjadi `invited`.

- **Method**: `POST`
- **URL**: `/api/notes/{id}/share-invited`
- **Body Request**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `shares` | `array` | Ya | Daftar karyawan yang diundang |
  | `shares.*.employee_code` | `string` | Ya | Kode karyawan |
  | `shares.*.employee_name` | `string` | Opsional | Nama karyawan |
  | `shares.*.permission` | `string` | Ya | `read` atau `edit` |

- **Contoh Request Body**:
```json
{
  "shares": [
    {
      "employee_code": "2CltaMwH",
      "employee_name": "Andreas",
      "permission": "edit"
    },
    {
      "employee_code": "x7rhtim8",
      "employee_name": "Achmad Shofyan",
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
    "share_type": "invited",
    "shares": [ ... ]
  },
  "success": true,
  "message": "Undangan akses catatan berhasil disimpan."
}
```

---

### 6. Kompatibilitas Pembuatan Notulen (`POST /api/notes/meeting`)
Endpoint kompatibilitas untuk klien lama. Request langsung diarahkan ke handler Notulen Meeting dan disimpan di database `progress_meeting_notes_db`.

- **Method**: `POST`
- **URL**: `/api/notes/meeting`
- *(Parameter & response selengkapnya lihat di [Dokumentasi API Notulen Meeting](file:///home/shofyan/Developments/notes-service/docs/meeting-notes-api.md))*
