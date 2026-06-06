'use client';

import * as React from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
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
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
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
  phone?: string;
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
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  scheduledRoom?: string;
}

interface NotificationResult {
  lecturer: string;
  role: string;
  success: boolean;
  message: string;
}

export default function JadwalSeminarPage() {
  const [selectedRequest, setSelectedRequest] = React.useState<SeminarRequest | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [room, setRoom] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Manual Mode States
  const [isManualMode, setIsManualMode] = React.useState(false);
  const [manualDate, setManualDate] = React.useState('');
  const [manualStartTime, setManualStartTime] = React.useState('');
  const [manualEndTime, setManualEndTime] = React.useState('');

  // WhatsApp notification states
  const [sendNotification, setSendNotification] = React.useState(false);
  const [isSendingNotification, setIsSendingNotification] = React.useState(false);
  const [notificationResults, setNotificationResults] = React.useState<NotificationResult[] | null>(null);
  const [isScheduledSuccess, setIsScheduledSuccess] = React.useState(false);

  // Tabs and Reminders
  const [activeTab, setActiveTab] = React.useState<'allocated' | 'waiting_confirmation'>('allocated');
  const [sendingReminderId, setSendingReminderId] = React.useState<string | null>(null);

  // Queries
  const allocatedRequests = useQuery(api.seminar_requests.getByStatusWithLecturers, { status: 'allocated' });
  const scheduledRequests = useQuery(api.seminar_requests.getByStatusWithLecturers, { status: 'waiting_confirmation' });
  const availableSlots = useQuery(
    api.scheduling.getAvailableSlots,
    selectedRequest
      ? { seminarRequestId: selectedRequest._id as any, weekOffset }
      : 'skip'
  );

  const manualCheckArgs = isManualMode && manualDate && manualStartTime && manualEndTime && selectedRequest
    ? {
        seminarRequestId: selectedRequest._id as any,
        date: manualDate,
        startTime: manualStartTime,
        endTime: manualEndTime,
      }
    : 'skip';
  const manualAvailability = useQuery(api.scheduling.checkSlotAvailability, manualCheckArgs);

  // Mutations & Actions
  const scheduleSeminar = useMutation(api.scheduling.scheduleSeminar);
  const cancelSchedule = useMutation(api.seminar_requests.cancelSchedule);
  const markAsScheduled = useMutation(api.seminar_requests.markAsScheduled);
  const requestRevision = useMutation(api.seminar_requests.requestRevision);
  const sendSeminarNotifications = useAction(api.notifications.sendSeminarNotifications);

  const handleSelectRequest = (request: SeminarRequest) => {
    setSelectedRequest(request);
    setSelectedSlot(null);
    setRoom('');
    setSendNotification(false);
    setNotificationResults(null);
    setIsScheduledSuccess(false);
    setIsManualMode(false);
    setManualDate('');
    setManualStartTime('');
    setManualEndTime('');
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setNotificationResults(null);
    setIsScheduledSuccess(false);
  };

  const handleCheckNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
  };

  const handleCheckPrevWeek = () => {
    setWeekOffset((prev) => Math.max(0, prev - 1));
  };

  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  const handleCancelSchedule = async (requestId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin mengubah jadwal ini? Mahasiswa akan dikembalikan ke daftar tunggu penjadwalan.')) {
      return;
    }
    
    setCancelingId(requestId);
    try {
      await cancelSchedule({ id: requestId as any });
      toast.success('Jadwal berhasil diubah');
    } catch (error: any) {
      console.error('Cancel schedule error:', error);
      toast.error(`Gagal mengubah jadwal: ${error.message}`);
    } finally {
      setCancelingId(null);
    }
  };

  const handleSendReminder = async (requestId: string, isRevision: boolean = false) => {
    setSendingReminderId(requestId);
    try {
      const results = await sendSeminarNotifications({
        seminarRequestId: requestId as any,
        messageType: isRevision ? 'revisi' : 'reminder',
      });

      const successCount = results.results.filter((r: NotificationResult) => r.success).length;
      const totalCount = results.results.length;

      if (results.success) {
        toast.success(`Notifikasi ${isRevision ? 'Revisi' : 'Reminder'} WhatsApp berhasil dikirim ke ${successCount}/${totalCount} dosen`);
      } else {
        const errors = results.results?.filter((r: any) => !r.success).map((r: any) => r.message).join(', ');
        toast.warning(`Beberapa notifikasi gagal: ${errors || 'Cek log'}`);
      }
    } catch (error: any) {
      console.error('Reminder error:', error);
      toast.error(`Gagal mengirim reminder: ${error.message}`);
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleMarkAsScheduled = async (requestId: string) => {
    try {
      await markAsScheduled({ id: requestId as any });
      toast.success('Status berhasil diubah menjadi Terjadwal');
    } catch (error: any) {
      toast.error(`Gagal mengubah status: ${error.message}`);
    }
  };

  const handleSchedule = async () => {
    if (!selectedRequest || !selectedSlot) {
      toast.error('Pilih slot waktu terlebih dahulu');
      return;
    }

    if (!room) {
      toast.error('Ruangan wajib dipilih');
      return;
    }

    setIsSubmitting(true);
    setNotificationResults(null);

    try {
      // First, schedule the seminar
      await scheduleSeminar({
        id: selectedRequest._id as any,
        scheduledDate: selectedSlot.date,
        scheduledStartTime: selectedSlot.startTime,
        scheduledEndTime: selectedSlot.endTime,
        scheduledRoom: room || undefined,
      });

      toast.success('Seminar berhasil dijadwalkan');
      setIsScheduledSuccess(true);

      // Then, send WhatsApp notification if checkbox is checked
      if (sendNotification) {
        setIsSendingNotification(true);
        try {
          const isRevision = (selectedRequest as any).revisionCount && (selectedRequest as any).revisionCount >= 1;
          const results = await sendSeminarNotifications({
            seminarRequestId: selectedRequest._id as any,
            messageType: isRevision ? 'revisi' : 'undangan',
          });
          setNotificationResults(results.results);

          const successCount = results.results.filter((r: NotificationResult) => r.success).length;
          const totalCount = results.results.length;

          if (results.success) {
            toast.success(`Notifikasi WhatsApp berhasil dikirim ke ${successCount}/${totalCount} dosen`);
          } else {
            const errors = results.results?.filter((r: any) => !r.success).map((r: any) => r.message).join(', ');
            toast.warning(`Beberapa notifikasi gagal: ${errors || 'Cek log'}`);
          }
        } catch (notifError: any) {
          console.error('Notification error:', notifError);
          toast.error(`Gagal mengirim notifikasi: ${notifError.message}`);
        } finally {
          setIsSendingNotification(false);
        }
      }

      // Reset form after a delay if notifications were sent, or immediately if not
      if (!sendNotification) {
        setSelectedRequest(null);
        setSelectedSlot(null);
        setRoom('');
        setWeekOffset(0);
        setSendNotification(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal menjadwalkan seminar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedRequest(null);
    setSelectedSlot(null);
    setRoom('');
    setWeekOffset(0);
    setSendNotification(false);
    setNotificationResults(null);
    setIsScheduledSuccess(false);
    setIsManualMode(false);
    setManualDate('');
    setManualStartTime('');
    setManualEndTime('');
  };

  const isLoadingAllocated = allocatedRequests === undefined;
  const isLoadingScheduled = scheduledRequests === undefined;

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
          <div className="flex border-b">
            <button
              className={cn(
                "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors",
                activeTab === 'allocated' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
              onClick={() => {
                setActiveTab('allocated');
                handleReset();
              }}
            >
              Menunggu Penjadwalan ({allocatedRequests?.length || 0})
            </button>
            <button
              className={cn(
                "flex-1 py-3 text-sm font-semibold border-b-2 transition-colors",
                activeTab === 'waiting_confirmation' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
              onClick={() => {
                setActiveTab('waiting_confirmation');
                handleReset();
              }}
            >
              Menunggu Konfirmasi ({scheduledRequests?.length || 0})
            </button>
          </div>

          {activeTab === 'allocated' && (
            isLoadingAllocated ? (
              <div className="space-y-4 pt-2">
                {[...Array(3)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : allocatedRequests && allocatedRequests.length > 0 ? (
              <div className="space-y-4 pt-2">
                {allocatedRequests.map((request) => (
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
              <div className="rounded-lg border p-8 text-center bg-card mt-4">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Tidak ada seminar yang menunggu penjadwalan
                </p>
              </div>
            )
          )}

          {activeTab === 'waiting_confirmation' && (
            isLoadingScheduled ? (
              <div className="space-y-4 pt-2">
                {[...Array(3)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : scheduledRequests && scheduledRequests.length > 0 ? (
              <div className="space-y-4 pt-2">
                {scheduledRequests.map((request) => (
                  <div
                    key={request._id}
                    className="rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
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

                    <div className="space-y-1.5 text-xs mb-3">
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

                    <div className="rounded bg-muted/50 p-3 mb-4 text-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">{request.scheduledDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">
                          {request.scheduledStartTime} - {request.scheduledEndTime} WIB
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-foreground">{request.scheduledRoom || 'Belum ditentukan'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                        onClick={() => handleSendReminder(request._id as string, (request as any).revisionCount >= 1)}
                        disabled={sendingReminderId === request._id || cancelingId === request._id}
                      >
                        {sendingReminderId === request._id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> 
                            Mengirim...
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 mr-2" /> 
                            {(request as any).revisionCount >= 1 ? 'Kirim Revisi Jadwal' : 'Kirim Reminder'}
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200"
                        onClick={() => handleMarkAsScheduled(request._id as string)}
                        disabled={sendingReminderId === request._id || cancelingId === request._id}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-2" /> 
                        Terjadwal
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => handleCancelSchedule(request._id as string)}
                        disabled={cancelingId === request._id || sendingReminderId === request._id}
                      >
                        {cancelingId === request._id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                            Mengubah...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Ubah Jadwal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border p-8 text-center bg-card mt-4">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Belum ada seminar yang terjadwal
                </p>
              </div>
            )
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
                    <span>
                      {[
                        selectedRequest.supervisor1Id,
                        selectedRequest.supervisor2Id,
                        selectedRequest.examiner1Id,
                        selectedRequest.examiner2Id
                      ].filter(Boolean).length} Dosen terlibat
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Durasi: {selectedRequest.type === 'Sidang' ? '120' : '90'} menit
                    </span>
                  </div>
                </div>
              </div>

              {/* Slot Picker */}
              <div className="rounded-lg border p-4">
                <div className="flex border-b mb-4">
                  <button
                    className={cn(
                      "flex-1 py-2 text-sm font-semibold border-b-2 transition-colors",
                      !isManualMode 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setIsManualMode(false)}
                  >
                    Rekomendasi Sistem
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-2 text-sm font-semibold border-b-2 transition-colors",
                      isManualMode 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setIsManualMode(true);
                      setSelectedSlot(null);
                    }}
                  >
                    Input Manual
                  </button>
                </div>

                {isManualMode ? (
                  <div className="space-y-4 p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Tanggal</label>
                        <input 
                          type="date" 
                          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Jam Mulai</label>
                        <input 
                          type="time" 
                          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={manualStartTime}
                          onChange={(e) => {
                            setManualStartTime(e.target.value);
                            // Auto calculate end time
                            if (e.target.value && selectedRequest) {
                              const duration = selectedRequest.type === 'Sidang' ? 120 : 90;
                              const [h, m] = e.target.value.split(':').map(Number);
                              const endMins = h * 60 + m + duration;
                              const endH = Math.floor(endMins / 60).toString().padStart(2, '0');
                              const endM = (endMins % 60).toString().padStart(2, '0');
                              setManualEndTime(`${endH}:${endM}`);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Jam Selesai</label>
                        <input 
                          type="time" 
                          className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={manualEndTime}
                          onChange={(e) => setManualEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    {manualDate && manualStartTime && manualEndTime && (
                      <div className="mt-4 p-4 rounded-lg border bg-muted/20">
                        {manualAvailability === undefined ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Mengecek ketersediaan...
                          </div>
                        ) : manualAvailability.available ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">Waktu aman dan tidak bentrok!</span>
                            </div>
                            <Button 
                              onClick={() => {
                                setSelectedSlot({
                                  date: manualDate,
                                  startTime: manualStartTime,
                                  endTime: manualEndTime,
                                  isAvailable: true,
                                  score: 100
                                });
                              }}
                              variant="outline"
                              className="w-full border-green-600 text-green-600 hover:bg-green-50"
                            >
                              Gunakan Waktu Ini
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                              <AlertTriangle className="h-5 w-5" />
                              <span className="font-medium">Terdapat Bentrok:</span>
                            </div>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-red-600/80">
                              {manualAvailability.conflicts.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                            <div className="pt-2">
                              <Button 
                                onClick={() => {
                                  if (window.confirm('YAKIN INGIN MEMAKSA JADWAL INI? Jadwal akan berbenturan dengan agenda lain.')) {
                                    setSelectedSlot({
                                      date: manualDate,
                                      startTime: manualStartTime,
                                      endTime: manualEndTime,
                                      isAvailable: false,
                                      conflicts: manualAvailability.conflicts
                                    });
                                  }
                                }}
                                variant="outline"
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 text-xs"
                              >
                                Tetap Gunakan (Paksa)
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : availableSlots === undefined ? (
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
                    onCheckPrevWeek={weekOffset > 0 ? handleCheckPrevWeek : undefined}
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

              {/* WhatsApp Notification Option */}
              {selectedSlot && (
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        Kirim Notifikasi WhatsApp?
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Notifikasi akan dikirim ke semua dosen yang terlibat (Pembimbing &amp; Penguji)
                      </p>
                    </div>
                  </label>

                  {/* Notification Status */}
                  {isSendingNotification && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim notifikasi WhatsApp...
                    </div>
                  )}

                  {notificationResults && notificationResults.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">Status Pengiriman:</p>
                      <div className="space-y-1">
                        {notificationResults.map((result, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center gap-2 text-xs p-2 rounded',
                              result.success
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            )}
                          >
                            {result.success ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span className="font-medium">{result.lecturer}</span>
                            <span className="text-muted-foreground">({result.role})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isScheduledSuccess ? (
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleReset}
                    disabled={isSendingNotification}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Selesai
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleReset}
                      disabled={isSubmitting || isSendingNotification}
                    >
                      Batal
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSchedule}
                      disabled={!selectedSlot || isSubmitting || isSendingNotification}
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
                  </>
                )}
              </div>

              {/* Notification info when sending */}
              {sendNotification && selectedSlot && !isScheduledSuccess && (
                <p className="text-xs text-center text-muted-foreground">
                  Setelah penjadwalan berhasil, notifikasi WhatsApp akan dikirim ke semua dosen
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
