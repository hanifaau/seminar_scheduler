'use client';

import * as React from 'react';
import { Calendar, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Loader2, User } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';

interface NextLecturerClass {
  lecturerName: string;
  className: string;
  classStart: string;
  minutesUntilClass: number;
  isBreak?: boolean;
}

interface TimeSlot {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'ideal' | 'alternative';
  availableDuration: number;
  nextLecturerClass?: NextLecturerClass;
}

interface SlotPickerProps {
  idealSlots: TimeSlot[];
  alternativeSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  onCheckNextWeek?: () => void;
  onCheckPrevWeek?: () => void;
  isLoading?: boolean;
  requiredDuration: number;
  alternativeDuration?: number;
}

// Format date to Indonesian locale
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Format date to short version
function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

export function SlotPicker({
  idealSlots,
  alternativeSlots,
  selectedSlot,
  onSelectSlot,
  onCheckNextWeek,
  onCheckPrevWeek,
  isLoading = false,
  requiredDuration,
  alternativeDuration,
}: SlotPickerProps) {
  const hasIdealSlots = idealSlots.length > 0;
  const hasAlternativeSlots = alternativeSlots.length > 0;
  const hasAnySlots = hasIdealSlots || hasAlternativeSlots;

  // Group slots by date
  const groupedIdealSlots = React.useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of idealSlots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [idealSlots]);

  const groupedAlternativeSlots = React.useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    for (const slot of alternativeSlots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [alternativeSlots]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Mencari slot tersedia...</p>
      </div>
    );
  }

  if (!hasAnySlots) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
        <div className="rounded-full bg-muted p-4">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Tidak Ada Jadwal Tersedia</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tidak ditemukan slot waktu yang cocok untuk minggu ini
          </p>
        </div>
        <div className="flex gap-2">
          {onCheckPrevWeek && (
            <Button variant="outline" onClick={onCheckPrevWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Minggu Sebelumnya
            </Button>
          )}
          {onCheckNextWeek && (
            <Button variant="outline" onClick={onCheckNextWeek}>
              Cek Minggu Berikutnya
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ideal Slots Section */}
      {hasIdealSlots && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-foreground">
              Slot Ideal ({idealSlots.length})
            </span>
            <span className="text-xs text-muted-foreground">
              - Durasi penuh {requiredDuration} menit
            </span>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedIdealSlots).map(([date, slots]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatDate(date)}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {slots.map((slot, index) => (
                    <button
                      key={`${slot.date}-${slot.startTime}-${index}`}
                      onClick={() => onSelectSlot(slot)}
                      className={cn(
                        'group relative flex flex-col p-3 rounded-lg border-2 text-left transition-all',
                        'hover:border-emerald-400 hover:shadow-md',
                        selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                          : 'border-emerald-200 dark:border-emerald-900/50 bg-card'
                      )}
                    >
                      {/* Time Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-foreground text-lg">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>

                      {/* Duration Badge */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        <span>Tersedia {slot.availableDuration} menit</span>
                      </div>

                      {/* Next Class Info */}
                      {slot.nextLecturerClass && (
                        <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900">
                          <div className="flex items-start gap-2 text-xs">
                            <User className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <div className="text-emerald-700 dark:text-emerald-300">
                              {slot.nextLecturerClass.isBreak ? (
                                <>
                                  <span className="font-medium">{slot.nextLecturerClass.className}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400"> pada jam {slot.nextLecturerClass.classStart}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">{slot.nextLecturerClass.lecturerName}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400"> memiliki jadwal </span>
                                  <span className="font-medium">{slot.nextLecturerClass.className}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400"> jam {slot.nextLecturerClass.classStart}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Slots Section */}
      {hasAlternativeSlots && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-foreground">
              Slot Alternatif ({alternativeSlots.length})
            </span>
            <span className="text-xs text-muted-foreground">
              - Durasi {alternativeDuration || requiredDuration - 10} menit
            </span>
          </div>

          {/* Warning Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Slot alternatif memiliki durasi lebih singkat ({alternativeDuration || requiredDuration - 10} menit). Pastikan waktu cukup untuk seminar.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(groupedAlternativeSlots).map(([date, slots]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatDate(date)}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {slots.map((slot, index) => (
                    <button
                      key={`${slot.date}-${slot.startTime}-${index}`}
                      onClick={() => onSelectSlot(slot)}
                      className={cn(
                        'group relative flex flex-col p-3 rounded-lg border-2 text-left transition-all',
                        'hover:border-amber-400 hover:shadow-md',
                        selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                          : 'border-amber-200 dark:border-amber-900/50 bg-card'
                      )}
                    >
                      {/* Time Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-foreground text-lg">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime && (
                          <CheckCircle2 className="h-5 w-5 text-amber-500" />
                        )}
                      </div>

                      {/* Duration Badge */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        <span>Tersedia {slot.availableDuration} menit</span>
                      </div>

                      {/* Next Class Info */}
                      {slot.nextLecturerClass && (
                        <div className="mt-2 pt-2 border-t border-amber-100 dark:border-amber-900">
                          <div className="flex items-start gap-2 text-xs">
                            <User className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-amber-700 dark:text-amber-300">
                              {slot.nextLecturerClass.isBreak ? (
                                <>
                                  <span className="font-medium">{slot.nextLecturerClass.className}</span>
                                  <span className="text-amber-600 dark:text-amber-400"> pada jam {slot.nextLecturerClass.classStart}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">{slot.nextLecturerClass.lecturerName}</span>
                                  <span className="text-amber-600 dark:text-amber-400"> memiliki jadwal </span>
                                  <span className="font-medium">{slot.nextLecturerClass.className}</span>
                                  <span className="text-amber-600 dark:text-amber-400"> jam {slot.nextLecturerClass.classStart}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(onCheckNextWeek || onCheckPrevWeek) && (
        <div className="flex justify-center gap-4 pt-4 border-t">
          {onCheckPrevWeek && (
            <Button variant="outline" onClick={onCheckPrevWeek}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Minggu Sebelumnya
            </Button>
          )}
          {onCheckNextWeek && (
            <Button variant="outline" onClick={onCheckNextWeek}>
              Cek Minggu Berikutnya
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Slot Summary Component for displaying selected slot
interface SlotSummaryProps {
  slot: TimeSlot | null;
  seminarType: 'Proposal' | 'Hasil' | 'Sidang';
  room?: string;
  onRoomChange?: (room: string) => void;
}

export function SlotSummary({ slot, seminarType, room, onRoomChange }: SlotSummaryProps) {
  const availableRooms = useQuery(api.scheduling.getAvailableRooms, slot ? {
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  } : 'skip');

  if (!slot) return null;

  const SEMINAR_TYPES: Record<string, string> = {
    Proposal: 'Seminar Proposal',
    Hasil: 'Seminar Hasil',
    Sidang: 'Sidang Skripsi',
  };

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-card">
      <p className="text-sm font-medium text-foreground">Slot Terpilih:</p>

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground font-medium">{formatDate(slot.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            <span className="font-medium">{slot.startTime} - {slot.endTime}</span> WIB
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            'h-4 w-4 rounded-full',
            slot.type === 'ideal' ? 'bg-emerald-500' : 'bg-amber-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            slot.type === 'ideal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          )}>
            {slot.type === 'ideal' ? 'Slot Ideal' : 'Slot Alternatif'}
          </span>
          <Badge variant="secondary" className="text-xs">
            {slot.availableDuration} menit tersedia
          </Badge>
        </div>

        {/* Next Class Warning */}
        {slot.nextLecturerClass && (
          <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            {slot.nextLecturerClass.isBreak ? (
              <>
                <span>Mendekati waktu </span>
                <span className="font-medium text-foreground">{slot.nextLecturerClass.className}</span>
                <span> pada jam </span>
                <span className="font-medium text-foreground">{slot.nextLecturerClass.classStart}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">{slot.nextLecturerClass.lecturerName}</span>
                <span> memiliki jadwal </span>
                <span className="font-medium text-foreground">{slot.nextLecturerClass.className}</span>
                <span> jam </span>
                <span className="font-medium text-foreground">{slot.nextLecturerClass.classStart}</span>
              </>
            )}
          </div>
        )}
      </div>

      {onRoomChange && (
        <div className="pt-3 border-t">
          <label className="text-xs text-muted-foreground">Ruangan <span className="text-red-500">*</span></label>
          <select
            value={room || ''}
            onChange={(e) => onRoomChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
            disabled={!availableRooms}
          >
            <option value="">-- Pilih Ruangan --</option>
            {availableRooms === undefined ? (
              <option disabled>Memuat ruangan...</option>
            ) : availableRooms.length === 0 ? (
              <option disabled>Tidak ada ruangan yang tersedia di jam ini</option>
            ) : (
              availableRooms.map((r) => (
                <option key={r._id} value={r.name}>{r.name} {r.capacity ? `(Kap: ${r.capacity})` : ''}</option>
              ))
            )}
          </select>
          {availableRooms && availableRooms.length === 0 && (
             <p className="text-xs text-red-500 mt-1">Semua ruangan sedang terpakai pada slot waktu ini.</p>
          )}
        </div>
      )}
    </div>
  );
}

export type { TimeSlot, NextLecturerClass };
