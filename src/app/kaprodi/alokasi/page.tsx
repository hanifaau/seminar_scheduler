'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Check, Loader2, Users, Filter, Search, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
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

function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

const SEMINAR_TYPES: Record<string, string> = {
  Proposal: 'Seminar Proposal',
  Hasil: 'Seminar Hasil',
  Sidang: 'Sidang Skripsi',
};

interface Lecturer {
  _id: string;
  name: string;
  nip: string;
  expertise: string[];
  status?: string;
}

interface SeminarRequest {
  _id: string;
  studentName: string;
  nim: string;
  title: string;
  type: 'Proposal' | 'Hasil' | 'Sidang';
  supervisor1Id: string;
  supervisor1?: Lecturer;
  supervisor2Id?: string;
  supervisor2?: Lecturer | null;
  examiner1Id?: string;
  examiner1?: Lecturer | null;
  examiner2Id?: string;
  examiner2?: Lecturer | null;
  status: string;
}

export default function AlokasiPengujiPage() {
  const [selectedRequest, setSelectedRequest] = React.useState<SeminarRequest | null>(null);
  const [examiner1Id, setExaminer1Id] = React.useState<string>('');
  const [examiner2Id, setExaminer2Id] = React.useState<string>('');
  const [expertiseFilter, setExpertiseFilter] = React.useState<string>('semua');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Queries
  const requests = useQuery(api.seminar_requests.getByStatusWithLecturers, { status: 'requested' });
  const lecturers = useQuery(api.lecturers.getAll);
  const expertiseCategories = useQuery(api.expertise_categories.getAll);

  // Mutations
  const allocateExaminers = useMutation(api.seminar_requests.allocateExaminers);

  // Filter lecturers by expertise
  const filteredLecturers = React.useMemo(() => {
    if (!lecturers) return [];
    const active = lecturers.filter((l) => l.status === 'active' || !l.status);

    if (expertiseFilter === 'semua') return active;

    return active.filter((l) =>
      l.expertise.some((exp) =>
        exp.toLowerCase().includes(expertiseFilter.toLowerCase())
      )
    );
  }, [lecturers, expertiseFilter]);

  // Further filter by search
  const displayedLecturers = React.useMemo(() => {
    if (!searchQuery) return filteredLecturers;
    return filteredLecturers.filter((l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filteredLecturers, searchQuery]);

  // Check if a lecturer is a supervisor
  const isSupervisor = (lecturerId: string) => {
    if (!selectedRequest) return false;
    return (
      lecturerId === selectedRequest.supervisor1Id ||
      lecturerId === selectedRequest.supervisor2Id
    );
  };

  // Get supervisor name for warning
  const getSupervisorLabel = (lecturerId: string) => {
    if (!selectedRequest) return '';
    if (lecturerId === selectedRequest.supervisor1Id) {
      return 'Pembimbing Utama';
    }
    if (lecturerId === selectedRequest.supervisor2Id) {
      return 'Pembimbing Pendamping';
    }
    return '';
  };

  // Validation state
  const validationError = React.useMemo(() => {
    if (!examiner1Id || !examiner2Id) return null;

    if (examiner1Id === examiner2Id) {
      return 'Penguji 1 dan Penguji 2 tidak boleh dosen yang sama';
    }

    if (isSupervisor(examiner1Id) || isSupervisor(examiner2Id)) {
      return 'Dosen Pembimbing tidak boleh menjadi Penguji';
    }

    return null;
  }, [examiner1Id, examiner2Id, selectedRequest]);

  const handleSelectRequest = (request: SeminarRequest) => {
    setSelectedRequest(request);
    setExaminer1Id('');
    setExaminer2Id('');
    setExpertiseFilter('semua');
    setSearchQuery('');
  };

  const handleAllocate = async () => {
    if (!selectedRequest || !examiner1Id || !examiner2Id) {
      toast.error('Pilih kedua penguji terlebih dahulu');
      return;
    }

    if (examiner1Id === examiner2Id) {
      toast.error('Penguji 1 dan Penguji 2 tidak boleh dosen yang sama');
      return;
    }

    // Check if examiner is same as supervisor
    if (isSupervisor(examiner1Id) || isSupervisor(examiner2Id)) {
      toast.error('Dosen Pembimbing tidak boleh menjadi Penguji');
      return;
    }

    setIsSubmitting(true);
    try {
      await allocateExaminers({
        id: selectedRequest._id as any,
        examiner1Id: examiner1Id as any,
        examiner2Id: examiner2Id as any,
      });

      toast.success('Penguji berhasil dialokasi');
      setSelectedRequest(null);
      setExaminer1Id('');
      setExaminer2Id('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengalokasi penguji');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = requests === undefined || lecturers === undefined;

  // Render lecturer item in dropdown with supervisor warning
  const renderLecturerItem = (lecturer: Lecturer, isSelected: boolean) => {
    const supervisorLabel = getSupervisorLabel(lecturer._id);
    const isSup = isSupervisor(lecturer._id);

    return (
      <div className="flex flex-col gap-0.5">
        <span className={cn('flex items-center gap-1', isSup && 'text-muted-foreground')}>
          {lecturer.name}
          {isSup && (
            <Badge variant="warning" className="text-[10px] px-1 py-0">
              {supervisorLabel}
            </Badge>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {lecturer.expertise.slice(0, 2).join(', ')}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alokasi Penguji</h1>
        <p className="text-muted-foreground">
          Pilih penguji untuk setiap permohonan seminar
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Request List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Permohonan Menunggu Alokasi ({requests?.length || 0})
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className={cn(
                    'rounded-lg border p-4 cursor-pointer transition-all',
                    selectedRequest?._id === request._id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'hover:border-primary/30 hover:shadow-sm'
                  )}
                  onClick={() => handleSelectRequest(request as SeminarRequest)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{request.studentName}</p>
                      <p className="text-sm text-muted-foreground">{request.nim}</p>
                    </div>
                    <Badge variant="outline">
                      {SEMINAR_TYPES[request.type]}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mb-2">{request.title}</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3 w-3" />
                      <span>Pembimbing Utama:</span>
                      <span className="font-medium text-foreground">
                        {request.supervisor1?.name || '-'}
                      </span>
                    </div>
                    {request.supervisor2 && (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3 opacity-50" />
                        <span>Pembimbing Pendamping:</span>
                        <span className="font-medium text-foreground">
                          {request.supervisor2?.name}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedRequest?._id === request._id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-primary font-medium">
                        Terpilih - Pilih penguji di panel kanan
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border p-8 text-center bg-card">
              <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Semua permohonan sudah dialokasi
              </p>
            </div>
          )}
        </div>

        {/* Right: Examiner Selection */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Pilih Penguji</h2>

          {!selectedRequest ? (
            <div className="rounded-lg border p-8 text-center bg-muted/30">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Pilih permohonan terlebih dahulu untuk memilih penguji
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Request Info */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium text-foreground">{selectedRequest.studentName}</p>
                <p className="text-xs text-muted-foreground mb-2">{selectedRequest.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{SEMINAR_TYPES[selectedRequest.type]}</Badge>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <UserCheck className="h-3 w-3" />
                    <span>
                      Pembimbing: <span className="text-foreground font-medium">{selectedRequest.supervisor1?.name}</span>
                      {selectedRequest.supervisor2 && (
                        <span className="text-foreground font-medium"> & {selectedRequest.supervisor2?.name}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Supervisor Warning Banner */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Perhatian:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300">
                      <li>Dosen Pembimbing tidak boleh menjadi Penguji</li>
                      <li>Penguji 1 dan Penguji 2 harus dosen yang berbeda</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama dosen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter kepakaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kepakaran</SelectItem>
                    {expertiseCategories?.map((cat) => (
                      <SelectItem key={cat._id} value={cat.fieldName}>
                        {cat.fieldName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Examiner 1 */}
              <div>
                <Label>Penguji 1 *</Label>
                <Select value={examiner1Id} onValueChange={setExaminer1Id}>
                  <SelectTrigger className={cn(
                    isSupervisor(examiner1Id) && 'border-destructive focus:ring-destructive'
                  )}>
                    <SelectValue placeholder="Pilih penguji 1" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedLecturers
                      .filter((l) => l._id !== examiner2Id)
                      .map((lecturer) => {
                        const isSup = isSupervisor(lecturer._id);
                        return (
                          <SelectItem
                            key={lecturer._id}
                            value={lecturer._id}
                            disabled={isSup}
                            className={cn(isSup && 'opacity-50')}
                          >
                            {renderLecturerItem(lecturer, examiner1Id === lecturer._id)}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {isSupervisor(examiner1Id) && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {getSupervisorLabel(examiner1Id)} tidak boleh menjadi penguji
                  </p>
                )}
              </div>

              {/* Examiner 2 */}
              <div>
                <Label>Penguji 2 *</Label>
                <Select value={examiner2Id} onValueChange={setExaminer2Id}>
                  <SelectTrigger className={cn(
                    isSupervisor(examiner2Id) && 'border-destructive focus:ring-destructive'
                  )}>
                    <SelectValue placeholder="Pilih penguji 2" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayedLecturers
                      .filter((l) => l._id !== examiner1Id)
                      .map((lecturer) => {
                        const isSup = isSupervisor(lecturer._id);
                        return (
                          <SelectItem
                            key={lecturer._id}
                            value={lecturer._id}
                            disabled={isSup}
                            className={cn(isSup && 'opacity-50')}
                          >
                            {renderLecturerItem(lecturer, examiner2Id === lecturer._id)}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                {isSupervisor(examiner2Id) && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {getSupervisorLabel(examiner2Id)} tidak boleh menjadi penguji
                  </p>
                )}
              </div>

              {/* Validation Error Banner */}
              {validationError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{validationError}</span>
                  </div>
                </div>
              )}

              {/* Selected Examiners Preview */}
              {(examiner1Id || examiner2Id) && (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Penguji Terpilih:</p>
                  {examiner1Id && (
                    <div className="flex items-center gap-2">
                      <Badge variant={isSupervisor(examiner1Id) ? 'destructive' : 'success'} className="text-xs">
                        Penguji 1
                      </Badge>
                      <span className="text-sm text-foreground">
                        {displayedLecturers.find((l) => l._id === examiner1Id)?.name}
                      </span>
                      {isSupervisor(examiner1Id) && (
                        <span className="text-xs text-destructive">
                          ({getSupervisorLabel(examiner1Id)})
                        </span>
                      )}
                    </div>
                  )}
                  {examiner2Id && (
                    <div className="flex items-center gap-2">
                      <Badge variant={isSupervisor(examiner2Id) ? 'destructive' : 'success'} className="text-xs">
                        Penguji 2
                      </Badge>
                      <span className="text-sm text-foreground">
                        {displayedLecturers.find((l) => l._id === examiner2Id)?.name}
                      </span>
                      {isSupervisor(examiner2Id) && (
                        <span className="text-xs text-destructive">
                          ({getSupervisorLabel(examiner2Id)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRequest(null);
                    setExaminer1Id('');
                    setExaminer2Id('');
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAllocate}
                  disabled={!examiner1Id || !examiner2Id || !!validationError || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Alokasi Penguji
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
