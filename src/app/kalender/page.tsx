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

interface ScheduleWithLecturer {
  _id: string;
  lecturerId: string;
  day: string;
  startTime: string;
  endTime: string;
  activity: string;
  room?: string;
  notes?: string;
  lecturer?: {
    _id: string;
    name: string;
    nip: string;
    expertise: string[];
  };
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
  const schedules = useQuery(api.teaching_schedules.getAllWithLecturer);

  // Get schedules for the selected week
  const weeklySchedules = React.useMemo(() => {
    if (!schedules || selectedWeek.length === 0) return [];

    const weekDayNumbers = selectedWeek.map(d => d.getDay());

    return (schedules as ScheduleWithLecturer[]).filter((schedule) => {
      const dayNum = DAY_MAP[schedule.day.toLowerCase()];
      return dayNum !== undefined && weekDayNumbers.includes(dayNum);
    });
  }, [schedules, selectedWeek]);

  // Group schedules by day
  const schedulesByDay = React.useMemo(() => {
    const grouped: Record<number, ScheduleWithLecturer[]> = {};
    HARI_INDONESIA.forEach((_, i) => {
      grouped[i] = [];
    });

    weeklySchedules.forEach((schedule) => {
      const dayNum = DAY_MAP[schedule.day.toLowerCase()];
      if (dayNum !== undefined) {
        if (!grouped[dayNum]) grouped[dayNum] = [];
        grouped[dayNum].push(schedule);
      }
    });

    // Sort each day's schedules by time
    Object.keys(grouped).forEach((key) => {
      grouped[parseInt(key)].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
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
                            className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-shrink-0 text-center">
                              <Clock className="h-4 w-4 text-primary mx-auto" />
                              <p className="text-xs font-medium text-foreground mt-1">
                                {schedule.startTime}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {schedule.endTime}
                              </p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {schedule.activity}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <User className="h-3 w-3" />
                                <span>{schedule.lecturer?.name || 'Tidak Diketahui'}</span>
                              </div>
                              {schedule.room && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ruang: {schedule.room}
                                </p>
                              )}
                            </div>
                            {schedule.notes && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                Catatan
                              </Badge>
                            )}
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
