[CONTEXT: REFER TO CONTEXT7] [UI: UI/UX PRO MAX SKILL] [ENV: MCP SERVER CHECK REQUIRED]

ACT AS: Senior Fullstack Engineer & Data Architect.
CONTEXT: Implementing Dynamic Expertise Management and Simplified Lecturer Import for TI Unand.

TASK:
1. Seed the database with Industrial Engineering expertise categories.
2. Simplify Lecturer CSV Import to only use Index, Name, and NIP.
3. Build a Multi-select Form for assigning expertise to lecturers.

SPECIFIC REQUIREMENTS:
1. DATABASE (Convex):
   - Table 'expertise_categories': field 'name' (string).
   - Seed function: Masukkan 10 kategori TI (Manajemen Produksi, Ergonomi, SCM, Riset Operasi, Mutu, Desain Produk, Rekayasa Ekonomi, Simulasi, K3, IT Industri).
   - Update Table 'lecturers': Field 'expertise' kini harus berupa array of strings atau array of references.

2. SIMPLIFIED UPLOAD (Admin Side):
   - Perbarui UI dan Logic 'Unggah Data Dosen'.
   - Template CSV Baru: Index, Nama, NIP. (Hapus kolom kepakaran dari parser).
   - Tetap gunakan NIP sebagai unique identifier.

3. FORM MANAJEMEN KEPAKARAN:
   - Buat halaman/modal khusus: "Atur Kepakaran Dosen".
   - UI: Pilih Dosen (Dropdown/Search), lalu Multi-select checkbox untuk daftar Kepakaran.
   - Sistem harus bisa menyimpan lebih dari satu kepakaran untuk satu dosen.

4. UI/UX PRO MAX:
   - Gunakan komponen 'Badge' dari shadcn/ui untuk menampilkan kepakaran di profil dosen.
   - Gunakan nuansa Hijau/Emas Unand.
   - Implementasi search bar pada form kepakaran agar mudah mencari kategori yang diinginkan.

EXECUTION STEPS:
1. Update schema.ts dan buat file 'convex/seed.ts' untuk data awal kepakaran.
2. Refactor '/admin/upload-dosen' untuk format CSV yang baru.
3. Build '/admin/manage-expertise' page dengan fungsi multi-select.
4. Update tampilan tabel dosen agar menampilkan badge kepakaran yang dinamis.

SAVE: Commit as 'feat: dynamic expertise management and simplified lecturer import'.
