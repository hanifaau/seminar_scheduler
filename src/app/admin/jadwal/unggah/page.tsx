'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { ArrowLeft, Loader2, Upload, FileText, Download, Check, X, AlertTriangle, Info, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

// Minimalist CSV format: Mata Kuliah, Dosen, Hari, Waktu, Ruang
interface ParsedScheduleRow {
  _rowNumber: number;
  mataKuliah: string;
  dosen: string;
  hari: string;
  waktu: string;
  waktuMulai: string;
  waktuSelesai: string;
  ruangan: string;
  _isValid: boolean;
  _courseFound: boolean;
  _lecturerCount: number;
  _errors: string[];
}

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-3 py-2"><Skeleton className="h-4 w-8" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-40" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-28" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-24" /></td>
      <td className="px-3 py-2"><Skeleton className="h-6 w-16" /></td>
    </tr>
  );
}

const VALID_DAYS = [
  'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

function isValidTime(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
}

// Parse time range like "07:30 - 10:00" or "07:30-10:00"
function parseTimeRange(waktu: string): { start: string; end: string } | null {
  const cleaned = waktu.replace(/\s+/g, '');
  const match = cleaned.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
  if (match) {
    const start = match[1].padStart(5, '0');
    const end = match[2].padStart(5, '0');
    if (isValidTime(start) && isValidTime(end)) {
      return { start, end };
    }
  }
  return null;
}

// Generate CSV template with MINIMALIST format
function generateMinimalistTemplate(): string {
  const headers = ['Mata Kuliah', 'Dosen', 'Hari', 'Waktu', 'Ruang'];
  const sampleData = [
    ['Perencanaan dan Pengendalian Produksi', 'Jonrinaldi', 'Senin', '07:30 - 10:00', 'Lab. Komputer 1'],
    ['Metode Statistik', 'Hanifa', 'Selasa', '10:10 - 12:40', 'Ruang Kelas A'],
    ['Kalkulus II', 'Aulia', 'Rabu', '13:30 - 16:00', 'Lab. Ergonomi'],
  ];
  const csvContent = [
    headers.join(','),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  return csvContent;
}

export default function UnggahJadwalPage() {
  const [parsedData, setParsedData] = React.useState<ParsedScheduleRow[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    slotsImported: number;
    lecturersLinked: number;
    coursesNotFound: string[];
    lecturersNotFound?: string[];
    message: string;
  } | null>(null);

  // Queries
  const courses = useQuery(api.courses.getAll);

  // Mutations
  const importFromMinimalistCSV = useMutation(api.teaching_schedules.importFromMinimalistCSV);

  // Create course name lookup
  const courseLookup = React.useMemo(() => {
    if (!courses) return new Map();
    const map = new Map<string, { id: string; name: string; lecturerCount: number }>();
    courses.forEach((c) => {
      map.set(c.name.toLowerCase().trim(), {
        id: c._id,
        name: c.name,
        lecturerCount: c.lecturerIds?.length || 0,
      });
    });
    return map;
  }, [courses]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const h = header.toLowerCase().trim().replace(/[_\s]+/g, '');
        if (h.includes('hari') || h.includes('day')) return 'hari';
        if (h.includes('waktu') || h.includes('time') || h.includes('jam')) return 'waktu';
        if (h.includes('mata') || h.includes('kuliah') || h.includes('course') || h.includes('matkul')) return 'matakuliah';
        if (h.includes('ruang') || h.includes('room') || h.includes('ruangan')) return 'ruangan';
        if (h.includes('dosen') || h.includes('pengajar') || h.includes('lecturer')) return 'dosen';
        return h;
      },
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const validated: ParsedScheduleRow[] = [];
        const coursesNotFoundSet = new Set<string>();

        data
          .filter((row) => row.hari || row.waktu || row.matakuliah)
          .forEach((row, index) => {
            const errors: string[] = [];
            const rowNumber = index + 2;

            // Validate Hari
            if (!row.hari?.trim()) {
              errors.push('Hari wajib diisi');
            } else if (!VALID_DAYS.includes(row.hari.toLowerCase().trim())) {
              errors.push(`Hari "${row.hari}" tidak valid`);
            }

            // Validate Waktu
            let waktuMulai = '';
            let waktuSelesai = '';
            if (!row.waktu?.trim()) {
              errors.push('Waktu wajib diisi');
            } else {
              const parsed = parseTimeRange(row.waktu.trim());
              if (!parsed) {
                errors.push(`Format waktu tidak valid. Gunakan format: HH:mm - HH:mm`);
              } else {
                waktuMulai = parsed.start;
                waktuSelesai = parsed.end;
              }
            }

            // Validate Dosen
            if (!row.dosen?.trim()) {
              errors.push('Dosen wajib diisi');
            }

            // Validate Mata Kuliah
            let courseFound = false;
            let lecturerCount = 0;
            if (!row.matakuliah?.trim()) {
              errors.push('Mata kuliah wajib diisi');
            } else {
              const course = courseLookup.get(row.matakuliah.trim().toLowerCase());
              if (course) {
                courseFound = true;
                lecturerCount = course.lecturerCount;
                if (lecturerCount === 0) {
                  errors.push('Mata kuliah belum memiliki dosen pengampu');
                }
              } else {
                coursesNotFoundSet.add(row.matakuliah.trim());
                errors.push(`Mata kuliah "${row.matakuliah}" tidak ditemukan di Master`);
              }
            }

            validated.push({
              _rowNumber: rowNumber,
              mataKuliah: row.matakuliah?.trim() || '',
              dosen: row.dosen?.trim() || '',
              hari: row.hari?.trim() || '',
              waktu: row.waktu?.trim() || '',
              waktuMulai,
              waktuSelesai,
              ruangan: row.ruangan?.trim() || '',
              _isValid: errors.length === 0,
              _courseFound: courseFound,
              _lecturerCount: lecturerCount,
              _errors: errors.length > 0 ? errors : [],
            });
          });

        setParsedData(validated);
      },
      error: (error) => {
        toast.error(`Gagal membaca file CSV: ${error.message}`);
      },
    });
  };

  const handleConfirmUpload = async () => {
    const validRows = parsedData.filter((row) => row._isValid);

    if (validRows.length === 0) {
      toast.error('Tidak ada data valid untuk diunggah');
      return;
    }

    setIsUploading(true);

    try {
      // Prepare data for import
      const schedulesToImport = validRows.map((row) => ({
        day: row.hari,
        time: row.waktu,
        courseName: row.mataKuliah,
        room: row.ruangan,
        lecturerNames: row.dosen || undefined,
      }));

      const result = await importFromMinimalistCSV({ schedules: schedulesToImport });

      setUploadResult({
        slotsImported: result.slotsImported,
        lecturersLinked: result.lecturersLinked,
        coursesNotFound: result.coursesNotFound,
        message: result.message,
      });

      toast.success(result.message);
      setParsedData([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengunggah jadwal');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateMinimalistTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_jadwal_minimalis.csv';
    link.click();
  };

  const validRows = parsedData.filter((row) => row._isValid);
  const invalidRows = parsedData.filter((row) => !row._isValid);
  const isLoading = courses === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unggah Jadwal Kuliah</h1>
          <p className="text-muted-foreground">
            Import jadwal kuliah dari CSV dengan auto-mapping ke Master Mata Kuliah
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Upload Form */}
      {!isLoading && parsedData.length === 0 && !uploadResult && (
        <>
          {/* Instructions */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-3 text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-300">
                  Format CSV Minimalis (Auto-Mapping)
                </p>
                <div className="bg-background rounded p-3 font-mono text-xs overflow-x-auto border">
                  <p className="text-muted-foreground"># Kolom: Mata Kuliah, Dosen, Hari, Waktu, Ruang</p>
                  <p className="text-muted-foreground"># Contoh: "Kalkulus II", "Hanifa", Senin, "07:30 - 10:00", "Ruang A"</p>
                </div>
                <div className="space-y-2 text-emerald-700 dark:text-emerald-400">
                  <p className="font-medium flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Cara Kerja Auto-Mapping:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Sistem mencari mata kuliah berdasarkan <strong>nama yang sama persis</strong></li>
                    <li>Kolom <strong>Dosen wajib diisi</strong>. Gunakan nama pendek seperti <em>Hanifa</em>, bukan gelar lengkap.</li>
                    <li>Jika kolom <strong>Dosen diisi</strong>, sistem akan mencari kecocokan nama dosen di Master Dosen dan hanya assign ke dosen tersebut (berguna untuk kelas paralel).</li>
                    <li>Untuk lebih dari satu dosen, pisahkan nama dengan koma.</li>
                  </ol>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 p-2 rounded text-xs font-medium border border-amber-200 dark:border-amber-800">
                  Important: Pastikan Nama Mata Kuliah di CSV <strong>sama persis</strong> dengan yang ada di Master Mata Kuliah, dan kolom <strong>Dosen wajib diisi</strong>.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Link to Master Courses */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium text-foreground">Master Mata Kuliah</p>
              <p className="text-xs text-muted-foreground">
                Pastikan mata kuliah dan dosen pengampu sudah diatur sebelum import
              </p>
            </div>
            <Link href="/admin/courses">
              <Button variant="outline" size="sm">
                Kelola Master MK
              </Button>
            </Link>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground mb-2">
              Seret file CSV ke sini atau klik untuk memilih
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Format: <strong>Mata Kuliah, Dosen, Hari, Waktu, Ruang</strong>. Kolom <strong>Dosen wajib diisi</strong>.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="schedule-csv-upload"
              disabled={isUploading}
            />

            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Unduh Template CSV
              </Button>
              <label htmlFor="schedule-csv-upload">
                <Button className="cursor-pointer bg-emerald-600 hover:bg-emerald-700" asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Pilih File CSV
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </>
      )}

      {/* CSV Preview */}
      {parsedData.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-foreground">{validRows.length} data valid</span>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium text-foreground">{invalidRows.length} data tidak valid</span>
              </div>
            )}
            {validRows.length > 0 && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-foreground">
                  Akan diproses {validRows.length} baris jadwal
                </span>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Mata Kuliah</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Hari</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Waktu</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Ruang</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Dosen</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row) => (
                    <tr
                      key={row._rowNumber}
                      className={cn(
                        'border-t',
                        row._isValid ? 'bg-background' : 'bg-red-50 dark:bg-red-900/10'
                      )}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row._rowNumber}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={row.mataKuliah}>
                        {row.mataKuliah}
                      </td>
                      <td className="px-3 py-2">{row.hari}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.waktuMulai} - {row.waktuSelesai}
                      </td>
                      <td className="px-3 py-2">{row.ruangan || '-'}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate" title={row.dosen}>
                        {row.dosen || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row._isValid ? (
                          <Badge variant="success" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            <X className="h-3 w-3 mr-1" />
                            Invalid
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Error Details */}
          {invalidRows.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                Data dengan error akan dilewati:
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto">
                {invalidRows.map((row) => (
                  <li key={row._rowNumber}>
                    Baris {row._rowNumber}: {row._errors?.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setParsedData([])}
              disabled={isUploading}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isUploading || validRows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                `Impor ${validRows.length} Slot`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Import Berhasil!</h3>
                <p className="text-sm text-muted-foreground">{uploadResult.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background rounded p-3">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {uploadResult.slotsImported}
                </p>
                <p className="text-xs text-muted-foreground">Slot berhasil diimpor</p>
              </div>
              <div className="bg-background rounded p-3">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {uploadResult.lecturersLinked}
                </p>
                <p className="text-xs text-muted-foreground">Jadwal dosen dibuat</p>
              </div>
            </div>

            {uploadResult.coursesNotFound.length > 0 && (
              <div className="mt-4 p-3 rounded bg-amber-100 dark:bg-amber-900/30">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Mata kuliah tidak ditemukan (dilewati):
                </p>
                <div className="flex flex-wrap gap-1">
                  {uploadResult.coursesNotFound.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {uploadResult.lecturersNotFound && uploadResult.lecturersNotFound.length > 0 && (
              <div className="mt-4 p-3 rounded bg-amber-100 dark:bg-amber-900/30">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Nama dosen tidak ditemukan:
                </p>
                <div className="flex flex-wrap gap-1">
                  {uploadResult.lecturersNotFound.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setUploadResult(null)}>
              Upload Lagi
            </Button>
            <Link href="/admin/courses">
              <Button>Lihat Master MK</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
