'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

// Custom styles for DayPicker
const customDayPickerStyles = `
  .rdp {
    --rdp-cell-size: 48px;
    --rdp-accent-color: #15803d;
    --rdp-background-color: #f0fdf4;
    margin: 0;
  }
  .rdp-nav_button {
    color: #15803d;
  }
  .rdp-day_selected {
    background-color: #15803d !important;
    color: white;
  }
  .rdp-day_today {
    font-weight: bold;
    border: 2px solid #15803d;
    border-radius: 50%;
  }
  .rdp-caption_label {
    font-weight: 600;
    color: #1a1a1a;
  }
`;

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

// Map day names to numbers (0 = Sunday)
const DAY_MAP: Record<string, number> = {
  'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
  'kamis': 4, 'jumat': 5, 'sabtu': 6,
  'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
  'thursday': 4, 'friday': 5, 'saturday': 6,
};

const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getWeekDates(date: Date): Date[] {
  const week: Date[] = [];
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(d);
  }
  return week;
}

export default function KalenderPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = React.useState<Date[]>(getWeekDates(new Date()));

  // Queries
  const schedules = useQuery(api.seminar_requests.getAllWithLecturers);

  // Get schedules for the selected week
  const weeklySchedules = React.useMemo(() => {
    if (!schedules || selectedWeek.length === 0) return [];

    // Format week dates to YYYY-MM-DD to match scheduledDate
    const weekDateStrings = selectedWeek.map(d => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    return schedules.filter((schedule) => {
      return schedule.status === 'scheduled' && schedule.scheduledDate && weekDateStrings.includes(schedule.scheduledDate);
    });
  }, [schedules, selectedWeek]);

  // Group schedules by day
  const schedulesByDay = React.useMemo(() => {
    const grouped: Record<number, any[]> = {};
    HARI_INDONESIA.forEach((_, i) => {
      grouped[i] = [];
    });

    weeklySchedules.forEach((schedule) => {
      if (!schedule.scheduledDate) return;
      const d = new Date(schedule.scheduledDate);
      const dayNum = d.getDay(); // 0 is Sunday, 1 is Monday...
      if (dayNum !== undefined) {
        if (!grouped[dayNum]) grouped[dayNum] = [];
        grouped[dayNum].push(schedule);
      }
    });

    // Sort each day's schedules by time
    Object.keys(grouped).forEach((key) => {
      grouped[parseInt(key)].sort((a, b) =>
        (a.scheduledStartTime || '').localeCompare(b.scheduledStartTime || '')
      );
    });

    return grouped;
  }, [weeklySchedules]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setSelectedWeek(getWeekDates(date));
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentDate = selectedDate || new Date();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
    setSelectedWeek(getWeekDates(newDate));
    setCurrentMonth(newDate);
  };

  const isLoading = schedules === undefined;

  // Format week header
  const weekHeader = React.useMemo(() => {
    if (selectedWeek.length === 0) return '';
    const start = selectedWeek[0];
    const end = selectedWeek[6];
    const weekNum = getWeekNumber(selectedDate || new Date());

    return `Minggu ke-${weekNum}: ${start.getDate()} ${BULAN_INDONESIA[start.getMonth()]} - ${end.getDate()} ${BULAN_INDONESIA[end.getMonth()]} ${end.getFullYear()}`;
  }, [selectedWeek, selectedDate]);

  // Format month caption
  const formatMonthCaption = (date: Date) => {
    return `${BULAN_INDONESIA[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kalender Seminar</h1>
        <p className="text-muted-foreground">
          Lihat jadwal seminar berdasarkan kalender bulanan
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
        {/* Calendar */}
        <div className="bg-card rounded-lg border p-4">
          <style>{customDayPickerStyles}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            showWeekNumber
            formatters={{
              formatMonthCaption: formatMonthCaption,
              formatWeekdayName: (date: Date) => {
                const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                return days[date.getDay()];
              },
            }}
          />
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-card rounded-lg border p-4">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-foreground">{weekHeader}</p>
              <p className="text-sm text-muted-foreground">
                Klik tanggal pada kalender untuk memilih minggu
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Schedule Cards by Day */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <Skeleton className="h-5 w-24 mb-3" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedWeek.map((date, dayIndex) => {
                const daySchedules = schedulesByDay[dayIndex] || [];
                const isToday = date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'rounded-lg border p-4',
                      isToday && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {HARI_INDONESIA[dayIndex]}
                        </h3>
                        {isToday && (
                          <Badge variant="success" className="text-xs">Hari Ini</Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {date.getDate()} {BULAN_INDONESIA[date.getMonth()]}
                      </span>
                    </div>

                    {daySchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Tidak ada jadwal seminar
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {daySchedules.map((schedule) => (
                          <div
                            key={schedule._id}
                            className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2 text-primary font-medium text-sm">
                                  <Clock className="h-4 w-4" />
                                  {schedule.scheduledStartTime} - {schedule.scheduledEndTime}
                               </div>
                               <Badge variant="outline">{schedule.type}</Badge>
                            </div>
                            
                            <div>
                               <p className="font-semibold text-foreground text-sm">{schedule.studentName} <span className="text-muted-foreground font-normal">({schedule.nim})</span></p>
                               <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{schedule.title}</p>
                            </div>

                            <div className="flex flex-col gap-1 mt-1 pt-2 border-t text-xs text-foreground">
                               <div className="flex gap-2 items-start">
                                 <span className="w-20 font-medium text-muted-foreground">Ruang:</span>
                                 <span>{schedule.scheduledRoom || 'Belum ditentukan'}</span>
                               </div>
                               <div className="flex gap-2 items-start">
                                 <span className="w-20 font-medium text-muted-foreground">Pembimbing:</span>
                                 <span>{schedule.supervisor1?.name} {schedule.supervisor2 ? `, ${schedule.supervisor2.name}` : ''}</span>
                               </div>
                               <div className="flex gap-2 items-start">
                                 <span className="w-20 font-medium text-muted-foreground">Penguji:</span>
                                 <span>{schedule.examiner1?.name || '-'} {schedule.examiner2 ? `, ${schedule.examiner2.name}` : ''}</span>
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
