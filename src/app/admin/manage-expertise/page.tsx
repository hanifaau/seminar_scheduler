'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import {
  Search,
  Check,
  Loader2,
  Save,
  User,
  BookOpen,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

interface Lecturer {
  _id: string;
  name: string;
  nip: string;
  expertise: string[];
}

interface ExpertiseCategory {
  _id: string;
  name: string;
  description?: string;
}

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export default function ManageExpertisePage() {
  const [searchLecturer, setSearchLecturer] = React.useState('');
  const [searchExpertise, setSearchExpertise] = React.useState('');
  const [selectedLecturer, setSelectedLecturer] = React.useState<Lecturer | null>(null);
  const [selectedExpertise, setSelectedExpertise] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);
  const expertiseCategories = useQuery(api.expertise_categories.getAll);

  // Mutations
  const updateExpertise = useMutation(api.lecturers.updateExpertise);
  const seedCategories = useMutation(api.expertise_categories.seed);

  // Filter lecturers by search
  const filteredLecturers = React.useMemo(() => {
    if (!lecturers) return [];
    if (!searchLecturer) return lecturers;

    return lecturers.filter(
      (l) =>
        l.name.toLowerCase().includes(searchLecturer.toLowerCase()) ||
        l.nip.includes(searchLecturer)
    );
  }, [lecturers, searchLecturer]);

  // Filter expertise by search
  const filteredExpertise = React.useMemo(() => {
    if (!expertiseCategories) return [];
    if (!searchExpertise) return expertiseCategories;

    return expertiseCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchExpertise.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchExpertise.toLowerCase())
    );
  }, [expertiseCategories, searchExpertise]);

  // Handle lecturer selection
  const handleSelectLecturer = (lecturer: Lecturer) => {
    setSelectedLecturer(lecturer);
    setSelectedExpertise(lecturer.expertise || []);
    setSearchLecturer('');
  };

  // Toggle expertise selection
  const toggleExpertise = (expertiseName: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(expertiseName)
        ? prev.filter((e) => e !== expertiseName)
        : [...prev, expertiseName]
    );
  };

  // Select all expertise
  const selectAllExpertise = () => {
    if (!expertiseCategories) return;
    setSelectedExpertise(expertiseCategories.map((cat) => cat.name));
  };

  // Clear all expertise
  const clearAllExpertise = () => {
    setSelectedExpertise([]);
  };

  // Save expertise
  const handleSave = async () => {
    if (!selectedLecturer) {
      toast.error('Pilih dosen terlebih dahulu');
      return;
    }

    setIsSaving(true);
    try {
      await updateExpertise({
        id: selectedLecturer._id as any,
        expertise: selectedExpertise,
      });

      toast.success(`Kepakaran ${selectedLecturer.name} berhasil diperbarui`);
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui kepakaran');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed expertise categories
  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const result = await seedCategories({});
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan kategori');
    } finally {
      setIsSeeding(false);
    }
  };

  const isLoading = lecturers === undefined || expertiseCategories === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atur Kepakaran Dosen</h1>
          <p className="text-muted-foreground">
            Tetapkan bidang kepakaran untuk setiap dosen
          </p>
        </div>
        {expertiseCategories && expertiseCategories.length === 0 && (
          <Button onClick={handleSeed} disabled={isSeeding}>
            {isSeeding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menambahkan...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Tambah Kategori Default
              </>
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Lecturer Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5" />
                Pilih Dosen
              </h2>
              {selectedLecturer && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedLecturer(null);
                    setSelectedExpertise([]);
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Batal
                </Button>
              )}
            </div>

            {/* Selected Lecturer Info */}
            {selectedLecturer && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{selectedLecturer.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {selectedLecturer.nip}
                    </p>
                  </div>
                  <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Terpilih
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground mr-1">Kepakaran saat ini:</span>
                  {selectedLecturer.expertise.length > 0 ? (
                    selectedLecturer.expertise.map((exp, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs border-amber-300 text-amber-800 dark:border-amber-700 dark:text-amber-400"
                      >
                        {exp}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Belum ada</span>
                  )}
                </div>
              </div>
            )}

            {/* Search Lecturer */}
            {!selectedLecturer && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau NIP..."
                  value={searchLecturer}
                  onChange={(e) => setSearchLecturer(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {/* Lecturer List */}
            {!selectedLecturer && (
              <div className="rounded-lg border max-h-[400px] overflow-y-auto">
                {filteredLecturers.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {searchLecturer
                        ? 'Tidak ada dosen yang sesuai'
                        : 'Belum ada data dosen'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredLecturers.map((lecturer) => (
                      <button
                        key={lecturer._id}
                        onClick={() => handleSelectLecturer(lecturer as Lecturer)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{lecturer.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {lecturer.nip}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {lecturer.expertise.length > 0 ? (
                            <Badge
                              variant="success"
                              className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            >
                              {lecturer.expertise.length} kepakaran
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Belum ada
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Expertise Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Pilih Kepakaran
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllExpertise}
                  disabled={!selectedLecturer}
                >
                  Pilih Semua
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllExpertise}
                  disabled={!selectedLecturer}
                >
                  Hapus Semua
                </Button>
              </div>
            </div>

            {/* Search Expertise */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kepakaran..."
                value={searchExpertise}
                onChange={(e) => setSearchExpertise(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected Count */}
            {selectedLecturer && (
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  variant="success"
                  className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  {selectedExpertise.length} dipilih
                </Badge>
                <span className="text-muted-foreground">
                  dari {expertiseCategories?.length || 0} kategori
                </span>
              </div>
            )}

            {/* Expertise List */}
            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              {filteredExpertise.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    {searchExpertise
                      ? 'Tidak ada kategori yang sesuai'
                      : 'Belum ada kategori kepakaran'}
                  </p>
                  {!searchExpertise && expertiseCategories?.length === 0 && (
                    <Button onClick={handleSeed} disabled={isSeeding}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tambah Kategori Default
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredExpertise.map((category) => {
                    const isSelected = selectedExpertise.includes(category.name);
                    return (
                      <button
                        key={category._id}
                        onClick={() => selectedLecturer && toggleExpertise(category.name)}
                        disabled={!selectedLecturer}
                        className={cn(
                          'w-full p-3 text-left transition-colors flex items-center justify-between',
                          selectedLecturer
                            ? 'hover:bg-muted/50 cursor-pointer'
                            : 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                              isSelected
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 dark:border-gray-600'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{category.name}</p>
                            {category.description && (
                              <p className="text-xs text-muted-foreground">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Save Button */}
            {selectedLecturer && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedLecturer(null);
                    setSelectedExpertise([]);
                  }}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Simpan Kepakaran
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {selectedLecturer && selectedExpertise.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
          <h3 className="font-semibold text-foreground mb-2">Ringkasan Perubahan</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Kepakaran baru untuk <strong>{selectedLecturer.name}</strong>:
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedExpertise.map((exp, i) => (
              <Badge
                key={i}
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                {exp}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
