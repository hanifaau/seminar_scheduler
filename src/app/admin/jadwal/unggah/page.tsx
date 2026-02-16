'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { ArrowLeft, Loader2, Upload, FileText, Download, Check, X, AlertTriangle, Info } from 'lucide-react';
import Link from 'next/link';
import Papa from 'papaparse';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

// New simplified CSV format interfaces
interface ParsedCourseRow {
  _rowNumber: number;
  hari: string;
  waktuMulai: string;
  waktuSelesai: string;
  mataKuliah: string;
  dosen1NIP: string;
  dosen2NIP: string;
  dosen3NIP: string;
  ruang: string;
  _isValid: boolean;
  _lecturers: Array<{ nip: string; name?: string; id?: string; isNew?: boolean }>;
  _errors: string[];
}

// Skeleton components
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-3 py-2"><Skeleton className="h-4 w-8" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-20" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-28" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-32" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-40" /></td>
      <td className="px-3 py-2"><Skeleton className="h-4 w-48" /></td>
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

// Generate CSV template with simplified format
function generateCourseScheduleTemplate(): string {
  const headers = ['Hari', 'Waktu', 'Mata Kuliah', 'Dosen 1 (NIP)', 'Dosen 2 (NIP)', 'Dosen 3 (NIP)', 'Ruang'];
  const sampleData = [
    ['Senin', '07:30 - 10:00', 'Perencanaan Produksi', '198501012010011001', '-', '-', 'TI-01'],
    ['Selasa', '10:00 - 12:30', 'Sistem Informasi Manajemen', '197805152005012001', '198203182010012001', '-', 'Lab Komputer 2'],
    ['Rabu', '13:00 - 15:30', 'Statistika Industri', '198712052015032001', '-', '-', 'Ruang 304'],
  ];
  const csvContent = [
    headers.join(','),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  return csvContent;
}

export default function UnggahJadwalPage() {
  const [parsedData, setParsedData] = React.useState<ParsedCourseRow[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadStatus, setUploadStatus] = React.useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [newLecturerNIPs, setNewLecturerNIPs] = React.useState<Set<string>>(new Set());

  // Queries
  const lecturers = useQuery(api.lecturers.getAll);

  // Mutations
  const importCourseSchedule = useMutation(api.teaching_schedules.importCourseSchedule);

  // Create NIP to lecturer map
  const lecturerMap = React.useMemo(() => {
    if (!lecturers) return new Map();
    const map = new Map<string, { id: string; name: string }>();
    lecturers.forEach((l) => {
      map.set(l.nip, { id: l._id, name: l.name });
    });
    return map;
  }, [lecturers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewLecturerNIPs(new Set());

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        const h = header.toLowerCase().trim().replace(/[_\s]+/g, '');
        if (h.includes('hari') || h.includes('day')) return 'hari';
        if (h.includes('waktu') || h.includes('time')) return 'waktu';
        if (h.includes('mata') || h.includes('kuliah') || h.includes('course') || h.includes('matkul')) return 'matakuliah';
        if (h.includes('dosen1') || h === 'dosen1(nip)' || h === 'dosen1') return 'dosen1';
        if (h.includes('dosen2') || h === 'dosen2(nip)' || h === 'dosen2') return 'dosen2';
        if (h.includes('dosen3') || h === 'dosen3(nip)' || h === 'dosen3') return 'dosen3';
        if (h.includes('ruang') || h.includes('room')) return 'ruang';
        return h;
      },
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        const validated: ParsedCourseRow[] = [];
        const newNIPs = new Set<string>();

        data
          .filter((row) => row.hari || row.waktu || row.matakuliah)
          .forEach((row, index) => {
            const errors: string[] = [];
            const rowNumber = index + 2;
            const lecturersFound: ParsedCourseRow['_lecturers'] = [];

            // Validate Hari
            if (!row.hari?.trim()) {
              errors.push('Hari wajib diisi');
            } else if (!VALID_DAYS.includes(row.hari.toLowerCase().trim())) {
              errors.push(`Hari "${row.hari}" tidak valid`);
            }

            // Validate Waktu (parse range)
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

            // Validate Mata Kuliah
            if (!row.matakuliah?.trim()) {
              errors.push('Mata kuliah wajib diisi');
            }

            // Process Dosen 1, 2, 3
            const dosenNIPs = [
              { nip: row.dosen1?.trim(), label: 'Dosen 1' },
              { nip: row.dosen2?.trim(), label: 'Dosen 2' },
              { nip: row.dosen3?.trim(), label: 'Dosen 3' },
            ];

            let hasAtLeastOneLecturer = false;
            dosenNIPs.forEach(({ nip, label }) => {
              if (nip && nip !== '-' && nip !== '') {
                hasAtLeastOneLecturer = true;
                const existingLecturer = lecturerMap.get(nip);
                if (existingLecturer) {
                  lecturersFound.push({
                    nip,
                    name: existingLecturer.name,
                    id: existingLecturer.id,
                    isNew: false,
                  });
                } else {
                  // Mark as new lecturer to be created
                  lecturersFound.push({
                    nip,
                    name: `Dosen ${nip}`,
                    isNew: true,
                  });
                  newNIPs.add(nip);
                }
              }
            });

            if (!hasAtLeastOneLecturer) {
              errors.push('Minimal satu dosen (NIP) harus diisi');
            }

            validated.push({
              _rowNumber: rowNumber,
              hari: row.hari?.trim() || '',
              waktuMulai,
              waktuSelesai,
              mataKuliah: row.matakuliah?.trim() || '',
              dosen1NIP: dosenNIPs[0].nip || '',
              dosen2NIP: dosenNIPs[1].nip || '',
              dosen3NIP: dosenNIPs[2].nip || '',
              ruang: row.ruang?.trim() || '',
              _isValid: errors.length === 0,
              _lecturers: lecturersFound,
              _errors: errors.length > 0 ? errors : undefined,
            });
          });

        setNewLecturerNIPs(newNIPs);
        setParsedData(validated);
        setUploadStatus({ type: null, message: '' });
      },
      error: (error) => {
        setUploadStatus({
          type: 'error',
          message: `Gagal membaca file CSV: ${error.message}`,
        });
      },
    });
  };

  const handleConfirmUpload = async () => {
    const validRows = parsedData.filter((row) => row._isValid);

    if (validRows.length === 0) {
      setUploadStatus({ type: 'error', message: 'Tidak ada data valid untuk diunggah' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      // Prepare data for import
      const schedulesToImport = validRows.map((row) => ({
        day: row.hari,
        startTime: row.waktuMulai,
        endTime: row.waktuSelesai,
        courseName: row.mataKuliah,
        room: row.ruang,
        lecturerNIPs: row._lecturers.map((l) => l.nip),
      }));

      const result = await importCourseSchedule({ schedules: schedulesToImport });

      setUploadStatus({
        type: 'success',
        message: `Berhasil mengimpor ${result.schedulesCreated} jadwal, ${result.lecturersCreated} dosen baru dibuat`,
      });
      setParsedData([]);
      setNewLecturerNIPs(new Set());
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal mengunggah jadwal',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateCourseScheduleTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_jadwal_kuliah.csv';
    link.click();
  };

  const validRows = parsedData.filter((row) => row._isValid);
  const invalidRows = parsedData.filter((row) => !row._isValid);
  const isLoading = lecturers === undefined;

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
            Import jadwal kuliah dari file CSV (format sederhana)
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
      {!isLoading && parsedData.length === 0 && (
        <>
          {/* Instructions */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">Format CSV yang Diharapkan:</p>
                <div className="bg-background rounded p-3 font-mono text-xs overflow-x-auto">
                  <p className="text-muted-foreground"># Kolom: Hari, Waktu, Mata Kuliah, Dosen 1 (NIP), Dosen 2 (NIP), Dosen 3 (NIP), Ruang</p>
                  <p className="text-muted-foreground"># Contoh: Senin, "07:30 - 10:00", "Perencanaan Produksi", "198501012010011001", "-", "-", "TI-01"</p>
                </div>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Pastikan format waktu adalah HH:mm - HH:mm</strong> (contoh: 07:30 - 10:00)</li>
                  <li>Gunakan tanda <code className="bg-muted px-1 rounded">-</code> untuk dosen yang kosong</li>
                  <li>NIP yang belum terdaftar akan dibuat otomatis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Upload Area with Buttons */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground mb-2">
              Seret file CSV ke sini atau klik untuk memilih
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Format: <strong>Hari, Waktu, Mata Kuliah, Dosen 1-3 (NIP), Ruang</strong>
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
                <Button className="cursor-pointer" asChild>
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Pilih File CSV
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {/* Status Message */}
          {uploadStatus.type && (
            <div
              className={cn(
                'p-4 rounded-lg',
                uploadStatus.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
              )}
            >
              {uploadStatus.message}
            </div>
          )}
        </>
      )}

      {/* CSV Preview */}
      {parsedData.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-medium text-foreground">{validRows.length} data valid</span>
            </div>
            {invalidRows.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-medium text-foreground">{invalidRows.length} data tidak valid</span>
              </div>
            )}
            {newLecturerNIPs.size > 0 && (
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-foreground">{newLecturerNIPs.size} dosen baru akan dibuat</span>
              </div>
            )}
          </div>

          {/* New Lecturers Warning */}
          {newLecturerNIPs.size > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Dosen Baru Akan Dibuat Otomatis:
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(newLecturerNIPs).map((nip) => (
                  <Badge key={nip} variant="outline" className="text-blue-700 dark:text-blue-300">
                    {nip}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Nama dosen akan menggunakan placeholder. Silakan update nama dosen setelah import.
              </p>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-foreground">#</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Hari</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Waktu</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Mata Kuliah</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Dosen</th>
                    <th className="px-3 py-2 text-left font-medium text-foreground">Ruang</th>
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
                      <td className="px-3 py-2">{row.hari}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.waktuMulai} - {row.waktuSelesai}
                      </td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={row.mataKuliah}>
                        {row.mataKuliah}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row._lecturers.map((lecturer, idx) => (
                            <Badge
                              key={idx}
                              variant={lecturer.isNew ? 'info' : 'secondary'}
                              className="text-[10px]"
                            >
                              {lecturer.isNew ? `${lecturer.nip} (baru)` : lecturer.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">{row.ruang || '-'}</td>
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
            <Button variant="outline" onClick={() => {
              setParsedData([]);
              setNewLecturerNIPs(new Set());
            }} disabled={isUploading}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={isUploading || validRows.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                `Impor ${validRows.length} Data Valid`
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Status Message (after upload) */}
      {parsedData.length === 0 && uploadStatus.type && (
        <div
          className={cn(
            'p-4 rounded-lg',
            uploadStatus.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
          )}
        >
          {uploadStatus.message}
        </div>
      )}
    </div>
  );
}
