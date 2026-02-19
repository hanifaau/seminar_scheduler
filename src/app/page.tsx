'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { Users, Calendar, Upload, BookOpen, ArrowRight, Clock, FileText, UserCheck, AlertCircle } from 'lucide-react';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

// Hari dalam bahasa Indonesia
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTanggalLengkap(date: Date): string {
  const hari = HARI[date.getDay()];
  const tanggal = date.getDate();
  const bulan = BULAN[date.getMonth()];
  const tahun = date.getFullYear();
  return `${hari}, ${tanggal} ${bulan} ${tahun}`;
}

function formatJam(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

// Skeleton component
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

// Stat Card Skeleton
function StatCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3 w-20 mt-2" />
    </div>
  );
}

// Schedule Row Skeleton
function ScheduleRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
    </tr>
  );
}

const SEMINAR_TYPES: Record<string, string> = {
  Proposal: 'Seminar Proposal',
  Hasil: 'Seminar Hasil',
  Sidang: 'Sidang Skripsi',
};

export default function Dashboard() {
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);
  const schedules = useQuery(api.teaching_schedules.getAllWithLecturer);
  const expertiseCategories = useQuery(api.expertise_categories.getAll);
  const seminarCounts = useQuery(api.seminar_requests.getCounts);
  const allocatedSeminars = useQuery(api.seminar_requests.getByStatusWithLecturers, { status: 'allocated' });

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate stats
  const stats = React.useMemo(() => {
    const activeLecturers =
      lecturers?.filter((l) => l.status === 'active' || !l.status).length || 0;
    const totalSchedules = schedules?.length || 0;
    const expertiseCount = expertiseCategories?.length || 0;

    return {
      totalLecturers: lecturers?.length || 0,
      activeLecturers,
      totalSchedules,
      expertiseCount,
      pendingAllocation: seminarCounts?.requested || 0,
      readyToSchedule: seminarCounts?.allocated || 0,
      scheduled: seminarCounts?.scheduled || 0,
    };
  }, [lecturers, schedules, expertiseCategories, seminarCounts]);

  // Get this week's schedules
  const weeklySchedules = React.useMemo(() => {
    if (!schedules) return [];

    const dayIndex: Record<string, number> = {
      'minggu': 0, 'senin': 1, 'selasa': 2, 'rabu': 3,
      'kamis': 4, 'jumat': 5, 'sabtu': 6,
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6,
    };

    return schedules.filter((schedule) => {
      const dayName = schedule.day.toLowerCase();
      const idx = dayIndex[dayName] ?? -1;
      return idx >= 0 && idx <= 6;
    }).slice(0, 10);
  }, [schedules]);

  const isLoading =
    lecturers === undefined ||
    schedules === undefined ||
    expertiseCategories === undefined ||
    seminarCounts === undefined;

  return (
    <div className="space-y-8">
      {/* Header dengan tanggal dinamis */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistem Penjadwalan Seminar Teknik Industri Unand
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {formatTanggalLengkap(currentTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                Pukul {formatJam(currentTime)} WIB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Antrean Penjadwalan Alert */}
      {stats.readyToSchedule > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/20 p-2">
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Antrean Penjadwalan
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.readyToSchedule} seminar siap dijadwalkan
                </p>
              </div>
            </div>
            <Link href="/kaprodi/alokasi">
              <Button size="sm">
                Lihat Detail
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Dosen
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.totalLecturers}
                  </p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.activeLecturers} dosen aktif
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Permohonan Baru
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.pendingAllocation}
                  </p>
                </div>
                <div className="rounded-full bg-yellow-100 p-3">
                  <FileText className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Menunggu alokasi penguji
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Siap Dijadwalkan
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.readyToSchedule}
                  </p>
                </div>
                <div className="rounded-full bg-accent/10 p-3">
                  <UserCheck className="h-6 w-6 text-accent" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sudah ada penguji
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Terjadwal
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.scheduled}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Seminar terjadwal
              </p>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/dosen"
          className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Data Dosen</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola data dosen dan kepakaran
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Link>

        <Link
          href="/admin/permohonan"
          className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Permohonan Seminar</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola permohonan dari mahasiswa
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Link>

        <Link
          href="/kaprodi/alokasi"
          className="group rounded-lg border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Alokasi Penguji</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tentukan penguji seminar
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Link>
      </div>

      {/* Antrean Penjadwalan List */}
      {!isLoading && allocatedSeminars && allocatedSeminars.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              Antrean Penjadwalan
            </h2>
            <Link href="/kaprodi/alokasi">
              <Button variant="outline" size="sm">
                Kelola
              </Button>
            </Link>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-foreground">Mahasiswa</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Jenis</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Pembimbing</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Penguji 1</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Penguji 2</th>
                  </tr>
                </thead>
                <tbody>
                  {allocatedSeminars.slice(0, 5).map((seminar) => (
                    <tr key={seminar._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{seminar.studentName}</p>
                        <p className="text-xs text-muted-foreground">{seminar.nim}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{SEMINAR_TYPES[seminar.type]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div>
                          {seminar.supervisor1?.name || '-'}
                          {seminar.supervisor2 && (
                            <span className="text-xs text-muted-foreground block">
                              {seminar.supervisor2.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {seminar.examiner1?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {seminar.examiner2?.name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Jadwal Seminar Minggu Ini */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Jadwal Seminar Minggu Ini
          </h2>
          <Link href="/kalender">
            <Button variant="outline" size="sm">
              Lihat Kalender
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Dosen</th>
                  <th className="px-4 py-3 text-left font-medium">Hari</th>
                  <th className="px-4 py-3 text-left font-medium">Waktu</th>
                  <th className="px-4 py-3 text-left font-medium">Kegiatan</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <ScheduleRowSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : weeklySchedules.length > 0 ? (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-foreground">Dosen</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Hari</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Waktu</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Kegiatan</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedules.map((schedule) => (
                    <tr key={schedule._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {schedule.lecturer?.name || 'Tidak Diketahui'}
                      </td>
                      <td className="px-4 py-3 text-foreground">{schedule.day}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="px-4 py-3 text-foreground">{schedule.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-8 text-center bg-card">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Belum ada jadwal seminar terdaftar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
