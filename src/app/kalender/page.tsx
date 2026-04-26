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
  .has-schedule {
    font-weight: 800;
    color: #059669 !important;
    background-color: #d1fae5;
    border-radius: 50%;
  }
  .rdp-day_selected.has-schedule {
    background-color: #15803d !important;
    color: white !important;
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

  // Queries
  const schedules = useQuery(api.seminar_requests.getAllWithLecturers);
  const teachingSchedules = useQuery(api.teaching_schedules.getAllWithLecturer);

  // Extract all dates that have schedules to highlight in calendar
  const datesWithSchedules = React.useMemo(() => {
    if (!schedules) return [];
    
    return schedules
      .filter(s => s.status === 'scheduled' && s.scheduledDate)
      .map(s => {
        const [year, month, day] = s.scheduledDate!.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      });
  }, [schedules]);

  // Get schedules for the selected date
  const dailySchedules = React.useMemo(() => {
    if (!schedules || !selectedDate) return [];

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const targetDateString = `${year}-${month}-${day}`;

    const filtered = schedules.filter((schedule) => {
      return schedule.status === 'scheduled' && schedule.scheduledDate === targetDateString;
    });

    filtered.sort((a, b) => (a.scheduledStartTime || '').localeCompare(b.scheduledStartTime || ''));
    return filtered;
  }, [schedules, selectedDate]);

  // Get teaching schedules for the selected day of week
  const dailyTeachingSchedules = React.useMemo(() => {
    if (!teachingSchedules || !selectedDate) return [];

    const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    const selectedDayName = dayNames[selectedDate.getDay()];

    const filtered = teachingSchedules.filter((schedule) => {
      return schedule.day.toLowerCase() === selectedDayName;
    });

    filtered.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return filtered;
  }, [teachingSchedules, selectedDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentDate = selectedDate || new Date();
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
    setCurrentMonth(newDate);
  };

  const isLoading = schedules === undefined || teachingSchedules === undefined;

  // Format day header
  const dayHeader = React.useMemo(() => {
    if (!selectedDate) return '';
    const dayName = HARI_INDONESIA[selectedDate.getDay()];
    return `${dayName}, ${selectedDate.getDate()} ${BULAN_INDONESIA[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }, [selectedDate]);

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
            modifiers={{
              hasSchedule: datesWithSchedules
            }}
            modifiersClassNames={{
              hasSchedule: 'has-schedule'
            }}
            formatters={{
              formatMonthCaption: formatMonthCaption,
              formatWeekdayName: (date: Date) => {
                const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                return days[date.getDay()];
              },
            }}
          />
        </div>

        {/* Daily Schedule */}
        <div className="space-y-4">
          {/* Day Navigation */}
          <div className="flex items-center justify-between bg-card rounded-lg border p-4">
            <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-foreground">{dayHeader}</p>
              <p className="text-sm text-muted-foreground">
                Klik tanggal pada kalender untuk melihat jadwal
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Schedule Cards */}
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={`loading-left-${i}`} className="rounded-lg border p-4">
                    <Skeleton className="h-5 w-24 mb-3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={`loading-right-${i}`} className="rounded-lg border p-4">
                    <Skeleton className="h-5 w-24 mb-3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 items-start">
                  {/* Teaching Schedules Block (Zona Kiri) */}
                  <div className="rounded-lg border p-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-500">
                          Jadwal Mengajar Reguler
                        </h3>
                      </div>
                    </div>

                    {dailyTeachingSchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Tidak ada jadwal mata kuliah pada hari ini
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyTeachingSchedules.map((schedule) => (
                          <div
                            key={schedule._id}
                            className="flex flex-col gap-2 p-3 bg-card rounded-lg border border-amber-200 dark:border-amber-900/50 hover:shadow-sm transition-colors"
                          >
                            <div className="flex justify-between items-start">
                               <div className="flex items-center gap-2 text-amber-600 font-medium text-sm">
                                  <Clock className="h-4 w-4" />
                                  {schedule.startTime} - {schedule.endTime}
                               </div>
                               {schedule.course && (
                                 <Badge variant="outline" className="text-amber-700 border-amber-300">
                                   {schedule.course.sks} SKS
                                 </Badge>
                               )}
                            </div>
                            
                            <div>
                               <p className="font-semibold text-foreground text-sm">{schedule.activity}</p>
                               <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                 <User className="h-3 w-3" />
                                 <span>{schedule.lecturer?.name || 'Tidak Diketahui'}</span>
                               </div>
                            </div>

                            {schedule.room && (
                              <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-amber-100 dark:border-amber-900/30 text-xs text-foreground">
                                 <div className="flex gap-2 items-start">
                                   <span className="w-16 font-medium text-muted-foreground">Ruang:</span>
                                   <span>{schedule.room}</span>
                                 </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Jadwal Sidang Block (Zona Kanan) */}
                  <div className="rounded-lg border p-4 border-primary bg-primary/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          Jadwal Sidang
                        </h3>
                        {selectedDate?.toDateString() === new Date().toDateString() && (
                          <Badge variant="success" className="text-xs">Hari Ini</Badge>
                        )}
                      </div>
                    </div>

                    {dailySchedules.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Tidak ada jadwal seminar pada tanggal ini
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailySchedules.map((schedule) => (
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
