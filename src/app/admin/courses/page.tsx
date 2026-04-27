'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Loader2,
  BookOpen,
  Users,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

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
  lecturerIds: string[];
  semester?: number;
  description?: string;
  lecturers?: Lecturer[];
}

export default function MasterCoursesPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState({
    code: '',
    name: '',
    sks: 3,
    lecturerIds: [] as string[],
    semester: 1,
    description: '',
  });

  // Lecturer search state
  const [lecturerSearch, setLecturerSearch] = React.useState('');

  // Queries
  const courses = useQuery(api.courses.getAllWithLecturers);
  const lecturers = useQuery(api.lecturers.getAll);

  // Mutations
  const createCourse = useMutation(api.courses.create);
  const updateCourse = useMutation(api.courses.update);
  const deleteCourse = useMutation(api.courses.remove);
  const seedCourses = useMutation(api.courses.seed);

  // Filter courses by search
  const filteredCourses = React.useMemo(() => {
    if (!courses) return [];
    if (!searchQuery) return courses;

    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

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

  // Toggle lecturer selection
  const toggleLecturer = (lecturerId: string) => {
    setFormData((prev) => ({
      ...prev,
      lecturerIds: prev.lecturerIds.includes(lecturerId)
        ? prev.lecturerIds.filter((id) => id !== lecturerId)
        : [...prev.lecturerIds, lecturerId],
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      sks: 3,
      lecturerIds: [],
      semester: 1,
      description: '',
    });
    setLecturerSearch('');
  };

  // Handle add course
  const handleAddCourse = async () => {
    if (!formData.code || !formData.name) {
      toast.error('Kode dan Nama mata kuliah wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      await createCourse({
        code: formData.code,
        name: formData.name,
        sks: formData.sks,
        lecturerIds: formData.lecturerIds as any,
        semester: formData.semester || undefined,
        description: formData.description || undefined,
      });

      toast.success('Mata kuliah berhasil ditambahkan');
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan mata kuliah');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit course
  const handleEditCourse = async () => {
    if (!editingCourse) return;

    setIsSaving(true);
    try {
      await updateCourse({
        id: editingCourse._id as any,
        code: formData.code || undefined,
        name: formData.name || undefined,
        sks: formData.sks || undefined,
        lecturerIds: formData.lecturerIds as any,
        semester: formData.semester || undefined,
        description: formData.description || undefined,
      });

      toast.success('Mata kuliah berhasil diperbarui');
      setEditingCourse(null);
      resetForm();
      setIsEditDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui mata kuliah');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete course
  const handleDeleteCourse = async (course: Course) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus "${course.name}"?`)) return;

    try {
      await deleteCourse({ id: course._id as any });
      toast.success('Mata kuliah berhasil dihapus');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus mata kuliah');
    }
  };

  // Open edit dialog
  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      sks: course.sks,
      lecturerIds: course.lecturerIds || [],
      semester: course.semester || 1,
      description: course.description || '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle seed courses
  const handleSeedCourses = async () => {
    setIsSeeding(true);
    try {
      const result = await seedCourses({});
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan mata kuliah');
    } finally {
      setIsSeeding(false);
    }
  };

  const isLoading = courses === undefined || lecturers === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Mata Kuliah</h1>
          <p className="text-muted-foreground">
            Kelola daftar mata kuliah dan tim dosen pengampu
          </p>
        </div>
        <div className="flex gap-2">
          {courses && courses.length === 0 && (
            <Button onClick={handleSeedCourses} variant="outline" disabled={isSeeding}>
              {isSeeding ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Tambah Default
            </Button>
          )}
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah MK
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari kode atau nama mata kuliah..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Course List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border p-4 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-5 w-32 bg-muted rounded" />
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
              <div className="h-4 w-48 bg-muted rounded mb-3" />
              <div className="flex gap-1">
                <div className="h-5 w-20 bg-muted rounded" />
                <div className="h-5 w-24 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-lg border p-8 text-center bg-card">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Tidak ada mata kuliah yang sesuai'
              : 'Belum ada mata kuliah. Tambahkan mata kuliah pertama.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Mata Kuliah
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <div
              key={course._id}
              className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {course.code}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                    >
                      {course.sks} SKS
                    </Badge>
                    {course.semester && (
                      <Badge variant="secondary" className="text-xs">
                        Sem {course.semester}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground mt-1">{course.name}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(course as Course)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCourse(course as Course)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Team Dosen Pengampu */}
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Tim Dosen Pengampu:
                </p>
                <div className="flex flex-wrap gap-1">
                  {course.lecturers && course.lecturers.length > 0 ? (
                    course.lecturers.filter((l) => l !== null).map((lecturer) => (
                      <Badge
                        key={lecturer._id}
                        variant="secondary"
                        className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      >
                        {lecturer.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Belum ada dosen pengampu
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      {(isAddDialogOpen || isEditDialogOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {isEditDialogOpen ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                  setEditingCourse(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Kode MK</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., TI101"
                  />
                </div>
                <div>
                  <Label htmlFor="sks">SKS</Label>
                  <select
                    id="sks"
                    value={formData.sks}
                    onChange={(e) => setFormData({ ...formData, sks: Number(e.target.value) })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value={1}>1 SKS</option>
                    <option value={2}>2 SKS</option>
                    <option value={3}>3 SKS</option>
                    <option value={4}>4 SKS</option>
                    <option value={6}>6 SKS</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="name">Nama Mata Kuliah</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Metode Statistik"
                />
              </div>

              <div>
                <Label htmlFor="semester">Semester (Opsional)</Label>
                <select
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={0}>Pilih Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Multi-select Dosen Pengampu */}
              <div>
                <Label>Tim Dosen Pengampu</Label>
                <Input
                  placeholder="Cari dosen..."
                  value={lecturerSearch}
                  onChange={(e) => setLecturerSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {filteredLecturers.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">
                      Tidak ada dosen
                    </p>
                  ) : (
                    <div className="divide-y">
                      {filteredLecturers.map((lecturer) => {
                        const isSelected = formData.lecturerIds.includes(lecturer._id);
                        return (
                          <button
                            key={lecturer._id}
                            type="button"
                            onClick={() => toggleLecturer(lecturer._id)}
                            className={cn(
                              'w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between',
                              isSelected && 'bg-emerald-50 dark:bg-emerald-950/30'
                            )}
                          >
                            <div>
                              <p className="font-medium text-foreground">{lecturer.name}</p>
                              <p className="text-xs text-muted-foreground">{lecturer.nip}</p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {formData.lecturerIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {formData.lecturerIds.length} dosen dipilih
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Deskripsi (Opsional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat mata kuliah"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                  setEditingCourse(null);
                }}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                onClick={isEditDialogOpen ? handleEditCourse : handleAddCourse}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Simpan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
