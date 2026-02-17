'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Upload, Download, Loader2, Edit, Trash2, FileText, Settings } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { SearchInput } from '@/components/molecules/SearchInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/FilterDropdown';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Lecturer {
  _id: string;
  name: string;
  nip: string;
  phone?: string;
  expertise: string[];
  status?: string;
}

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
      <td className="px-4 py-3"><Skeleton className="h-6 w-16" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
    </tr>
  );
}

// CSV Parser untuk Dosen (Simplified: Index, Nama, NIP only)
function parseDosenCSV(file: File): Promise<{ nama: string; nip: string }[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const h = header.toLowerCase().trim();
        if (h.includes('nama')) return 'nama';
        if (h.includes('nip') || h.includes('no')) return 'nip';
        if (h.includes('index') || h.includes('no')) return 'index';
        return h;
      },
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const dosens = data
          .filter((row) => row.nama && row.nip)
          .map((row) => ({
            nama: row.nama.trim(),
            nip: row.nip.trim(),
          }));
        resolve(dosens);
      },
      error: (error) => {
        reject(new Error(`Gagal membaca file CSV: ${error.message}`));
      },
    });
  });
}

// Generate sample CSV (Simplified)
function generateSampleDosenCSV(): string {
  const headers = ['Index', 'Nama', 'NIP'];
  const sampleData = [
    ['1', 'Dr. Ahmad Fauzi, M.T.', '198001011990011001'],
    ['2', 'Prof. Siti Rahma, Ph.D.', '197505021998022002'],
    ['3', 'Ir. Budi Santoso, M.Eng.', '198203032005031003'],
  ];
  const csvContent = [
    headers.join(','),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  return csvContent;
}

export default function ManajemenDosenPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expertiseFilter, setExpertiseFilter] = React.useState<string>('semua');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [editingDosen, setEditingDosen] = React.useState<Lecturer | null>(null);
  const [csvData, setCSVData] = React.useState<{ nama: string; nip: string }[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    nip: '',
    phone: '',
    status: 'active',
  });

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);
  const expertiseCategories = useQuery(api.expertise_categories.getAll);

  // Mutations
  const createLecturer = useMutation(api.lecturers.create);
  const updateLecturer = useMutation(api.lecturers.update);
  const deleteLecturer = useMutation(api.lecturers.remove);

  // Filter lecturers
  const filteredLecturers = React.useMemo(() => {
    if (!lecturers) return [];

    return lecturers.filter((lecturer) => {
      const matchesSearch =
        searchQuery === '' ||
        lecturer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lecturer.nip.includes(searchQuery);

      const matchesExpertise =
        expertiseFilter === 'semua' ||
        lecturer.expertise.some((exp) =>
          exp.toLowerCase().includes(expertiseFilter.toLowerCase())
        );

      return matchesSearch && matchesExpertise;
    });
  }, [lecturers, searchQuery, expertiseFilter]);

  const handleAddDosen = async () => {
    if (!formData.name || !formData.nip) {
      toast.error('Nama dan NIP wajib diisi');
      return;
    }

    try {
      await createLecturer({
        name: formData.name,
        nip: formData.nip,
        phone: formData.phone || undefined,
        status: formData.status,
      });

      toast.success('Dosen berhasil ditambahkan');
      setFormData({ name: '', nip: '', phone: '', status: 'active' });
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan dosen');
    }
  };

  const handleEditDosen = async () => {
    if (!editingDosen) return;

    try {
      await updateLecturer({
        id: editingDosen._id as any,
        name: formData.name || undefined,
        nip: formData.nip || undefined,
        phone: formData.phone || undefined,
        status: formData.status || undefined,
      });

      toast.success('Data dosen berhasil diperbarui');
      setEditingDosen(null);
      setFormData({ name: '', nip: '', phone: '', status: 'active' });
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui data dosen');
    }
  };

  const handleDeleteDosen = async (lecturer: Lecturer) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data ${lecturer.name}?`)) {
      try {
        await deleteLecturer({ id: lecturer._id as any });
        toast.success('Dosen berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus dosen');
      }
    }
  };

  const openEditDialog = (lecturer: Lecturer) => {
    setEditingDosen(lecturer);
    setFormData({
      name: lecturer.name,
      nip: lecturer.nip,
      phone: lecturer.phone || '',
      status: lecturer.status || 'active',
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseDosenCSV(file);
      setCSVData(data);
      toast.success(`${data.length} data dosen ditemukan`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membaca file CSV');
    }
  };

  const handleBulkUpload = async () => {
    if (csvData.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const dosen of csvData) {
        try {
          await createLecturer({
            name: dosen.nama,
            nip: dosen.nip,
            status: 'active',
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Berhasil menambahkan ${successCount} data dosen`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} data gagal ditambahkan (mungkin NIP duplikat)`);
      }

      setCSVData([]);
      setIsUploadDialogOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleDosenCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_dosen.csv';
    link.click();
  };

  const isLoading = lecturers === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Data Dosen</h1>
          <p className="text-muted-foreground">
            Kelola data dosen dan bidang kepakaran
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Unggah CSV
          </Button>
          <Link href="/admin/manage-expertise">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Atur Kepakaran
            </Button>
          </Link>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Dosen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          placeholder="Cari nama atau NIP..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          containerClassName="flex-1"
        />
        <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filter kepakaran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Kepakaran</SelectItem>
            {expertiseCategories?.map((cat) => (
              <SelectItem key={cat._id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Nama</th>
                <th className="px-4 py-3 text-left font-medium">NIP</th>
                <th className="px-4 py-3 text-left font-medium">Kepakaran</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredLecturers.length === 0 ? (
        <div className="rounded-lg border p-8 text-center bg-card">
          <p className="text-muted-foreground mb-4">
            {searchQuery || expertiseFilter !== 'semua'
              ? 'Tidak ada dosen yang sesuai dengan filter'
              : 'Belum ada data dosen. Tambahkan dosen pertama Anda.'}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Dosen
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">NIP</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Kepakaran</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLecturers.map((lecturer) => (
                  <tr
                    key={lecturer._id}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{lecturer.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {lecturer.nip}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lecturer.expertise.length > 0 ? (
                          <>
                            {lecturer.expertise.slice(0, 3).map((exp, index) => (
                              <Badge
                                key={index}
                                variant="success"
                                className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                              >
                                {exp}
                              </Badge>
                            ))}
                            {lecturer.expertise.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{lecturer.expertise.length - 3}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Belum diatur
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          lecturer.status === 'active'
                            ? 'success'
                            : lecturer.status === 'on leave'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {lecturer.status === 'active'
                          ? 'Aktif'
                          : lecturer.status === 'on leave'
                          ? 'Cuti'
                          : lecturer.status || 'Aktif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lecturer as Lecturer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDosen(lecturer as Lecturer)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Tambah Dosen Baru</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="nip">NIP</Label>
                <Input
                  id="nip"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Masukkan NIP"
                />
              </div>
              <div>
                <Label htmlFor="phone">No. WhatsApp (opsional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="contoh: 08123456789"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="on leave">Cuti</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Kepakaran dapat diatur kemudian melalui menu "Atur Kepakaran"
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setFormData({ name: '', nip: '', phone: '', status: 'active' });
                }}
              >
                Batal
              </Button>
              <Button onClick={handleAddDosen}>Simpan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingDosen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Edit Data Dosen</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Nama Lengkap</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-nip">NIP</Label>
                <Input
                  id="edit-nip"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">No. WhatsApp</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="contoh: 08123456789"
                />
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="on leave">Cuti</SelectItem>
                    <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Untuk mengubah kepakaran, gunakan menu "Atur Kepakaran"
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingDosen(null);
                  setFormData({ name: '', nip: '', phone: '', status: 'active' });
                }}
              >
                Batal
              </Button>
              <Button onClick={handleEditDosen}>Simpan Perubahan</Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV Dialog */}
      {isUploadDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Unggah Data Dosen CSV</h2>

            {csvData.length === 0 ? (
              <>
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Format kolom: <strong>Index, Nama, NIP</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Kepakaran dapat diatur kemudian melalui menu "Atur Kepakaran"
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload">
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>Pilih File CSV</span>
                      </Button>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      Unduh Template
                    </Button>
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Batal
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {csvData.length} data dosen siap diunggah
                </p>
                <div className="max-h-60 overflow-y-auto border rounded-lg mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">NIP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((d, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{d.nama}</td>
                          <td className="px-3 py-2 font-mono text-xs">{d.nip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCSVData([])}
                    disabled={isUploading}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleBulkUpload} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Mengunggah...
                      </>
                    ) : (
                      `Unggah ${csvData.length} Data`
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
