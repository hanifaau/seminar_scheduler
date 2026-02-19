[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer (UI/UX & Data Specialist).
CONTEXT: Implementing Course Schedule Template & Simplified Importer for TI Unand.

TASK:
1. Create a downloadable CSV/Excel template for Admin.
2. Update the Course Schedule Importer to match the "Simplified Format".

SPECIFIC REQUIREMENTS:
1. TEMPLATE GENERATOR:
   - Tambahkan tombol "Unduh Template CSV" di laman Unggah Jadwal.
   - Headers Template: Hari, Waktu, Mata Kuliah, Dosen 1, Dosen 2, Dosen 3, Ruang.
   - Isi template dengan 1 baris contoh: "Senin", "07:30 - 10:00", "Perencanaan Produksi", "19850101...", "-", "-", "TI-01".

2. REFINED IMPORT LOGIC:
   - Pastikan parser 'papaparse' di frontend dapat membaca kolom 'Waktu' dan memecahnya menjadi 'startTime' & 'endTime'.
   - Sistem harus melakukan iterasi pada kolom Dosen 1, 2, dan 3. Jika kolom tidak kosong dan berisi NIP, simpan sebagai jadwal mengajar di Convex.
   - Gunakan skema: teaching_schedules { lecturer_id, day, startTime, endTime, courseName, room }.

3. UI/UX PRO MAX:
   - Tempatkan tombol "Unduh Template" bersisian dengan tombol "Pilih File CSV".
   - Gunakan icon 'Download' dari Lucide React atau Radix UI.
   - Pastikan skema warna tetap Hijau Emerald Unand (#15803d).
   - Tambahkan instruksi visual: "Pastikan format waktu adalah HH:mm - HH:mm".

4. DATABASE AUTO-SYNC:
   - Jika NIP Dosen dalam file belum ada di tabel 'lecturers', Agent wajib membuat entri dosen baru secara otomatis dengan placeholder nama.

EXECUTION STEPS:
1. Buat utilitas 'generateTemplate' menggunakan Blob API di Next.js untuk mengunduh file CSV.
2. Update komponen 'UploadForm' di `/admin/upload-kuliah`.
3. Perbarui mutasi 'importCourseSchedule' di Convex untuk menangani 3 kolom dosen sekaligus.
4. Lakukan verifikasi agar data tidak duplikat jika file diunggah dua kali.

SAVE: Commit as 'feat: simple course schedule importer with downloadable template'.
