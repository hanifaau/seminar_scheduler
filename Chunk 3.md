[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer & Workflow Architect.
CONTEXT: Refine Business Process for "Seminar Scheduler Teknik Industri Unand".

TASK:
Implement Seminar Request and Examiner Allocation Flow.

SPECIFIC REQUIREMENTS:
1. DATABASE UPDATES (Convex):
   - Table 'seminar_requests': 
     student_name (string), nim (string), title (string), 
     type (Proposal/Hasil/Sidang), supervisor_id (id), 
     examiner_1_id (optional id), examiner_2_id (optional id),
     status (requested/allocated/scheduled).

2. HALAMAN ADMIN - PERMOHONAN SEMINAR:
   - Buat Form Input: Nama, NIM, Judul, Dropdown Jenis Seminar, Dropdown Dosen Pembimbing (ambil dari table lecturers).
   - Tampilkan "Daftar Permohonan Seminar" dengan status 'Menunggu Alokasi Penguji'.

3. HALAMAN KAPRODI - ALOKASI PENGUJI:
   - Buat filter sederhana untuk mencari Dosen berdasarkan 'Kepakaran'.
   - Kaprodi bisa memilih 2 penguji untuk setiap permohonan seminar.
   - Setelah disimpan, status seminar berubah menjadi 'Teralokasi' (Ready to Schedule).

4. UI/UX:
   - Dashboard Depan: Tambahkan widget "Antrean Penjadwalan" yang menampilkan seminar yang sudah punya penguji tapi belum punya waktu.
   - Tetap gunakan branding Unand (Hijau/Emas).

EXECUTION STEPS:
1. Update schema.ts di folder Convex sesuai field di atas.
2. Buat page '/admin/permohonan' untuk input data mahasiswa.
3. Buat page '/kaprodi/alokasi' untuk penentuan penguji.
4. Hubungkan data agar Dashboard menampilkan jumlah antrean seminar yang perlu dijadwalkan.

SAVE: Commit as 'feat: seminar request and examiner allocation workflow'.
