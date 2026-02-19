[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Backend Developer (Integration Specialist).
CONTEXT: Implementing WhatsApp Notification Module for TI Unand Seminar Scheduler.

TASK:
Create a notification system that sends automated WhatsApp messages when a seminar is scheduled.

SPECIFIC REQUIREMENTS:
1. CONVEX ACTION (convex/notifications.ts):
   - Buat sebuah 'action' (bukan mutation) bernama 'sendWhatsAppNotification'.
   - Fungsi ini akan dipanggil setelah status seminar berubah menjadi 'scheduled'.
   - Payload: Nama Mahasiswa, Jenis Seminar, Tanggal, Jam, Ruangan, dan Nama Dosen.

2. MESSAGE TEMPLATE (Bahasa Indonesia):
   - Format Pesan: 
     "Yth. Bapak/Ibu [Nama Dosen], 
     Anda dijadwalkan sebagai [Pembimbing/Penguji] pada:
     Seminar: [Jenis Seminar]
     Mahasiswa: [Nama] / [NIM]
     Waktu: [Hari, Tanggal, Jam]
     Ruang: [Nama Ruangan]
     Mohon kehadiran Bapak/Ibu tepat waktu. Terima kasih."

3. SECURITY & ENVIRONMENT:
   - Simpan API Key WhatsApp di 'Convex Environment Variables' (Dashboard Convex).
   - Jangan melakukan hardcode API Key di dalam kode.

4. UI TRIGGER:
   - Di Dashboard Admin, setelah pemilihan slot berhasil, munculkan opsi: "Kirim Notifikasi WhatsApp?".
   - Tampilkan status pengiriman (Loading/Success/Error).

EXECUTION STEPS:
1. Tambahkan konstanta API URL dan API Key di Convex Dashboard.
2. Buat file 'convex/notifications.ts' untuk logika pengiriman fetch API.
3. Hubungkan logika ini ke tombol 'Finalize Schedule' di UI Admin.
4. Tambahkan logging untuk memantau apakah pesan berhasil terkirim.

SAVE: Commit as 'feat: whatsapp notification module for scheduled seminars'.
