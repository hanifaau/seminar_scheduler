[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer (Security & RBAC Specialist).
CONTEXT: Implementing Role Management and Administrative Staff CRUD for TI Unand.

TASK:
Build an Administrative Staff Management system and a Role Assignment dashboard.

SPECIFIC REQUIREMENTS:
1. DATABASE UPDATES (Convex):
   - Table 'staff': id_pegawai (unique), name, role (admin_akademik/sekprodi/kaprodi), status.
   - Table 'lecturers': Tambahkan field 'role' (dosen/kaprodi/sekprodi).
   - [cite_start]Pastikan setiap user di Convex memiliki field 'role' untuk otorisasi akses.

2. HALAMAN MANAJEMEN PEGAWAI:
   - Buat CRUD untuk Pegawai Administrasi (Bukan Dosen).
   - Input: Nama, ID Pegawai, dan Role Awal.
   - Tampilkan daftar pegawai dalam tabel yang rapi (Bahasa Indonesia).

3. HALAMAN PENGATURAN PERAN (ROLE ASSIGNMENT):
   - Buat UI untuk memberikan peran 'Kaprodi' atau 'Sekprodi' kepada Dosen terpilih.
   - Logika: Hanya boleh ada 1 Kaprodi dan 1 Sekprodi yang aktif secara sistem (berikan peringatan jika sudah ada yang menjabat).
   - Gunakan dropdown untuk memilih dosen dan tombol "Tetapkan sebagai Kaprodi/Sekprodi".

4. UI/UX PRO MAX:
   - Dashboard: Tampilkan profil singkat siapa Kaprodi dan Sekprodi saat ini di widget sidebar.
   - [cite_start]Gunakan nuansa hijau akademik Unand (#15803d) dan validasi form yang ketat[cite: 31, 214].
   - Implementasi toast notification untuk setiap perubahan role.

EXECUTION STEPS:
1. Update schema.ts di folder Convex untuk mencakup tabel 'staff' dan field role baru.
2. Buat page '/admin/staff' untuk CRUD pegawai.
3. Buat page '/admin/roles' untuk manajemen jabatan Kaprodi & Sekprodi.
4. [cite_start]Update otorisasi di semua page agar hanya role yang sesuai yang bisa melihat konten tertentu.

SAVE: Commit as 'feat: admin staff crud and role management for kaprodi/sekprodi'.
