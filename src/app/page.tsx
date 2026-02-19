'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  ArrowRight,
  Clock,
  FileText,
  UserCheck,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { StaggerContainer, StaggerItem } from '@/components/atoms/MotionWrapper';
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
    <div className="card-elegant p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-14 w-14 rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-20 mt-3" />
    </div>
  );
}

// Schedule Row Skeleton
function ScheduleRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
    </tr>
  );
}

const SEMINAR_TYPES: Record<string, string> = {
  Proposal: 'Seminar Proposal',
  Hasil: 'Seminar Hasil',
  Sidang: 'Sidang Skripsi',
};

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ title, value, subtitle, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.12)' }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="card-elegant p-6 group cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        </div>
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn('rounded-2xl p-3.5', iconBg)}
        >
          <Icon className={cn('h-6 w-6', iconColor)} />
        </motion.div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p>
    </motion.div>
  );
}

// Quick Action Card
interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function QuickActionCard({ title, description, href, icon: Icon, iconBg, iconColor }: QuickActionProps) {
  return (
    <Link href={href} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="card-elegant p-6 h-full"
      >
        <div className="flex items-start gap-4">
          <div className={cn('rounded-xl p-3 flex-shrink-0', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
        </div>
      </motion.div>
    </Link>
  );
}

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
    <div className="space-y-8 pb-8">
      {/* Header dengan tanggal dinamis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Sistem Penjadwalan Seminar Teknik Industri Unand
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-2xl px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {formatTanggalLengkap(currentTime)}
              </p>
              <p className="text-xs text-muted-foreground">
                Pukul {formatJam(currentTime)} WIB
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Antrean Penjadwalan Alert */}
      {stats.readyToSchedule > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/5 to-accent/10 p-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-accent/15 p-3">
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  Antrean Penjadwalan
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats.readyToSchedule} seminar siap dijadwalkan
                </p>
              </div>
            </div>
            <Link href="/kaprodi/alokasi">
              <Button size="sm" className="rounded-xl">
                Lihat Detail
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <StaggerContainer className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StaggerItem>
              <StatCard
                title="Total Dosen"
                value={stats.totalLecturers}
                subtitle={`${stats.activeLecturers} dosen aktif`}
                icon={Users}
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                title="Permohonan Baru"
                value={stats.pendingAllocation}
                subtitle="Menunggu alokasi penguji"
                icon={FileText}
                iconBg="bg-amber-100"
                iconColor="text-amber-600"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                title="Siap Dijadwalkan"
                value={stats.readyToSchedule}
                subtitle="Sudah ada penguji"
                icon={UserCheck}
                iconBg="bg-accent/10"
                iconColor="text-accent"
              />
            </StaggerItem>

            <StaggerItem>
              <StatCard
                title="Terjadwal"
                value={stats.scheduled}
                subtitle="Seminar terjadwal"
                icon={Calendar}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
              />
            </StaggerItem>
          </>
        )}
      </StaggerContainer>

      {/* Quick Actions */}
      <div>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-semibold text-foreground mb-4"
        >
          Aksi Cepat
        </motion.h2>
        <StaggerContainer className="grid gap-4 md:grid-cols-3" delay={0.35}>
          <StaggerItem>
            <QuickActionCard
              title="Data Dosen"
              description="Kelola data dosen dan bidang kepakaran"
              href="/admin/dosen"
              icon={GraduationCap}
              iconBg="bg-primary/10"
              iconColor="text-primary"
            />
          </StaggerItem>

          <StaggerItem>
            <QuickActionCard
              title="Permohonan Seminar"
              description="Kelola permohonan seminar dari mahasiswa"
              href="/admin/permohonan"
              icon={FileText}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
          </StaggerItem>

          <StaggerItem>
            <QuickActionCard
              title="Alokasi Penguji"
              description="Tentukan penguji untuk setiap seminar"
              href="/kaprodi/alokasi"
              icon={UserCheck}
              iconBg="bg-accent/10"
              iconColor="text-accent"
            />
          </StaggerItem>
        </StaggerContainer>
      </div>

      {/* Antrean Penjadwalan List */}
      {!isLoading && allocatedSeminars && allocatedSeminars.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Antrean Penjadwalan
            </h2>
            <Link href="/kaprodi/alokasi">
              <Button variant="outline" size="sm" className="rounded-xl">
                Kelola
              </Button>
            </Link>
          </div>
          <div className="table-elegant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Mahasiswa</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Jenis</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Pembimbing</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Penguji 1</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Penguji 2</th>
                  </tr>
                </thead>
                <tbody>
                  {allocatedSeminars.slice(0, 5).map((seminar) => (
                    <tr key={seminar._id}>
                      <td className="px-5 py-4">
                        <p className="font-medium text-foreground">{seminar.studentName}</p>
                        <p className="text-xs text-muted-foreground">{seminar.nim}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="rounded-lg">{SEMINAR_TYPES[seminar.type]}</Badge>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        <div>
                          {seminar.supervisor1?.name || '-'}
                          {seminar.supervisor2 && (
                            <span className="text-xs text-muted-foreground block">
                              {seminar.supervisor2.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {seminar.examiner1?.name || '-'}
                      </td>
                      <td className="px-5 py-4 text-foreground">
                        {seminar.examiner2?.name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Jadwal Seminar Minggu Ini */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Jadwal Mengajar Minggu Ini
          </h2>
          <Link href="/kalender">
            <Button variant="outline" size="sm" className="rounded-xl">
              Lihat Kalender
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="table-elegant">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Dosen</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Hari</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Waktu</th>
                  <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Kegiatan</th>
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
          <div className="table-elegant overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Dosen</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Hari</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Waktu</th>
                    <th className="px-5 py-4 text-left font-semibold text-muted-foreground">Kegiatan</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySchedules.map((schedule) => (
                    <tr key={schedule._id}>
                      <td className="px-5 py-4 font-medium text-foreground">
                        {schedule.lecturer?.name || 'Tidak Diketahui'}
                      </td>
                      <td className="px-5 py-4 text-foreground">{schedule.day}</td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="px-5 py-4 text-foreground">{schedule.activity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-elegant p-12 text-center">
            <div className="rounded-2xl bg-muted/50 p-4 w-fit mx-auto mb-4">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">
              Belum ada jadwal mengajar terdaftar
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Unggah jadwal dosen untuk memulai penjadwalan seminar
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
