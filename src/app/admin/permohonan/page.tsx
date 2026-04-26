'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Edit, Trash2, Loader2, FileText, Users } from 'lucide-react';
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

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
      <td className="px-4 py-3"><Skeleton className="h-6 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-6 w-28" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
    </tr>
  );
}

const SEMINAR_TYPES = [
  { value: 'Proposal', label: 'Seminar Proposal' },
  { value: 'Hasil', label: 'Seminar Hasil' },
  { value: 'Sidang', label: 'Sidang Skripsi' },
];

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  requested: { label: 'Menunggu Alokasi', variant: 'warning' },
  allocated: { label: 'Siap Dijadwalkan', variant: 'secondary' },
  scheduled: { label: 'Terjadwal', variant: 'success' },
};

export default function PermohonanSeminarPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('semua');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRequest, setEditingRequest] = React.useState<any>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    studentName: '',
    nim: '',
    title: '',
    type: 'Proposal' as 'Proposal' | 'Hasil' | 'Sidang',
    supervisor1Id: '',
    supervisor2Id: '',
    examiner1Id: '',
    examiner2Id: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Queries
  const requests = useQuery(api.seminar_requests.getAllWithLecturers);
  const lecturers = useQuery(api.lecturers.getAll);

  // Mutations
  const createRequest = useMutation(api.seminar_requests.create);
  const updateRequest = useMutation(api.seminar_requests.update);
  const deleteRequest = useMutation(api.seminar_requests.remove);

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];

    return requests.filter((request) => {
      const matchesSearch =
        searchQuery === '' ||
        request.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.nim.includes(searchQuery) ||
        request.title.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'semua' || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  const handleSubmit = async () => {
    if (!formData.studentName || !formData.nim || !formData.title || !formData.supervisor1Id) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    // Validasi: Pembimbing Utama dan Pendamping tidak boleh sama
    if (formData.supervisor2Id && formData.supervisor1Id === formData.supervisor2Id) {
      toast.error('Pembimbing Utama dan Pembimbing Pendamping tidak boleh sama');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRequest) {
        await updateRequest({
          id: editingRequest._id,
          studentName: formData.studentName,
          nim: formData.nim,
          title: formData.title,
          type: formData.type,
          supervisor1Id: formData.supervisor1Id as any,
          supervisor2Id: formData.supervisor2Id as any || undefined,
          examiner1Id: formData.examiner1Id as any || undefined,
          examiner2Id: formData.examiner2Id as any || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Permohonan berhasil diperbarui');
      } else {
        await createRequest({
          studentName: formData.studentName,
          nim: formData.nim,
          title: formData.title,
          type: formData.type,
          supervisor1Id: formData.supervisor1Id as any,
          supervisor2Id: formData.supervisor2Id as any || undefined,
          notes: formData.notes || undefined,
        });
        toast.success('Permohonan berhasil ditambahkan');
      }

      setFormData({
        studentName: '',
        nim: '',
        title: '',
        type: 'Proposal',
        supervisor1Id: '',
        supervisor2Id: '',
        notes: '',
      });
      setIsDialogOpen(false);
      setEditingRequest(null);
    } catch (error) {
      toast.error('Gagal menyimpan permohonan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (request: any) => {
    setEditingRequest(request);
    setFormData({
      studentName: request.studentName,
      nim: request.nim,
      title: request.title,
      type: request.type,
      supervisor1Id: request.supervisor1Id,
      supervisor2Id: request.supervisor2Id || '',
      examiner1Id: request.examiner1Id || '',
      examiner2Id: request.examiner2Id || '',
      notes: request.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (request: any) => {
    if (confirm(`Hapus permohonan dari ${request.studentName}?`)) {
      try {
        await deleteRequest({ id: request._id });
        toast.success('Permohonan berhasil dihapus');
      } catch (error) {
        toast.error('Gagal menghapus permohonan');
      }
    }
  };

  const openNewDialog = () => {
    setEditingRequest(null);
    setFormData({
      studentName: '',
      nim: '',
      title: '',
      type: 'Proposal',
      supervisor1Id: '',
      supervisor2Id: '',
      examiner1Id: '',
      examiner2Id: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const isLoading = requests === undefined || lecturers === undefined;
  const activeLecturers = lecturers?.filter((l) => l.status === 'active' || !l.status) || [];

  // Filter out supervisor1 from supervisor2 options
  const supervisor2Options = activeLecturers.filter((l) => l._id !== formData.supervisor1Id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permohonan Seminar</h1>
          <p className="text-muted-foreground">
            Kelola permohonan seminar mahasiswa
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Permohonan
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          placeholder="Cari nama, NIM, atau judul..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          containerClassName="flex-1"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="requested">Menunggu Alokasi</SelectItem>
            <SelectItem value="allocated">Siap Dijadwalkan</SelectItem>
            <SelectItem value="scheduled">Terjadwal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Mahasiswa</th>
                <th className="px-4 py-3 text-left font-medium">NIM</th>
                <th className="px-4 py-3 text-left font-medium">Judul</th>
                <th className="px-4 py-3 text-left font-medium">Jenis</th>
                <th className="px-4 py-3 text-left font-medium">Pembimbing</th>
                <th className="px-4 py-3 text-left font-medium">Jadwal & Ruangan</th>
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
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-lg border p-8 text-center bg-card">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'semua'
              ? 'Tidak ada permohonan yang sesuai filter'
              : 'Belum ada permohonan seminar. Tambahkan permohonan pertama.'}
          </p>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Permohonan
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Mahasiswa</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">NIM</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Judul</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Jenis</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Pembimbing</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Jadwal & Ruangan</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const statusInfo = STATUS_LABELS[request.status];
                  return (
                    <tr key={request._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{request.studentName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{request.nim}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-foreground" title={request.title}>
                        {request.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {SEMINAR_TYPES.find((t) => t.value === request.type)?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-foreground">{request.supervisor1?.name || '-'}</span>
                          {request.supervisor2 && (
                            <span className="text-xs text-muted-foreground">
                              {request.supervisor2.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {request.scheduledDate ? (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-medium text-foreground">{request.scheduledDate}</span>
                            <span className="text-muted-foreground">{request.scheduledStartTime} - {request.scheduledEndTime}</span>
                            <span className="text-muted-foreground">Ruang: {request.scheduledRoom || '-'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(request)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(request)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              {editingRequest ? 'Edit Permohonan' : 'Tambah Permohonan Baru'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="studentName">Nama Mahasiswa *</Label>
                <Input
                  id="studentName"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="nim">NIM *</Label>
                <Input
                  id="nim"
                  value={formData.nim}
                  onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                  placeholder="Masukkan NIM"
                />
              </div>
              <div>
                <Label htmlFor="title">Judul Skripsi *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masukkan judul skripsi"
                />
              </div>
              <div>
                <Label htmlFor="type">Jenis Seminar *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMINAR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supervisor1">Pembimbing Utama *</Label>
                <Select
                  value={formData.supervisor1Id}
                  onValueChange={(value) => {
                    // Reset supervisor2 if it's the same as supervisor1
                    const newSupervisor2 = formData.supervisor2Id === value ? '' : formData.supervisor2Id;
                    setFormData({ ...formData, supervisor1Id: value, supervisor2Id: newSupervisor2 });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pembimbing utama" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLecturers.map((lecturer) => (
                      <SelectItem key={lecturer._id} value={lecturer._id}>
                        {lecturer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supervisor2">Pembimbing Pendamping (Opsional)</Label>
                <Select
                  value={formData.supervisor2Id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, supervisor2Id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih pembimbing pendamping (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak Ada</SelectItem>
                    {supervisor2Options.map((lecturer) => (
                      <SelectItem key={lecturer._id} value={lecturer._id}>
                        {lecturer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingRequest && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Seksi Penguji Sidang</h3>
                  </div>
                  {editingRequest.status === 'scheduled' && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Perhatian:</strong> Jadwal saat ini sudah fix. Jika Anda mengubah nama Penguji di bawah ini, jadwal yang sudah ada akan dibatalkan secara otomatis dan Anda harus menjadwalkan ulang di halaman Penjadwalan.
                    </div>
                  )}
                  <div>
                    <Label htmlFor="examiner1">Penguji 1</Label>
                    <Select
                      value={formData.examiner1Id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, examiner1Id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih penguji 1 (opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belum Ditentukan</SelectItem>
                        {activeLecturers
                          .filter(l => l._id !== formData.supervisor1Id && l._id !== formData.supervisor2Id)
                          .map((lecturer) => (
                            <SelectItem key={lecturer._id} value={lecturer._id}>
                              {lecturer.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="examiner2">Penguji 2</Label>
                    <Select
                      value={formData.examiner2Id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, examiner2Id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih penguji 2 (opsional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Belum Ditentukan</SelectItem>
                        {activeLecturers
                          .filter(l => l._id !== formData.supervisor1Id && l._id !== formData.supervisor2Id && l._id !== formData.examiner1Id)
                          .map((lecturer) => (
                            <SelectItem key={lecturer._id} value={lecturer._id}>
                              {lecturer.name}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t">
                <Label htmlFor="notes">Catatan (opsional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Catatan tambahan"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingRequest(null);
                }}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
