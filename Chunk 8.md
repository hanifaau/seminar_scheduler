[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Backend Developer & Algorithm Expert.
CONTEXT: Implementing the "Pre-Teaching Intersection" Scheduling Engine.

TASK:
Build the automated slot discovery engine for Seminar Requests.

SPECIFIC REQUIREMENTS:
1. CONVEX LOGIC (convex/scheduling.ts):
   - Buat query 'findAvailableSlots' yang menerima 'seminar_id'.
   - Ambil data NIP untuk: Pembimbing 1, Pembimbing 2 (jika ada), Penguji 1, dan Penguji 2.
   - Algoritma: 
     a. Ambil semua 'teaching_schedules' dosen tersebut pada minggu yang dipilih.
     b. Cari blok waktu kosong (intersection) di antara jam 08:00 - 17:00 (Senin-Jumat).
     c. Hitung durasi jendela waktu sebelum jadwal mengajar berikutnya dimulai.
     d. Masukkan buffer 5 menit sebelum dosen mulai mengajar.

2. SEARCH CRITERIA:
   - IDEAL: Proposal >= 60 menit, Hasil/Sidang >= 90 menit.
   - ALTERNATIVE: Required Duration minus 10 minutes (Tandai sebagai saran alternatif).
   - Tampilkan maksimal 10 rekomendasi slot terbaik dalam seminggu.

3. UI/UX - SCHEDULING INTERFACE:
   - Buat modal atau halaman "Penentuan Jadwal" di Dashboard Admin.
   - Visualisasi: Gunakan warna Emerald (#10b981) untuk slot Ideal dan Amber (#f59e0b) untuk slot Alternatif.
   - Tampilkan detail: "Jam 08:00 - 09:15 (Tersedia 75 menit sebelum Dosen X mengajar)".

4. FINALIZATION:
   - Saat Admin memilih slot, jalankan mutasi untuk update 'seminar_requests':
     - set scheduled_date, start_time, end_time.
     - set status = "scheduled".

EXECUTION STEPS:
1. Refactor schema.ts jika diperlukan untuk mendukung field jam mulai/selesai yang presisi.
2. Tulis helper function untuk 'timeRangeIntersection' di Convex.
3. Build UI Slot Picker menggunakan komponen Shadcn/UI (Scroll Area & Cards).
4. Pastikan logo Unand dan nuansa Hijau/Emas tetap konsisten.

SAVE: Commit as 'feat: core intelligent scheduling engine with pre-teaching logic'.
