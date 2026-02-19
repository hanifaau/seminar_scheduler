[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer & Logic Specialist.
CONTEXT: Refine Schema & Implement Automatic Validation for "Seminar Scheduler TI Unand".

TASK:
Update Seminar Request Flow to support Dual Supervisors and Automatic Examiner Validation.

SPECIFIC REQUIREMENTS:
1. DATABASE UPDATES (Convex):
   - Refactor table 'seminar_requests':
     - Ganti 'supervisor_id' menjadi 'supervisor_1_id' (Wajib).
     - Tambahkan 'supervisor_2_id' (Opsional).
     - Pastikan field 'examiner_1_id' dan 'examiner_2_id' tetap tersedia.

2. FORM PERMOHONAN (Admin Side):
   - Perbarui form input mahasiswa untuk mencakup dua dropdown dosen: "Pembimbing Utama" dan "Pembimbing Kedua (Opsional)".
   - Label bahasa Indonesia: "Pembimbing Utama" dan "Pembimbing Pendamping".

3. VALIDASI OTOMATIS (Kaprodi Side):
   - Implementasi logika validasi pada fungsi 'alokasi penguji':
     - IF (Penguji 1 ATAU Penguji 2) == (Pembimbing 1 ATAU Pembimbing 2) THEN Tampilkan Error "Dosen Pembimbing tidak boleh menjadi Penguji".
     - IF (Penguji 1) == (Penguji 2) THEN Tampilkan Error "Penguji 1 dan 2 tidak boleh dosen yang sama".
   - UI: Di dropdown pemilihan penguji, filter atau beri peringatan visual jika dosen tersebut adalah pembimbing mahasiswa yang bersangkutan.

4. UI/UX PRO MAX:
   - Gunakan toast notification (seperti sonner atau shadcn toast) untuk menampilkan pesan validasi tersebut.
   - Tetap pertahankan nuansa akademik Universitas Andalas.

EXECUTION STEPS:
1. Update schema.ts di Convex dan deploy perubahan.
2. Refactor komponen Form di page '/admin/permohonan'.
3. Tambahkan fungsi validasi di file mutasi Convex (misal: 'seminars:allocateExaminers').
4. Perbarui UI di page '/kaprodi/alokasi' untuk mencerminkan batasan baru ini.

SAVE: Commit sebagai 'logic: dual supervisor support and examiner auto-validation'.
