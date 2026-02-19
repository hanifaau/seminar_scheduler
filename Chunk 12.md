[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer & Database Strategist.
CONTEXT: Implementing Simplified Course Upload and Master-to-Schedule Mapping for TI Unand.

TASK:
Refactor the Course Ingestion flow to use a minimal CSV format linked to a Master Course list.

SPECIFIC REQUIREMENTS:
1. DATABASE SCHEMA UPDATES (Convex):
   - Table 'courses': Add 'name' (unique), 'sks', and 'lecturer_ids' (array of IDs).
   - Table 'teaching_schedules': lecturer_id, course_id, day, start_time, end_time, room.

2. HALAMAN MASTER MATA KULIAH:
   - Buat CRUD untuk Mata Kuliah. 
   - Di sini Admin menentukan Nama MK, Jumlah SKS (2/3), dan memilih Tim Dosen Pengampu (Multi-select).

3. MINIMALIST CSV UPLOAD (Admin Side):
   - Format CSV Baru: Hari, Waktu, Mata Kuliah, Ruangan.
   - Logic: 
     a. Cari 'course_id' berdasarkan Nama Mata Kuliah di CSV.
     b. Ambil daftar 'lecturer_ids' dari mata kuliah tersebut.
     c. Buat entri jadwal (teaching_schedules) untuk SETIAP dosen yang terdaftar di mata kuliah tersebut secara otomatis.

4. UI/UX PRO MAX:
   - Tambahkan instruksi di Laman Unggah: "Pastikan Nama Mata Kuliah di CSV sama persis dengan yang ada di Master Mata Kuliah."
   - Tampilkan laporan setelah unggah: "X Slot berhasil diimpor dan dihubungkan ke Y Dosen."
   - Warna Hijau/Emas Unand dan logo tetap dipertahankan.

EXECUTION STEPS:
1. Update schema.ts untuk mendukung relasi 'courses' dan 'lecturers'.
2. Bangun UI CRUD di '/admin/courses'.
3. Refactor mutasi 'importCourseSchedule' di Convex untuk menjalankan logika Auto-Mapping.
4. Update UI di '/admin/upload-jadwal' sesuai format minimalis yang baru.

SAVE: Commit as 'refactor: simplified csv upload with master course mapping logic'.
