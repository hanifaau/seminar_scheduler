'use client';

import * as React from 'react';
import { Calendar, Clock, CheckCircle2, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/atoms/Button';

interface TimeSlot {
  day: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'ideal' | 'alternative';
  availableDuration: number;
}

interface SlotPickerProps {
  idealSlots: TimeSlot[];
  alternativeSlots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  onCheckNextWeek?: () => void;
  isLoading?: boolean;
  requiredDuration: number;
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
  isLoading = false,
  requiredDuration,
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
        {onCheckNextWeek && (
          <Button variant="outline" onClick={onCheckNextWeek}>
            <ChevronRight className="h-4 w-4 mr-2" />
            Cek Minggu Berikutnya
          </Button>
        )}
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

          <div className="grid gap-3">
            {Object.entries(groupedIdealSlots).map(([date, slots]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatDate(date)}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{slot.availableDuration} menit tersedia</span>
                      </div>
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
              - Durasi {requiredDuration - 10} menit
            </span>
          </div>

          {/* Warning Banner */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Slot alternatif memiliki durasi lebih singkat ({requiredDuration - 10} menit). Pastikan waktu cukup untuk seminar.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {Object.entries(groupedAlternativeSlots).map(([date, slots]) => (
              <div key={date} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {formatDate(date)}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime && (
                          <CheckCircle2 className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{slot.availableDuration} menit tersedia</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
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
  if (!slot) return null;

  const SEMINAR_TYPES: Record<string, string> = {
    Proposal: 'Seminar Proposal',
    Hasil: 'Seminar Hasil',
    Sidang: 'Sidang Skripsi',
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">Slot Terpilih:</p>

      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{formatDate(slot.date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {slot.startTime} - {slot.endTime} WIB
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
        </div>
      </div>

      {onRoomChange && (
        <div className="pt-2 border-t">
          <label className="text-xs text-muted-foreground">Ruangan (opsional)</label>
          <input
            type="text"
            value={room || ''}
            onChange={(e) => onRoomChange(e.target.value)}
            placeholder="Contoh: Lab Komputer 1"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}

export type { TimeSlot };
