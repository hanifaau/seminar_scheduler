'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useAction } from 'convex/react';
import { Plus, Edit, Trash2, Loader2, FileText, Users, Bell, Info } from 'lucide-react';
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
import { SearchableSelect } from '@/components/molecules/SearchableSelect';
import { cn } from '@/lib/utils';

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b animate-pulse">
      <td className="p-4"><Skeleton className="h-5 w-32" /></td>
      <td className="p-4"><Skeleton className="h-5 w-24" /></td>
      <td className="p-4"><Skeleton className="h-5 w-48" /></td>
      <td className="p-4"><Skeleton className="h-5 w-24" /></td>
      <td className="p-4"><Skeleton className="h-5 w-32" /></td>
      <td className="p-4"><Skeleton className="h-5 w-24" /></td>
      <td className="p-4"><Skeleton className="h-8 w-8 rounded-md" /></td>
    </tr>
  );
}

const SEMINAR_TYPES: Record<string, string> = {
  Proposal: 'Seminar Proposal',
  Hasil: 'Seminar Hasil',
  Sidang: 'Sidang Skripsi',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'warning' | 'success' | 'outline' | 'default' }> = {
  requested: { label: 'Menunggu Alokasi', variant: 'warning' },
  allocated: { label: 'Siap Dijadwalkan', variant: 'secondary' },
  waiting_confirmation: { label: 'Menunggu Konfirmasi', variant: 'outline' },
  scheduled: { label: 'Terjadwal', variant: 'success' },
  completed: { label: 'Selesai', variant: 'default' },
};

