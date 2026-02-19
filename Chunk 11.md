[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer (Workflow & Logic Specialist).
CONTEXT: Implementing Manual Shift-Based Scheduling for TI Unand.

TASK:
Build a "Manual Course Setup" page that follows strict departmental shift rules for 2 SKS and 3 SKS.

SPECIFIC REQUIREMENTS:
1. DATABASE UPDATES (Convex):
   - Pastikan tabel 'courses' memiliki field 'sks' (number).
   - Tabel 'teaching_schedules' menyimpan: lecturer_id, course_id, day, shift_id, start_time, end_time, room.

2. UI - MANUAL SCHEDULING FORM:
   - Nama Laman: "Atur Jadwal Manual".
   - Field 1: Pilih Dosen (Searchable Dropdown).
   - Field 2: Pilih Mata Kuliah (Searchable Dropdown, tampilkan SKS-nya).
   - Field 3: Pilih Hari (Senin - Jumat).
   - Field 4: Pilih Shift (Dynamic Dropdown berdasarkan SKS dan Hari).
   - Field 5: Input Ruangan.

3. SHIFT RULES LOGIC (STRICT):
   - A. SISTEM 2 SKS:
     - Shift-1: 07.30 – 09.10 | Shift-2: 09.20 – 11.00
     - Shift-3: 11.10 – 12.50 (Sembunyikan jika JUMAT)
     - Shift-4: 13.30 – 15.10 | Shift-5: 16.00 – 17.40
   - B. SISTEM 3 SKS:
     - Shift-1: 07.30 – 10.00
     - Shift-2: 10.10 – 12.40 (Sembunyikan jika JUMAT)
     - Shift-3: 13.30 – 16.00
     - Shift-4: 16.00 – 17.40 (Label: Shift Sore 2 SKS)

4. VALIDATION:
   - Tampilkan pesan error jika Dosen yang dipilih sudah memiliki jadwal di jam tersebut.
   - Tampilkan pesan error jika Ruangan yang dipilih sudah digunakan di jam tersebut.

5. UI/UX PRO MAX:
   - Gunakan nuansa Hijau/Emas Unand.
   - Gunakan 'Select' component dari shadcn/ui yang elegan.
   - Implementasi success toast setelah jadwal berhasil disimpan.

EXECUTION STEPS:
1. Update schema.ts untuk mendukung mapping Shift-to-Time.
2. Buat file helper 'shiftLogic.ts' untuk menyimpan master jam sesuai deskripsi user.
3. Build page '/admin/manual-setup' dengan form yang reaktif terhadap pilihan SKS.
4. Hubungkan dengan mutasi Convex untuk menyimpan data ke 'teaching_schedules'.

SAVE: Commit as 'feat: manual scheduling with strict 2/3 SKS shift rules'.
