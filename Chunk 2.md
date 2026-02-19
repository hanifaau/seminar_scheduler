[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Frontend Architect (Academic UI Specialist).
CONTEXT: Use standards from 'Context7_Specs.md' and execution rules from '.agentic-rules.md'.

TASK: 
Rebranding & UI/UX Overhaul: "Sistem Penjadwalan Seminar Teknik Industri Unand".

PRE-REQUISITES:
1. Ganti semua teks bahasa Inggris menjadi Bahasa Indonesia (Localization).
2. Gunakan 'Logo Unand PTNBH.jpg' di bagian Navbar.
3. Pastikan skema Convex mendukung field 'Kepakaran' (string array) dan 'NIP' (string).

SPECIFIC REQUIREMENTS:
1. DASHBOARD OVERHAUL:
   - Tampilkan Hari, Tanggal, Bulan, dan Tahun secara dinamis di header dashboard.
   - Tambahkan section "Jadwal Seminar Minggu Ini" yang mengambil data dari Convex.
   - Gunakan palet warna akademik: Hijau (#15803d), Emas (#ca8a04), dan abu-abu terang.

2. HALAMAN DOSEN (LECTURERS):
   - Gunakan judul "Manajemen Data Dosen".
   - Implementasi Fitur "Unggah CSV Dosen" dengan header kolom: Index, Nama, NIP, Kepakaran.
   - Gunakan library 'papaparse' untuk memproses CSV di sisi client.

3. HALAMAN KALENDER SEMINAR:
   - Buat view Kalender Bulanan menggunakan library (shadcn/ui calendar atau react-day-picker).
   - Fitur Interaktif: Jika user klik pada area minggu tertentu, tampilkan daftar seminar yang terjadwal di minggu tersebut di panel bawah/samping.

4. UI/UX PRO MAX:
   - Pastikan desain responsif: Dashboard lebar di laptop, tapi menjadi tumpukan kartu (cards) yang rapi di HP.
   - Tambahkan skeleton loading saat data sedang diambil dari Convex.

EXECUTION STEPS:
1. Update Navbar: Ganti Judul ke "Sistem Penjadwalan Seminar" dan pasang Logo Unand.
2. Refactor Dashboard: Implementasi widget waktu dan reactive query untuk jadwal mingguan.
3. Build Lecturers Page: Tambahkan modal upload CSV dan integrasikan dengan mutasi Convex.
4. Build Calendar Page: Implementasi UI kalender dan filter data berdasarkan range mingguan.

SAVE: Commit perubahan dengan pesan 'ui: rebranding to TI Unand and academic dashboard overhaul'.
