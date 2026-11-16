# Panduan Integrasi Frontend: Temuan & Daily Progress

Dokumen ini adalah panduan lengkap implementasi bagi tim Frontend terkait integrasi **Temuan** di dalam fitur **Daily Progress (DP)**.

---

## 1. Konsep & Arsitektur Backend (Otomatisasi)

> **Prinsip Utama:**
> Frontend **TIDAK PERLU** menembak endpoint Solusi (`POST /api/solusi`) secara terpisah saat user menyelesaikan temuan melalui Daily Progress.
> Backend secara otomatis menangani sinkronisasi status temuan dan pencatatan solusi dalam satu transaksi atomik saat endpoint Daily Progress dipanggil.

```
                       +---------------------------------------+
                       |             FRONTEND                  |
                       |  User input DP (Pekerjaan & Temuan)   |
                       +-------------------+-------------------+
                                           |
                                           | POST /api/daily-progress
                                           | atau PUT /api/daily-progress/{id}
                                           v
                       +---------------------------------------+
                       |             BACKEND DP                |
                       |       (DailyProgressService)          |
                       +-------------------+-------------------+
                                           |
                 +-------------------------+-------------------------+
                 |                                                   |
                 v                                                   v
   [1. Simpan Task/Pekerjaan]                             [2. Sinkronisasi Temuan]
   - details[] (opsional jika ada temuan)                 - Update status DP Temuan
                                                          - Jika status = "selesai":
                                                            * Tutup status Temuan -> "selesai"
                                                            * Buat Solusi (source: daily_progress)
                                                          - Jika status = "pending":
                                                            * Update status Temuan -> "pending"
                                                            * Simpan alasan_pending
```

---

## 2. Pembuatan Daily Progress (`POST /api/daily-progress`)

### Skenario A: DP Normal (Pekerjaan + Temuan)
User mengerjakan checklist harian sekaligus menyelesaikan/menindaklanjuti temuan.

```json
{
  "tanggal": "2026-11-13",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "bulan": 11,
  "tahun": 2026,
  "details": [
    {
      "als_job_id": 1,
      "als_job_task_id": 15,
      "status": "selesai",
      "catatan": null
    }
  ],
  "temuans": [
    {
      "id": 901,
      "status": "selesai",
      "solusi": "Kran pipa telah diganti dengan tipe kuningan baru."
    }
  ]
}
```

### Skenario B: DP Khusus Temuan (Tanpa Pekerjaan)
User pada hari tersebut **hanya fokus menyelesaikan temuan**. Field `details` boleh dikirim sebagai array kosong `[]` atau tidak disertakan sama sekali.

```json
{
  "tanggal": "2026-11-13",
  "client_code": "CLIENT-001",
  "als_spk_id": 10,
  "bulan": 11,
  "tahun": 2026,
  "temuans": [
    {
      "id": 901,
      "status": "selesai",
      "solusi": "Pembersihan area filter AC dan penggantian busa filter."
    },
    {
      "id": 902,
      "status": "pending",
      "alasan_pending": "Menunggu kedatangan bearing cadangan dari gudang pusat."
    }
  ]
}
```

> **Validasi Backend:**
> Minimal salah satu antara `details` (pekerjaan) atau `temuans` / `temuan_ids` / `finding_ids` (temuan) harus diisi. Jika keduanya kosong, API mengembalikan HTTP 422:
> `{"message": "Minimal satu pekerjaan atau temuan harus dipilih/ditindaklanjuti."}`

---

## 3. Update & Koreksi Daily Progress

Tersedia 2 endpoint untuk update tergantung konteks UI:

### A. Update Cepat Status DP (`PUT /api/daily-progress/{dailyProgress}`)
Digunakan pada modal/layar penyelesaian tugas hari itu:
- Mengubah status pekerjaan di `details` (`open` -> `selesai` / `pending`).
- Mengubah status tindak lanjut temuan di `temuans` (`pending` -> `selesai` + `solusi`).

```json
{
  "details": [
    {
      "id": 101,
      "status": "selesai",
      "catatan": null
    }
  ],
  "temuans": [
    {
      "id": 902,
      "status": "selesai",
      "solusi": "Bearing cadangan telah dipasang dan ditest run aman."
    }
  ]
}
```

### B. Edit Total Form DP (`PUT /api/daily-progress/{dailyProgress}/edit`)
Digunakan jika user salah memilih SPK, tanggal, atau ingin menambah/mengurangi daftar pekerjaan dan temuan yang ditautkan ke DP.
*(Catatan: hanya dapat diedit pada hari yang sama dan untuk task yang belum berstatus `selesai`).*

---

## 4. Struktur Data Temuan pada Response Daily Progress

Ketika memanggil `GET /api/daily-progress/{id}` atau `GET /api/daily-progress`, response menyertakan array `temuans`:

```json
{
  "id": 1,
  "nomor": "DP-20261113-001",
  "tanggal": "2026-11-13",
  "client_code": "CLIENT-001",
  "no_spk": "SPK-2026/11/0001",
  "details": [],
  "temuans": [
    {
      "id": 901,
      "nomor": "TM-20261111-001",
      "type": "TM",
      "priority": 4,
      "status": "selesai",
      "dp_followup": {
        "status": "selesai",
        "alasan_pending": null,
        "solusi": "Kran pipa telah diganti dengan tipe kuningan baru."
      },
      "notes": [
        {
          "id": 12,
          "task_category": "master",
          "task": {
            "id": 20,
            "task_name": "Instalasi Plumbing"
          },
          "note": "Kebocoran pada kran valve utama"
        }
      ],
      "files": []
    }
  ]
}
```

---

## 5. Rekomendasi Alur UI / UX untuk Frontend

1. **Form Tambah Daily Progress (`/daily-progress/create`)**:
   - Berikan 2 section: **Section Pekerjaan (Task)** dan **Section Tindak Lanjut Temuan**.
   - Pengguna dapat mengisi keduanya, **atau hanya mengisi salah satu**.
   - Tombol "Simpan" tetap aktif selama minimal salah satu section memiliki minimal 1 item yang dipilih.
   - Pada dropdown/modal pilih temuan:
     - Ambil daftar temuan open/pending dari: `GET /api/temuan?client_code={client}&als_spk_id={spk_id}&status=open,pending`.
     - Ketika temuan dipilih, berikan radio button:
       - **Selesai**: Wajibkan input textarea `Solusi`.
       - **Pending**: Wajibkan input textarea `Alasan Pending`.

2. **Daftar Daily Progress (`/daily-progress`)**:
   - Jika sebuah DP tidak memiliki task pekerjaan (`details.length === 0`), tampilkan badge/indikator khusus di kartu DP, misalnya:
     - Badge biru: `5 Task Pekerjaan`
     - Badge kuning: `2 Temuan Ditindaklanjuti`
     - Atau gabungan keduanya.

3. **Status Realtime**:
   - Setelah DP berhasil disimpan dengan temuan berstatus `selesai`, jika user membuka modul Temuan (`/temuan`), status temuan tersebut otomatis sudah berubah menjadi `selesai` dan memiliki riwayat solusi bertanda `source: "daily_progress"` tanpa perlu reload paksa atau trigger API tambahan.
