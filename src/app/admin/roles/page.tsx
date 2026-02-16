'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Crown,
  UserCog,
  Loader2,
  Check,
  AlertTriangle,
  Users,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/FilterDropdown';

// Skeleton
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

const ROLE_INFO = {
  kaprodi: {
    label: 'Ketua Program Studi (Kaprodi)',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Pimpinan program Studi Teknik Industri',
  },
  sekprodi: {
    label: 'Sekretaris Program Studi (Sekprodi)',
    icon: UserCog,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Sekretaris Program Studi Teknik Industri',
  },
};

export default function RoleAssignmentPage() {
  const [selectedKaprodi, setSelectedKaprodi] = React.useState<string>('');
  const [selectedSekprodi, setSelectedSekprodi] = React.useState<string>('');
  const [isAssigningKaprodi, setIsAssigningKaprodi] = React.useState(false);
  const [isAssigningSekprodi, setIsAssigningSekprodi] = React.useState(false);

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);
  const leadership = useQuery(api.lecturers.getLeadership);

  // Mutations
  const assignRole = useMutation(api.lecturers.assignRole);
  const removeRole = useMutation(api.lecturers.removeRole);

  // Filter active lecturers
  const activeLecturers = React.useMemo(() => {
    if (!lecturers) return [];
    return lecturers.filter((l) => l.status === 'active' || !l.status);
  }, [lecturers]);

  // Get current role holders
  const currentKaprodi = leadership?.kaprodi;
  const currentSekprodi = leadership?.sekprodi;

  const handleAssignKaprodi = async () => {
    if (!selectedKaprodi) {
      toast.error('Pilih dosen terlebih dahulu');
      return;
    }

    setIsAssigningKaprodi(true);
    try {
      await assignRole({ id: selectedKaprodi as any, role: 'kaprodi' });
      toast.success('Kaprodi berhasil ditetapkan');
      setSelectedKaprodi('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menetapkan Kaprodi');
    } finally {
      setIsAssigningKaprodi(false);
    }
  };

  const handleAssignSekprodi = async () => {
    if (!selectedSekprodi) {
      toast.error('Pilih dosen terlebih dahulu');
      return;
    }

    setIsAssigningSekprodi(true);
    try {
      await assignRole({ id: selectedSekprodi as any, role: 'sekprodi' });
      toast.success('Sekprodi berhasil ditetapkan');
      setSelectedSekprodi('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menetapkan Sekprodi');
    } finally {
      setIsAssigningSekprodi(false);
    }
  };

  const handleRemoveKaprodi = async () => {
    if (!currentKaprodi) return;

    if (confirm(`Hapus jabatan Kaprodi dari ${currentKaprodi.name}?`)) {
      try {
        await removeRole({ id: currentKaprodi._id as any });
        toast.success('Jabatan Kaprodi berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus jabatan');
      }
    }
  };

  const handleRemoveSekprodi = async () => {
    if (!currentSekprodi) return;

    if (confirm(`Hapus jabatan Sekprodi dari ${currentSekprodi.name}?`)) {
      try {
        await removeRole({ id: currentSekprodi._id as any });
        toast.success('Jabatan Sekprodi berhasil dihapus');
      } catch (error: any) {
        toast.error(error.message || 'Gagal menghapus jabatan');
      }
    }
  };

  const isLoading = lecturers === undefined || leadership === undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan Jabatan</h1>
        <p className="text-muted-foreground">
          Tetapkan Kaprodi dan Sekprodi dari dosen yang tersedia
        </p>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Perhatian:</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
              <li>Hanya boleh ada <strong>1 Kaprodi</strong> dan <strong>1 Sekprodi</strong> yang aktif</li>
              <li>Jika ingin mengganti, hapus jabatan terlebih dahulu atau tetapkan langsung (jabatan lama akan diganti)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Leadership Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Current Kaprodi */}
        <div className={cn(
          'rounded-lg border-2 p-4',
          currentKaprodi
            ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10'
            : 'border-dashed border-muted-foreground/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-foreground">Kaprodi Saat Ini</span>
          </div>
          {currentKaprodi ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">{currentKaprodi.name}</p>
              <p className="text-sm text-muted-foreground">NIP: {currentKaprodi.nip}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveKaprodi}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
                Hapus Jabatan
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Belum ada Kaprodi yang ditetapkan</p>
          )}
        </div>

        {/* Current Sekprodi */}
        <div className={cn(
          'rounded-lg border-2 p-4',
          currentSekprodi
            ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10'
            : 'border-dashed border-muted-foreground/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-foreground">Sekprodi Saat Ini</span>
          </div>
          {currentSekprodi ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">{currentSekprodi.name}</p>
              <p className="text-sm text-muted-foreground">NIP: {currentSekprodi.nip}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSekprodi}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                Hapus Jabatan
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Belum ada Sekprodi yang ditetapkan</p>
          )}
        </div>
      </div>

      {/* Assignment Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Assign Kaprodi */}
        <div className={cn(
          'rounded-lg border p-6 space-y-4',
          ROLE_INFO.kaprodi.borderColor,
          ROLE_INFO.kaprodi.bgColor
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Crown className={cn('h-6 w-6', ROLE_INFO.kaprodi.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {ROLE_INFO.kaprodi.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {ROLE_INFO.kaprodi.description}
              </p>
            </div>
          </div>

          {currentKaprodi && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-background p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-foreground">
                    Sedang menjabat: <strong>{currentKaprodi.name}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Pilih Dosen untuk menjadi Kaprodi:
            </label>
            <Select value={selectedKaprodi} onValueChange={setSelectedKaprodi}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih dosen..." />
              </SelectTrigger>
              <SelectContent>
                {activeLecturers
                  .filter((l) => l._id !== currentKaprodi?._id)
                  .map((lecturer) => (
                    <SelectItem key={lecturer._id} value={lecturer._id}>
                      <div className="flex items-center gap-2">
                        <span>{lecturer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({lecturer.nip})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAssignKaprodi}
              disabled={!selectedKaprodi || isAssigningKaprodi}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isAssigningKaprodi ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menetapkan...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Tetapkan sebagai Kaprodi
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Assign Sekprodi */}
        <div className={cn(
          'rounded-lg border p-6 space-y-4',
          ROLE_INFO.sekprodi.borderColor,
          ROLE_INFO.sekprodi.bgColor
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
              <UserCog className={cn('h-6 w-6', ROLE_INFO.sekprodi.color)} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {ROLE_INFO.sekprodi.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {ROLE_INFO.sekprodi.description}
              </p>
            </div>
          </div>

          {currentSekprodi && (
            <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-background p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-foreground">
                    Sedang menjabat: <strong>{currentSekprodi.name}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              Pilih Dosen untuk menjadi Sekprodi:
            </label>
            <Select value={selectedSekprodi} onValueChange={setSelectedSekprodi}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih dosen..." />
              </SelectTrigger>
              <SelectContent>
                {activeLecturers
                  .filter((l) => l._id !== currentSekprodi?._id)
                  .map((lecturer) => (
                    <SelectItem key={lecturer._id} value={lecturer._id}>
                      <div className="flex items-center gap-2">
                        <span>{lecturer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({lecturer.nip})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAssignSekprodi}
              disabled={!selectedSekprodi || isAssigningSekprodi}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isAssigningSekprodi ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menetapkan...
                </>
              ) : (
                <>
                  <UserCog className="h-4 w-4 mr-2" />
                  Tetapkan sebagai Sekprodi
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* All Lecturers List */}
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Daftar Dosen & Jabatan
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-foreground">Nama</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">NIP</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Jabatan</th>
                <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {activeLecturers.map((lecturer) => (
                <tr key={lecturer._id} className="border-b">
                  <td className="px-3 py-2 font-medium text-foreground">{lecturer.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {lecturer.nip}
                  </td>
                  <td className="px-3 py-2">
                    {lecturer.role === 'kaprodi' && (
                      <Badge variant="warning">
                        <Crown className="h-3 w-3 mr-1" />
                        Kaprodi
                      </Badge>
                    )}
                    {lecturer.role === 'sekprodi' && (
                      <Badge variant="info">
                        <UserCog className="h-3 w-3 mr-1" />
                        Sekprodi
                      </Badge>
                    )}
                    {(!lecturer.role || lecturer.role === 'dosen') && (
                      <Badge variant="outline">Dosen</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={lecturer.status === 'active' || !lecturer.status ? 'success' : 'secondary'}>
                      {lecturer.status === 'active' || !lecturer.status ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
