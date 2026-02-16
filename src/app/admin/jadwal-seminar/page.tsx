'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Calendar,
  Clock,
  Loader2,
  Check,
  Users,
  AlertTriangle,
  ChevronRight,
  FileText,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';
import { SlotPicker, SlotSummary, TimeSlot } from '@/components/organisms/SlotPicker';

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
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

export default function JadwalSeminarPage() {
  const [selectedRequest, setSelectedRequest] = React.useState<SeminarRequest | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [room, setRoom] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [weeksAhead, setWeeksAhead] = React.useState(2);

  // Queries
  const requests = useQuery(api.seminar_requests.getByStatusWithLecturers, { status: 'allocated' });
  const availableSlots = useQuery(
    api.scheduling.getAvailableSlots,
    selectedRequest
      ? { seminarRequestId: selectedRequest._id as any, weeksAhead }
      : 'skip'
  );

  // Mutations
  const scheduleSeminar = useMutation(api.scheduling.scheduleSeminar);

  const handleSelectRequest = (request: SeminarRequest) => {
    setSelectedRequest(request);
    setSelectedSlot(null);
    setRoom('');
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleCheckNextWeek = () => {
    setWeeksAhead((prev) => prev + 1);
  };

  const handleSchedule = async () => {
    if (!selectedRequest || !selectedSlot) {
      toast.error('Pilih slot waktu terlebih dahulu');
      return;
    }

    setIsSubmitting(true);
    try {
      await scheduleSeminar({
        id: selectedRequest._id as any,
        scheduledDate: selectedSlot.date,
        scheduledStartTime: selectedSlot.startTime,
        scheduledEndTime: selectedSlot.endTime,
        scheduledRoom: room || undefined,
      });

      toast.success('Seminar berhasil dijadwalkan');
      setSelectedRequest(null);
      setSelectedSlot(null);
      setRoom('');
      setWeeksAhead(2);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menjadwalkan seminar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = requests === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Penjadwalan Seminar</h1>
        <p className="text-muted-foreground">
          Cari slot waktu yang tersedia dan jadwalkan seminar
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Request List */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Siap Dijadwalkan ({requests?.length || 0})
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
                  <p className="text-sm text-foreground line-clamp-2 mb-3">{request.title}</p>

                  <div className="space-y-1.5 text-xs">
                    {/* Supervisors */}
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[70px]">Pembimbing:</span>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          {request.supervisor1?.name || '-'}
                        </Badge>
                        {request.supervisor2 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {request.supervisor2.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Examiners */}
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground min-w-[70px]">Penguji:</span>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="info" className="text-[10px]">
                          {request.examiner1?.name || '-'}
                        </Badge>
                        {request.examiner2 && (
                          <Badge variant="info" className="text-[10px]">
                            {request.examiner2.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedRequest?._id === request._id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-primary font-medium">
                        Terpilih - Lihat slot tersedia di panel kanan
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
                Tidak ada seminar yang menunggu penjadwalan
              </p>
            </div>
          )}
        </div>

        {/* Right: Slot Picker */}
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Slot Tersedia
          </h2>

          {!selectedRequest ? (
            <div className="rounded-lg border p-8 text-center bg-muted/30">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Pilih seminar terlebih dahulu untuk melihat slot tersedia
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Request Info */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{selectedRequest.studentName}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequest.nim}</p>
                  </div>
                  <Badge variant="outline">
                    {SEMINAR_TYPES[selectedRequest.type]}
                  </Badge>
                </div>
                <p className="text-sm text-foreground mb-2">{selectedRequest.title}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>4 Dosen terlibat</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Durasi:{' '}
                      {selectedRequest.type === 'Proposal' ? '60' : '90'} menit
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot Picker */}
              <div className="rounded-lg border p-4">
                {availableSlots === undefined ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Mencari slot tersedia...</p>
                  </div>
                ) : (
                  <SlotPicker
                    idealSlots={availableSlots.idealSlots}
                    alternativeSlots={availableSlots.alternativeSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSelectSlot}
                    onCheckNextWeek={handleCheckNextWeek}
                    requiredDuration={availableSlots.requiredDuration}
                    alternativeDuration={availableSlots.alternativeDuration}
                  />
                )}
              </div>

              {/* Selected Slot Summary */}
              {selectedSlot && (
                <SlotSummary
                  slot={selectedSlot}
                  seminarType={selectedRequest.type}
                  room={room}
                  onRoomChange={setRoom}
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRequest(null);
                    setSelectedSlot(null);
                    setRoom('');
                    setWeeksAhead(2);
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSchedule}
                  disabled={!selectedSlot || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Jadwalkan Seminar
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