export default function PermohonanSeminarPage() {
  const router = useRouter();
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
  const requestRevision = useMutation(api.seminar_requests.requestRevision);
  const requestExaminerRevision = useMutation(api.seminar_requests.requestExaminerRevision);
  const sendReminder = useAction(api.notifications.sendSeminarNotifications);

  const handleSendReminder = async (request: any) => {
    const toastId = toast.loading('Mengirim notifikasi...');
    try {
      const result = await sendReminder({
        seminarRequestId: request._id,
        messageType: 'reminder'
      });
      if (result.success) {
        toast.success(`Notifikasi Reminder berhasil dikirim ke dosen`, { id: toastId });
      } else {
        const errors = result.results?.filter((r: any) => !r.success).map((r: any) => r.message).join(', ');
        toast.warning(`Beberapa notifikasi gagal: ${errors || 'Cek log'}`, { id: toastId });
      }
    } catch (error) {
      toast.error('Gagal mengirim notifikasi', { id: toastId });
    }
  };

  // Filter requests
  const filteredRequests = React.useMemo(() => {
    if (!requests) return [];

    const todayStr = new Date().toISOString().split('T')[0];

    return requests.map(request => {
      // Auto-update to 'completed' if scheduledDate is passed
      if (request.status === 'scheduled' && request.scheduledDate && request.scheduledDate < todayStr) {
        return { ...request, status: 'completed' };
      }
      return request;
    }).filter((request) => {
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

  const handleExaminerRevision = async (requestId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin merevisi penguji? Status permohonan akan dikembalikan ke "Menunggu Alokasi" dan jadwal (jika ada) akan dibatalkan.')) {
      return;
    }
    
    const toastId = toast.loading('Memproses revisi...');
    try {
      await requestExaminerRevision({ id: requestId as any });
      toast.success('Permohonan siap untuk direvisi pengujinya', { id: toastId });
      router.push(`/kaprodi/alokasi?id=${requestId}`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal merevisi penguji', { id: toastId });
    }
  };

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

    // Validasi dosen cuti
    if (lecturers) {
      const selectedLecturerIds = [
        formData.supervisor1Id,
        formData.supervisor2Id,
        formData.examiner1Id,
        formData.examiner2Id
      ].filter(Boolean);
      
      const onLeaveLecturers = lecturers.filter(l => 
        selectedLecturerIds.includes(l._id) && l.status === 'on leave'
      );

      if (onLeaveLecturers.length > 0) {
        const names = onLeaveLecturers.map(l => l.name).join(', ');
        if (!window.confirm(`PERINGATAN: Dosen berikut sedang dalam masa Cuti: ${names}.\n\nApakah Anda yakin tetap ingin mendaftarkan mereka pada permohonan ini?`)) {
          return;
        }
      }
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
          supervisor2Id: formData.supervisor2Id ? formData.supervisor2Id as any : null,
          examiner1Id: formData.examiner1Id ? formData.examiner1Id as any : null,
          examiner2Id: formData.examiner2Id ? formData.examiner2Id as any : null,
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
        examiner1Id: '',
        examiner2Id: '',
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

  const handleRequestRevision = async () => {
    if (!editingRequest) return;
    
    if (!confirm('Apakah Anda yakin ingin melakukan revisi jadwal? Status permohonan akan kembali ke "Menunggu Konfirmasi" dan Anda dapat menjadwalkan ulang di halaman Penjadwalan.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRevision({ id: editingRequest._id });
      toast.success('Status diubah ke Menunggu Konfirmasi. Silakan lakukan penjadwalan ulang di halaman Penjadwalan.');
      setIsDialogOpen(false);
      setEditingRequest(null);
    } catch (error: any) {
      toast.error(`Gagal melakukan revisi jadwal: ${error.message}`);
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
  const activeLecturers = lecturers?.filter((l) => l.status !== 'inactive') || [];

  // Filter out supervisor1 from supervisor2 options
  const supervisor2Options = activeLecturers.filter((l) => l._id !== formData.supervisor1Id);

  const formatLecturerOption = (l: any) => ({
    label: `${l.name} ${l.status === 'on leave' ? '(Cuti)' : ''}`,
    value: l._id,
  });

  const activeLecturersOptions = activeLecturers.map(formatLecturerOption);
  
  const supervisor2DropdownOptions = [
    { label: 'Tidak Ada', value: 'none' },
    ...supervisor2Options.map(formatLecturerOption)
  ];

  const examiner1DropdownOptions = [
    { label: 'Belum Ditentukan', value: 'none' },
    ...activeLecturers
      .filter(l => l._id !== formData.supervisor1Id && l._id !== formData.supervisor2Id)
      .map(formatLecturerOption)
  ];

  const examiner2DropdownOptions = [
    { label: 'Belum Ditentukan', value: 'none' },
    ...activeLecturers
      .filter(l => l._id !== formData.supervisor1Id && l._id !== formData.supervisor2Id && l._id !== formData.examiner1Id)
      .map(formatLecturerOption)
  ];

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
            <SelectItem value="waiting_confirmation">Menunggu Konfirmasi</SelectItem>
            <SelectItem value="scheduled">Terjadwal</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-center font-medium">Mahasiswa</th>
                <th className="px-4 py-3 text-center font-medium">NIM</th>
                <th className="px-4 py-3 text-center font-medium">Judul</th>
                <th className="px-4 py-3 text-center font-medium">Jenis</th>
                <th className="px-4 py-3 text-center font-medium">Pembimbing</th>
                <th className="px-4 py-3 text-center font-medium">Jadwal & Ruangan</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-3 text-left font-medium text-foreground w-[12%]">Mahasiswa</th>
                  <th className="px-3 py-3 text-left font-medium text-foreground w-[10%]">NIM</th>
                  <th className="px-3 py-3 text-left font-medium text-foreground w-[18%]">Judul</th>
                  <th className="px-3 py-3 text-center font-medium text-foreground w-[10%]">Jenis</th>
                  <th className="px-3 py-3 text-left font-medium text-foreground w-[22%]">Pembimbing</th>
                  <th className="px-3 py-3 text-left font-medium text-foreground w-[13%]">Jadwal & Ruangan</th>
                  <th className="px-3 py-3 text-center font-medium text-foreground w-[10%]">Status</th>
                  <th className="px-3 py-3 text-center font-medium text-foreground w-[5%]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => {
                  const statusInfo = STATUS_LABELS[request.status];
                  return (
                    <tr key={request._id} className="border-b hover:bg-muted/30 transition-colors align-top">
                      <td className="px-3 py-4 text-left">
                        <div className="max-w-[120px] break-words whitespace-normal font-medium text-foreground">
                          {request.studentName}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="max-w-[100px] break-words font-mono text-muted-foreground">
                          {request.nim}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="max-w-[200px] line-clamp-3 text-foreground break-words whitespace-normal" title={request.title}>
                          {request.title}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                          {SEMINAR_TYPES[request.type]}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 text-left">
                        <div className="flex flex-col gap-1 items-start max-w-[180px]">
                          <span className="text-foreground font-medium break-words whitespace-normal">
                            {request.supervisor1?.status === 'inactive' && request.status !== 'completed' ? '-' : request.supervisor1?.name || '-'}
                          </span>
                          {request.supervisor2 && (
                            <span className="text-muted-foreground break-words whitespace-normal">
                              {request.supervisor2.status === 'inactive' && request.status !== 'completed' ? '-' : request.supervisor2.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-left">
                        {request.scheduledDate ? (
                          <div className="flex flex-col gap-1 text-xs items-start">
                            <span className="font-medium text-foreground">{request.scheduledDate}</span>
                            <span className="text-muted-foreground">{request.scheduledStartTime} - {request.scheduledEndTime}</span>
                            <span className="text-muted-foreground">Ruang: {request.scheduledRoom || '-'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">-</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center">
                        <Badge variant={statusInfo.variant} className="text-[10px] px-1.5 py-0.5">
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="flex justify-center gap-1 items-center">
                          {request.status === 'scheduled' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Kirim Reminder"
                              onClick={() => handleSendReminder(request)}
                            >
                              <Bell className="h-4 w-4 text-blue-500" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground mx-2 font-bold">-</span>
                          )}
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
                    {Object.entries(SEMINAR_TYPES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="supervisor1">Pembimbing Utama *</Label>
                <SearchableSelect
                  options={activeLecturersOptions}
                  value={formData.supervisor1Id}
                  onValueChange={(value) => {
                    const newSupervisor2 = formData.supervisor2Id === value ? '' : formData.supervisor2Id;
                    setFormData({ ...formData, supervisor1Id: value, supervisor2Id: newSupervisor2 });
                  }}
                  placeholder="Pilih pembimbing utama"
                />
              </div>
              <div>
                <Label htmlFor="supervisor2">Pembimbing Pendamping (Opsional)</Label>
                <SearchableSelect
                  options={supervisor2DropdownOptions}
                  value={formData.supervisor2Id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, supervisor2Id: value === "none" ? "" : value })}
                  placeholder="Pilih pembimbing pendamping"
                />
              </div>
              {editingRequest && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Seksi Penguji Sidang</h3>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="flex items-center gap-1"
                      onClick={() => handleExaminerRevision(editingRequest._id)}
                    >
                      <Edit className="h-4 w-4" />
                      Revisi Penguji
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Penguji 1</span>
                      <span className="text-sm font-medium">
                        {(() => {
                          const l = lecturers?.find(l => l._id === formData.examiner1Id);
                          if (!l) return 'Belum dialokasikan';
                          return (
                            <span>
                              {l.name}
                              {l.status === 'on leave' && <span className="text-yellow-600"> (Cuti)</span>}
                              {l.status === 'inactive' && <span className="text-red-600"> (Tidak Aktif)</span>}
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">Penguji 2</span>
                      <span className="text-sm font-medium">
                        {(() => {
                          const l = lecturers?.find(l => l._id === formData.examiner2Id);
                          if (!l) return 'Belum dialokasikan';
                          return (
                            <span>
                              {l.name}
                              {l.status === 'on leave' && <span className="text-yellow-600"> (Cuti)</span>}
                              {l.status === 'inactive' && <span className="text-red-600"> (Tidak Aktif)</span>}
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    Penguji sidang hanya dapat diubah di halaman Alokasi Penguji.
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
              {editingRequest?.status === 'scheduled' && (
                <Button
                  variant="outline"
                  className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800 mr-auto"
                  onClick={handleRequestRevision}
                  disabled={isSubmitting}
                >
                  Revisi Jadwal
                </Button>
              )}
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
