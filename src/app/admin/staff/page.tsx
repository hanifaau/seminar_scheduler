'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Edit, Trash2, Loader2, Users, Search, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/FilterDropdown';

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
    </tr>
  );
}

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  admin_akademik: { label: 'Admin Akademik', variant: 'default' },
  sekprodi: { label: 'Sekretaris Prodi', variant: 'secondary' },
  kaprodi: { label: 'Ketua Prodi', variant: 'warning' },
  admin: { label: 'Admin', variant: 'outline' },
};

const ROLE_OPTIONS = [
  { value: 'admin_akademik', label: 'Admin Akademik' },
  { value: 'admin', label: 'Admin Umum' },
  { value: 'sekprodi', label: 'Sekretaris Prodi' },
  { value: 'kaprodi', label: 'Ketua Prodi' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Tidak Aktif' },
];

interface StaffMember {
  _id: string;
  name: string;
  idPegawai: string;
  nip?: string;
  role: string;
  status?: string;
  createdAt: number;
}

export default function StaffManagementPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    idPegawai: '',
    nip: '',
    role: 'admin_akademik' as string,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Queries
  const staff = useQuery(api.staff.getAll);

  // Mutations
  const createStaff = useMutation(api.staff.create);
  const updateStaff = useMutation(api.staff.update);
  const deleteStaff = useMutation(api.staff.remove);

  // Filter staff
  const filteredStaff = React.useMemo(() => {
    if (!staff) return [];

    return staff.filter((s) => {
      const matchesSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.idPegawai.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.nip && s.nip.includes(searchQuery));

      return matchesSearch;
    });
  }, [staff, searchQuery]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.idPegawai || !formData.role) {
      toast.error('Mohon lengkapi semua field yang wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        await updateStaff({
          id: editingStaff._id as any,
          name: formData.name,
          idPegawai: formData.idPegawai,
          nip: formData.nip || undefined,
          role: formData.role as any,
        });
        toast.success('Data pegawai berhasil diperbarui');
      } else {
        await createStaff({
          name: formData.name,
          idPegawai: formData.idPegawai,
          nip: formData.nip || undefined,
          role: formData.role as any,
        });
        toast.success('Pegawai berhasil ditambahkan');
      }

      setFormData({
        name: '',
        idPegawai: '',
        nip: '',
        role: 'admin_akademik',
      });
      setIsDialogOpen(false);
      setEditingStaff(null);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data pegawai');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      idPegawai: staffMember.idPegawai,
      nip: staffMember.nip || '',
      role: staffMember.role,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (staffMember: StaffMember) => {
    if (confirm(`Hapus data pegawai ${staffMember.name}?`)) {
      try {
        await deleteStaff({ id: staffMember._id as any });
        toast.success('Pegawai berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus pegawai');
      }
    }
  };

  const openNewDialog = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      idPegawai: '',
      nip: '',
      role: 'admin_akademik',
    });
    setIsDialogOpen(true);
  };

  const isLoading = staff === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pegawai</h1>
          <p className="text-muted-foreground">
            Kelola data pegawai administrasi (bukan dosen)
          </p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pegawai
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau ID pegawai..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Nama</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">ID Pegawai</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">NIP</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Jabatan</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <TableRowSkeleton key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="rounded-lg border p-8 text-center bg-card">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Tidak ada pegawai yang sesuai pencarian'
              : 'Belum ada data pegawai. Tambahkan pegawai pertama.'}
          </p>
          <Button onClick={openNewDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Pegawai
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-foreground">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">ID Pegawai</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">NIP</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Jabatan</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((staffMember) => {
                  const roleInfo = ROLE_LABELS[staffMember.role] || { label: staffMember.role, variant: 'outline' as const };
                  const isActive = staffMember.status === 'active' || !staffMember.status;
                  return (
                    <tr key={staffMember._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{staffMember.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {staffMember.idPegawai}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {staffMember.nip || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleInfo.variant}>
                          {roleInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isActive ? 'success' : 'secondary'}>
                          {isActive ? 'Aktif' : 'Tidak Aktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(staffMember as StaffMember)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(staffMember as StaffMember)}
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
          <div className="bg-card rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              {editingStaff ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nama Lengkap *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <Label htmlFor="idPegawai">ID Pegawai *</Label>
                <Input
                  id="idPegawai"
                  value={formData.idPegawai}
                  onChange={(e) => setFormData({ ...formData, idPegawai: e.target.value })}
                  placeholder="Contoh: PEG-001"
                />
              </div>
              <div>
                <Label htmlFor="nip">NIP (Opsional)</Label>
                <Input
                  id="nip"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Masukkan NIP"
                />
              </div>
              <div>
                <Label htmlFor="role">Jabatan Awal *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingStaff(null);
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
