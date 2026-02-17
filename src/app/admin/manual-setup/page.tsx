'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Calendar,
  Clock,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  Plus,
  BookOpen,
  User,
  MapPin,
  RefreshCw,
} from 'lucide-react';
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
import {
  getAvailableShifts,
  getShiftById,
  DAYS_OF_WEEK,
  COMMON_ROOMS,
  type DayOfWeek,
  type Shift,
} from '@/lib/shiftLogic';

interface Lecturer {
  _id: string;
  name: string;
  nip: string;
}

interface Course {
  _id: string;
  code: string;
  name: string;
  sks: number;
}

interface Schedule {
  _id: string;
  lecturerId: string;
  courseId?: string;
  day: string;
  shiftId?: string;
  startTime: string;
  endTime: string;
  activity: string;
  room?: string;
  lecturer?: Lecturer;
  course?: Course;
}

export default function ManualSetupPage() {
  // Form state
  const [selectedLecturerId, setSelectedLecturerId] = React.useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>('');
  const [selectedDay, setSelectedDay] = React.useState<string>('');
  const [selectedShiftId, setSelectedShiftId] = React.useState<string>('');
  const [room, setRoom] = React.useState('');
  const [customRoom, setCustomRoom] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  // Search state
  const [lecturerSearch, setLecturerSearch] = React.useState('');
  const [courseSearch, setCourseSearch] = React.useState('');

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);
  const courses = useQuery(api.courses.getAll);
  const schedules = useQuery(api.teaching_schedules.getAllWithLecturer);

  // Mutations
  const createSchedule = useMutation(api.teaching_schedules.createWithValidation);
  const seedCourses = useMutation(api.courses.seed);

  // Get selected course details
  const selectedCourse = courses?.find((c) => c._id === selectedCourseId);

  // Get available shifts based on selected course SKS and day
  const availableShifts = React.useMemo(() => {
    if (!selectedCourse || !selectedDay) return [];
    return getAvailableShifts(selectedCourse.sks as 2 | 3, selectedDay as DayOfWeek);
  }, [selectedCourse, selectedDay]);

  // Get selected shift details
  const selectedShift = selectedShiftId ? getShiftById(selectedShiftId) : null;

  // Filter lecturers by search
  const filteredLecturers = React.useMemo(() => {
    if (!lecturers) return [];
    if (!lecturerSearch) return lecturers;
    return lecturers.filter(
      (l) =>
        l.name.toLowerCase().includes(lecturerSearch.toLowerCase()) ||
        l.nip.includes(lecturerSearch)
    );
  }, [lecturers, lecturerSearch]);

  // Filter courses by search
  const filteredCourses = React.useMemo(() => {
    if (!courses) return [];
    if (!courseSearch) return courses;
    return courses.filter(
      (c) =>
        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.name.toLowerCase().includes(courseSearch.toLowerCase())
    );
  }, [courses, courseSearch]);

  // Group courses by SKS
  const coursesBySks = React.useMemo(() => {
    if (!filteredCourses) return {};
    return filteredCourses.reduce(
      (acc, course) => {
        const key = course.sks;
        if (!acc[key]) acc[key] = [];
        acc[key].push(course);
        return acc;
      },
      {} as Record<number, Course[]>
    );
  }, [filteredCourses]);

  // Reset shift when day or course changes
  React.useEffect(() => {
    setSelectedShiftId('');
  }, [selectedDay, selectedCourseId]);

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!selectedLecturerId) {
      toast.error('Pilih dosen terlebih dahulu');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Pilih mata kuliah terlebih dahulu');
      return;
    }
    if (!selectedDay) {
      toast.error('Pilih hari terlebih dahulu');
      return;
    }
    if (!selectedShiftId) {
      toast.error('Pilih shift terlebih dahulu');
      return;
    }

    const finalRoom = room === 'custom' ? customRoom : room;
    const shift = getShiftById(selectedShiftId);

    if (!shift) {
      toast.error('Shift tidak valid');
      return;
    }

    setIsSaving(true);
    try {
      await createSchedule({
        lecturerId: selectedLecturerId as any,
        courseId: selectedCourseId as any,
        day: selectedDay,
        shiftId: selectedShiftId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        activity: selectedCourse?.name || 'Mengajar',
        room: finalRoom || undefined,
        notes: notes || undefined,
      });

      toast.success('Jadwal berhasil disimpan');

      // Reset form
      setSelectedShiftId('');
      setRoom('');
      setCustomRoom('');
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan jadwal');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle seed courses
  const handleSeedCourses = async () => {
    try {
      const result = await seedCourses({});
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan mata kuliah');
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedLecturerId('');
    setSelectedCourseId('');
    setSelectedDay('');
    setSelectedShiftId('');
    setRoom('');
    setCustomRoom('');
    setNotes('');
    setLecturerSearch('');
    setCourseSearch('');
  };

  const isLoading = lecturers === undefined || courses === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atur Jadwal Manual</h1>
          <p className="text-muted-foreground">
            Buat jadwal mengajar dengan sistem shift 2/3 SKS
          </p>
        </div>
        {courses && courses.length === 0 && (
          <Button onClick={handleSeedCourses} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tambah Mata Kuliah Default
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Lecturer */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Pilih Dosen
              </h3>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Cari nama atau NIP..."
                value={lecturerSearch}
                onChange={(e) => setLecturerSearch(e.target.value)}
              />
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredLecturers.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">
                    Tidak ada dosen yang sesuai
                  </p>
                ) : (
                  <div className="divide-y">
                    {filteredLecturers.map((lecturer) => (
                      <button
                        key={lecturer._id}
                        onClick={() => {
                          setSelectedLecturerId(lecturer._id);
                          setLecturerSearch('');
                        }}
                        className={cn(
                          'w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between',
                          selectedLecturerId === lecturer._id && 'bg-emerald-50 dark:bg-emerald-950/30'
                        )}
                      >
                        <div>
                          <p className="font-medium text-foreground">{lecturer.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {lecturer.nip}
                          </p>
                        </div>
                        {selectedLecturerId === lecturer._id && (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Select Course */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Pilih Mata Kuliah
              </h3>
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Cari kode atau nama mata kuliah..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
              />
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {Object.keys(coursesBySks).length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground text-center">
                    Tidak ada mata kuliah yang sesuai
                  </p>
                ) : (
                  Object.entries(coursesBySks).map(([sks, courseList]) => (
                    <div key={sks}>
                      <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                        {sks} SKS
                      </div>
                      {courseList.map((course) => (
                        <button
                          key={course._id}
                          onClick={() => setSelectedCourseId(course._id)}
                          className={cn(
                            'w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-t',
                            selectedCourseId === course._id && 'bg-emerald-50 dark:bg-emerald-950/30'
                          )}
                        >
                          <div>
                            <p className="font-medium text-foreground">{course.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {course.code} - {course.sks} SKS
                            </p>
                          </div>
                          {selectedCourseId === course._id && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Terpilih
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Select Day and Shift */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Pilih Hari dan Shift
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Day Selection */}
              <div className="space-y-2">
                <Label>Hari</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hari" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Selection */}
              <div className="space-y-2">
                <Label>Shift</Label>
                {selectedCourse && selectedDay ? (
                  <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.label} ({shift.startTime} - {shift.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih mata kuliah & hari dulu" />
                    </SelectTrigger>
                  </Select>
                )}
              </div>
            </div>

            {/* Shift Info */}
            {selectedShift && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {selectedShift.label}: {selectedShift.startTime} - {selectedShift.endTime}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Room and Notes */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-medium">
                4
              </div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ruangan (Opsional)
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ruangan</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih ruangan" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ROOMS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Lainnya...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {room === 'custom' && (
                <div className="space-y-2">
                  <Label>Nama Ruangan</Label>
                  <Input
                    placeholder="Masukkan nama ruangan"
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Input
                placeholder="Catatan tambahan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Reset
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={isSaving || !selectedLecturerId || !selectedCourseId || !selectedDay || !selectedShiftId}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Simpan Jadwal
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary & Recent Schedules */}
        <div className="space-y-6">
          {/* Form Summary */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Ringkasan</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dosen:</span>
                <span className="font-medium text-foreground">
                  {selectedLecturerId
                    ? lecturers?.find((l) => l._id === selectedLecturerId)?.name || '-'
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mata Kuliah:</span>
                <span className="font-medium text-foreground">
                  {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKS:</span>
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                >
                  {selectedCourse?.sks || '-'} SKS
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hari:</span>
                <span className="font-medium text-foreground">{selectedDay || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift:</span>
                <span className="font-medium text-foreground">
                  {selectedShift
                    ? `${selectedShift.label} (${selectedShift.startTime} - ${selectedShift.endTime})`
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ruangan:</span>
                <span className="font-medium text-foreground">
                  {room === 'custom' ? customRoom || '-' : room || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Shift Rules Reference */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Referensi Shift</h3>

            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                  Sistem 2 SKS
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>Shift 1: 07:30 - 09:10</li>
                  <li>Shift 2: 09:20 - 11:00</li>
                  <li>Shift 3: 11:10 - 12:50*</li>
                  <li>Shift 4: 13:30 - 15:10</li>
                  <li>Shift 5: 16:00 - 17:40</li>
                </ul>
              </div>

              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Sistem 3 SKS
                </p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>Shift 1: 07:30 - 10:00</li>
                  <li>Shift 2: 10:10 - 12:40*</li>
                  <li>Shift 3: 13:30 - 16:00</li>
                  <li>Shift 4: 16:00 - 17:40</li>
                </ul>
              </div>

              <p className="text-muted-foreground italic">
                * Tidak tersedia pada hari Jumat
              </p>
            </div>
          </div>

          {/* Recent Schedules */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Jadwal Terbaru</h3>

            {schedules && schedules.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {schedules.slice(0, 5).map((schedule) => (
                  <div
                    key={schedule._id}
                    className="text-xs p-2 rounded bg-muted/50 space-y-1"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">
                        {schedule.lecturer?.name || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {schedule.day}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground truncate">{schedule.activity}</p>
                    <p className="text-muted-foreground">
                      {schedule.startTime} - {schedule.endTime}
                      {schedule.room && ` | ${schedule.room}`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada jadwal
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
