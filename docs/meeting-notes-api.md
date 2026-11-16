# Dokumentasi API - Group Notulen Meeting (`/api/meeting-notes` & `/api/notulen`)

Dokumentasi endpoint untuk modul **Notulen Rapat (Meeting Notes / Minutes)** pada microservice Notes Service.

---

## Informasi Umum & Database
- **Database Target**: `progress_notes_db` (Koneksi: `mysql`)
- **Tabel Terkait**: `meeting_notes`, `meeting_note_shares`
- **Model**: [`App\Models\MeetingNote`](file:///home/shofyan/Developments/notes-service/app/Models/MeetingNote.php), [`App\Models\MeetingNoteShare`](file:///home/shofyan/Developments/notes-service/app/Models/MeetingNoteShare.php)
- **Controller**: [`App\Http\Controllers\MeetingNoteController`](file:///home/shofyan/Developments/notes-service/app/Http/Controllers/MeetingNoteController.php)
- **Karakteristik Header**: Header dokumen rapat (`report_number`, `meeting_scope`, `client_id`, `title`, `attendees`, `content`).
- **Endpoint Alias**: Semua endpoint di bawah prefix `/api/meeting-notes` dapat diakses identik dengan prefix `/api/notulen`.

---

## Autentikasi & Header Permintaan
Semua request wajib menyertakan token autentikasi Progress:

```http
Authorization: Bearer <encrypted_progress_token>
Content-Type: application/json
Accept: application/json
```

Identitas user login diambil otomatis dari token:
- `auth_employee_code`: Kode karyawan pembuat (contoh: `2CltaMwH`)
- `auth_employee_name`: Nama lengkap karyawan (contoh: `Andreas`)

---

## Daftar Endpoint

| HTTP Method | URI Utama | URI Alias | Deskripsi | Handler |
|---|---|---|---|---|
| `GET` | `/api/meeting-notes` | `/api/notulen` | Mengambil daftar notulen yang dapat diakses | `MeetingNoteController@index` |
| `POST` | `/api/meeting-notes` | `/api/notulen` | Membuat notulen baru & auto presensi peserta | `MeetingNoteController@store` |
| `PUT` | `/api/meeting-notes/{id}` | `/api/notulen/{id}` | Mengubah data notulen rapat | `MeetingNoteController@update` |
| `POST` | `/api/meeting-notes/{id}/share-public` | `/api/notulen/{id}/share-public` | Membagikan notulen ke semua tim (Read-Only) | `MeetingNoteController@sharePublic` |
| `POST` | `/api/meeting-notes/{id}/share-invited` | `/api/notulen/{id}/share-invited` | Mengundang akses pengguna non-peserta | `MeetingNoteController@shareInvited` |

---

## Rincian Endpoint

### 1. List Notulen Meeting (`GET /api/meeting-notes`)
Mengambil seluruh notulen rapat dari tabel `meeting_notes` pada database `progress_notes_db` yang dapat diakses oleh user (dibuat sendiri, berstatus `public`, atau terdaftar sebagai peserta/share).

- **Method**: `GET`
- **URL**: `/api/meeting-notes` *(atau `/api/notulen`)*
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
      "author_employee_code": "2CltaMwH",
      "author_employee_name": "Andreas",
      "report_number": "NOTULEN/20261001/0001",
      "report_no": "NOTULEN/20261001/0001",
      "meeting_scope": "umum",
      "client_id": null,
      "title": "Notulen Meeting Minggu 1 Progress Report",
      "content": {
        "time": 1727670000000,
        "blocks": [
          {
            "type": "header",
            "data": { "text": "Notulen Meeting", "level": 2 }
          }
        ]
      },
      "share_type": "invited",
      "shares": [
        {
          "id": 1,
          "meeting_note_id": 1,
          "employee_code": "x7rhtim8",
          "employee_name": "Achmad Shofyan",
          "permission": "read",
          "is_attendance": true,
          "created_at": "2026-10-01T03:37:43.000000Z",
          "updated_at": "2026-10-01T03:37:43.000000Z"
        }
      ],
      "created_at": "2026-10-01T03:37:43.000000Z",
      "updated_at": "2026-10-01T04:29:27.000000Z"
    }
  ],
  "meta": {
    "total": 1,
    "per_page": 15
  }
}
```

---

### 2. Buat Notulen Meeting (`POST /api/meeting-notes`)
Menyimpan notulen rapat baru ke tabel `meeting_notes` pada database `progress_notes_db`. 
- **Nomor Report / Notulen (`report_number`)**: Dapat dikirim secara manual. Jika kosong/tidak disertakan, sistem otomatis men-generate format: `NOTULEN/YYYYMMDD/XXXX` (misal: `NOTULEN/20261012/0001`).
- Semua peserta pada `attendees` otomatis dicatat pada tabel `meeting_note_shares` dengan `is_attendance = true` dan `permission = read`. Kode pembuat (*author*) otomatis disaring agar izin tidak duplikat.

- **Method**: `POST`
- **URL**: `/api/meeting-notes` *(atau `/api/notulen`)*
- **Body Request**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `report_number` | `string` | Opsional | Nomor notulen / nomor report (otomatis digenerate jika kosong) |
  | `meeting_scope` | `string` | Ya | `umum` (rapat internal) atau `client` (rapat bersama klien) |
  | `client_id` | `integer` | Ya jika `meeting_scope = client` | ID klien |
  | `title` | `string` | Ya | Judul notulen rapat (maks 255 karakter) |
  | `author_employee_name` | `string` | Opsional | Nama pembuat notulen |
  | `attendees` | `array` | Ya (atau `attendee_codes`) | Daftar peserta: array objek `{ employee_code, employee_name }` |
  | `attendee_codes` | `array of string` | Alternatif | Daftar string kode karyawan peserta |
  | `content` | `array/object` | Ya | Payload JSON EditorJS hasil rapat |

- **Contoh Request Body**:
```json
{
  "report_number": "REP/ALS/2026/001",
  "meeting_scope": "client",
  "client_id": 42,
  "title": "Meeting Progress Klien ALS",
  "author_employee_name": "Andreas",
  "attendees": [
    {
      "employee_code": "x7rhtim8",
      "employee_name": "Achmad Shofyan"
    }
  ],
  "content": {
    "time": 1727670000000,
    "blocks": [
      {
        "type": "header",
        "data": { "text": "Pembahasan Desain", "level": 2 }
      },
      {
        "type": "paragraph",
        "data": { "text": "Penyelarasan alur approval dan layout laporan." }
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
    "author_employee_code": "2CltaMwH",
    "author_employee_name": "Andreas",
    "report_number": "REP/ALS/2026/001",
    "report_no": "REP/ALS/2026/001",
    "meeting_scope": "client",
    "client_id": 42,
    "title": "Meeting Progress Klien ALS",
    "content": { ... },
    "share_type": "invited",
    "shares": [
      {
        "id": 2,
        "meeting_note_id": 2,
        "employee_code": "x7rhtim8",
        "employee_name": "Achmad Shofyan",
        "permission": "read",
        "is_attendance": true,
        "created_at": "2026-10-12T03:45:00.000000Z",
        "updated_at": "2026-10-12T03:45:00.000000Z"
      }
    ],
    "created_at": "2026-10-12T03:45:00.000000Z",
    "updated_at": "2026-10-12T03:45:00.000000Z"
  },
  "success": true,
  "message": "Notulen berhasil disimpan dan dibagikan otomatis ke peserta hadir."
}
```

---

### 3. Update Notulen Meeting (`PUT /api/meeting-notes/{id}`)
Memperbarui judul, nomor report, cakupan rapat (`meeting_scope`), ID klien, atau konten blok notulen.

- **Method**: `PUT`
- **URL**: `/api/meeting-notes/{id}` *(atau `/api/notulen/{id}`)*
- **Body Request**:
  | Field | Tipe | Wajib | Keterangan |
  |---|---|---|---|
  | `report_number` | `string` | Opsional | Nomor report / nomor notulen baru |
  | `title` | `string` | Opsional | Judul notulen baru |
  | `meeting_scope` | `string` | Opsional | `umum` atau `client` |
  | `client_id` | `integer` | Opsional | ID klien jika scope client |
  | `content` | `array/object` | Opsional | Konten JSON EditorJS baru |

- **Contoh Request Body**:
```json
{
  "report_number": "REP/ALS/2026/001-REV",
  "title": "Meeting Progress Klien ALS (Revisi Final)",
  "meeting_scope": "client",
  "client_id": 42,
  "content": { ... }
}
```

- **Response Success (`200 OK`)**:
```json
{
  "data": {
    "id": 2,
    "report_number": "REP/ALS/2026/001-REV",
    "title": "Meeting Progress Klien ALS (Revisi Final)",
    "meeting_scope": "client",
    "client_id": 42,
    "updated_at": "2026-10-12T03:50:00.000000Z"
  },
  "success": true,
  "message": "Notulen berhasil diperbarui."
}
```

---

### 4. Bagikan Notulen ke Semua Tim (`POST /api/meeting-notes/{id}/share-public`)
Membuka akses notulen menjadi `public` (semua anggota tim dapat membaca notulen rapat ini secara Read-Only). Hanya pembuat notulen yang berhak membagikan.

- **Method**: `POST`
- **URL**: `/api/meeting-notes/{id}/share-public` *(atau `/api/notulen/{id}/share-public`)*
- **Response Success (`200 OK`)**:
```json
{
  "data": {
    "id": 2,
    "share_type": "public"
  },
  "success": true,
  "message": "Notulen berhasil dibagikan ke semua tim (Read-Only)."
}
```

---

### 5. Undang Akses Notulen ke Karyawan Lain (`POST /api/meeting-notes/{id}/share-invited`)
Memberikan izin akses (`read` atau `edit`) kepada karyawan non-peserta rapat.

- **Method**: `POST`
- **URL**: `/api/meeting-notes/{id}/share-invited` *(atau `/api/notulen/{id}/share-invited`)*
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
      "employee_code": "user456",
      "employee_name": "Siti Rahma",
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
  "message": "Undangan akses notulen berhasil disimpan."
}
```
