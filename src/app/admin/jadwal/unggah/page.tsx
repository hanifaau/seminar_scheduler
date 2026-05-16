'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Trash2, Power, Upload, Loader2, CalendarRange, Check, X, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { cn } from '@/lib/utils';

export default function ScheduleGroupsPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  // Form State
  const [groupName, setGroupName] = React.useState('');
  const [groupType, setGroupType] = React.useState('reguler');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // Queries
  const groups = useQuery(api.teaching_schedules.getGroups);

  // Mutations
  const createGroup = useMutation(api.teaching_schedules.createGroup);
  const toggleGroupActive = useMutation(api.teaching_schedules.toggleGroupActive);
  const deleteGroup = useMutation(api.teaching_schedules.deleteGroup);
  const importSmartSchedule = useMutation(api.teaching_schedules.importSmartSchedule);

  const handleToggleActive = async (id: any, currentStatus: boolean) => {
    try {
      await toggleGroupActive({ id, isActive: !currentStatus });
      toast.success(currentStatus ? 'Jadwal dinonaktifkan' : 'Jadwal diaktifkan');
    } catch (error) {
      toast.error('Gagal mengubah status jadwal');
    }
  };

  const handleDeleteGroup = async (id: any, name: string) => {
    if (!confirm(`Hapus jadwal "${name}" beserta seluruh isinya? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await deleteGroup({ id });
      toast.success('Jadwal berhasil dihapus');
    } catch (error) {
      toast.error('Gagal menghapus jadwal');
    }
  };

  const processUpload = async () => {
    if (!selectedFile || !groupName) {
      toast.error('Nama jadwal dan file Excel wajib diisi');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Create Group first
      const groupId = await createGroup({
        name: groupName,
        type: groupType,
        isActive: false, // Default nonaktif
      });

      // 2. Parse Excel File
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          // Get raw rows (array of arrays)
          const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: '' });

          if (!rows || rows.length === 0) throw new Error('File kosong');

          // Find Header Row
          let headerRowIdx = -1;
          let colIdx = { hari: -1, waktu: -1, matkul: -1, dosen: -1, ruang: -1 };

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i].map(c => String(c).toLowerCase().trim());
            
            const hariIdx = row.findIndex(c => c.includes('hari') || c === 'day');
            const waktuIdx = row.findIndex(c => c.includes('waktu') || c.includes('jam') || c === 'time');
            const matkulIdx = row.findIndex(c => c.includes('mata kuliah') || c.includes('matkul') || c.includes('course'));
            const dosenIdx = row.findIndex(c => c.includes('dosen') || c.includes('pengampu'));
            const ruangIdx = row.findIndex(c => c.includes('ruang'));

            // We need at least Hari, Waktu, Matkul, and Dosen to proceed
            if (hariIdx > -1 && waktuIdx > -1 && matkulIdx > -1 && dosenIdx > -1) {
              headerRowIdx = i;
              colIdx = { hari: hariIdx, waktu: waktuIdx, matkul: matkulIdx, dosen: dosenIdx, ruang: ruangIdx };
              break;
            }
          }

          if (headerRowIdx === -1) {
            throw new Error('Gagal menemukan baris header. Pastikan file memiliki kolom: Hari, Waktu, Mata Kuliah, dan Dosen Pengampu.');
          }

          const parsedSchedules = [];
          let lastHari = '';

          // Parse Data Rows
          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Fill down Hari if merged/empty
            let currentHari = String(row[colIdx.hari] || '').trim();
            if (!currentHari) {
              currentHari = lastHari; // use previous
            } else {
              lastHari = currentHari;
            }

            const waktuRaw = String(row[colIdx.waktu] || '').trim();
            const matkul = String(row[colIdx.matkul] || '').trim();
            const dosen = String(row[colIdx.dosen] || '').trim();
            const ruang = colIdx.ruang > -1 ? String(row[colIdx.ruang] || '').trim() : '';

            // Skip empty rows
            if (!waktuRaw || !matkul || !dosen) continue;

            // Parse time range e.g. "07.30 - 10.00" or "07:30-10:00"
            const timeMatch = waktuRaw.replace(/\s+/g, '').match(/^(\d{1,2}[:\.][0-5]\d)-(\d{1,2}[:\.][0-5]\d)$/);
            let startTime = '', endTime = '';
            
            if (timeMatch) {
              startTime = timeMatch[1].replace('.', ':').padStart(5, '0');
              endTime = timeMatch[2].replace('.', ':').padStart(5, '0');
            } else {
              // try to parse if only one time is provided or split by space
              continue; // skip invalid time for now
            }

            parsedSchedules.push({
              day: currentHari,
              startTime,
              endTime,
              activity: matkul,
              room: ruang,
              lecturerNames: dosen,
            });
          }

          if (parsedSchedules.length === 0) {
            throw new Error('Tidak ada data jadwal valid yang ditemukan di bawah baris header.');
          }

          // Send to backend
          const result = await importSmartSchedule({
            groupId: groupId,
            schedules: parsedSchedules,
          });

          toast.success(result.message);
          setIsUploadDialogOpen(false);
          setGroupName('');
          setSelectedFile(null);

        } catch (error: any) {
          // If error happens during parsing, delete the empty group we just created
          await deleteGroup({ id: groupId });
          toast.error(error.message || 'Gagal memproses file Excel');
        } finally {
          setIsUploading(false);
        }
      };

      reader.readAsArrayBuffer(selectedFile);
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat grup jadwal');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Jadwal</h1>
          <p className="text-muted-foreground">
            Kelola kumpulan jadwal dosen (Reguler, UTS, UAS, dll) untuk pencarian slot seminar
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Unggah Jadwal Baru
        </Button>
      </div>

      {groups === undefined ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border p-12 text-center bg-card">
          <CalendarRange className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Belum ada kumpulan jadwal</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Unggah file jadwal Excel dari Kaprodi untuk mulai menggunakan sistem penjadwalan.
          </p>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Unggah Sekarang
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group._id}
              className={cn(
                "rounded-xl border p-5 transition-all",
                group.isActive ? "border-emerald-500 shadow-md bg-emerald-50/50 dark:bg-emerald-950/10" : "bg-card hover:shadow-sm"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <Badge variant={group.isActive ? 'default' : 'secondary'} className={group.isActive ? 'bg-emerald-500' : ''}>
                    {group.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <Badge variant="outline" className="ml-2 uppercase text-[10px]">
                    {group.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteGroup(group._id, group.name)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2 -mt-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="font-bold text-lg mb-1 leading-tight">{group.name}</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Dibuat: {new Date(group.createdAt).toLocaleDateString('id-ID')}
              </p>

              <Button
                variant={group.isActive ? "outline" : "default"}
                className={cn("w-full", group.isActive && "border-emerald-500 text-emerald-600 hover:bg-emerald-50")}
                onClick={() => handleToggleActive(group._id, group.isActive)}
              >
                <Power className="h-4 w-4 mr-2" />
                {group.isActive ? 'Matalkan Aktif' : 'Aktifkan Jadwal'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {isUploadDialogOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Unggah Jadwal Baru
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setIsUploadDialogOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  Sistem akan otomatis mendeteksi tabel jadwal Anda. Pastikan baris judul (header) mengandung teks seperti <strong>Mata Kuliah</strong>, <strong>Dosen</strong>, <strong>Hari</strong>, dan <strong>Waktu</strong>. File berformat <strong>.xlsx</strong> sangat disarankan.
                </p>
              </div>

              <div>
                <Label htmlFor="name">Nama Jadwal</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Jadwal Reguler Semester Genap 2025/2026"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipe Jadwal</Label>
                <select
                  id="type"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="reguler">Perkuliahan Reguler</option>
                  <option value="uts">Ujian Tengah Semester (UTS)</option>
                  <option value="uas">Ujian Akhir Semester (UAS)</option>
                  <option value="libur">Pekan Libur / Kosong</option>
                </select>
              </div>

              <div>
                <Label htmlFor="file">File Excel (.xlsx)</Label>
                <div className="mt-1">
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
                Batal
              </Button>
              <Button onClick={processUpload} disabled={isUploading || !selectedFile || !groupName} className="min-w-[120px]">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Proses & Unggah'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
