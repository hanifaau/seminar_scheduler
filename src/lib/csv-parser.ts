import Papa from 'papaparse';
import { Id } from 'convex/_generated/dataModel';

export interface ParsedSchedule {
  nip: string;
  day: string;
  startTime: string;
  endTime: string;
  activity: string;
  room?: string;
  notes?: string;
}

export interface CSVRowData extends ParsedSchedule {
  _rowNumber: number;
  _isValid?: boolean;
  _lecturerId?: Id<'lecturers'>;
  _lecturerName?: string;
  _errors?: string[];
}

interface Lecturer {
  _id: string;
  name: string;
  nip: string;
  expertise: string[];
  status?: string;
}

const REQUIRED_COLUMNS = ['nip', 'day', 'starttime', 'endtime', 'activity'];

const COLUMN_MAPPINGS: Record<string, string> = {
  nip: 'nip',
  'nomor induk pegawai': 'nip',
  'no induk': 'nip',
  day: 'day',
  hari: 'day',
  starttime: 'startTime',
  'start time': 'startTime',
  'jam mulai': 'startTime',
  mulai: 'startTime',
  endtime: 'endTime',
  'end time': 'endTime',
  'jam selesai': 'endTime',
  selesai: 'endTime',
  activity: 'activity',
  aktivitas: 'activity',
  kegiatan: 'activity',
  room: 'room',
  ruang: 'room',
  ruangan: 'room',
  notes: 'notes',
  catatan: 'notes',
  keterangan: 'notes',
};

/**
 * Normalize column name to standard field name
 */
function normalizeColumnName(columnName: string): string {
  const normalized = columnName.toLowerCase().trim().replace(/[_\s]+/g, '');
  return COLUMN_MAPPINGS[normalized] || normalized;
}

/**
 * Parse CSV file and return structured data
 */
export async function parseCSV(file: File): Promise<ParsedSchedule[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => normalizeColumnName(header),
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors
            .map((e) => e.message)
            .join(', ');
          reject(new Error(`CSV parsing errors: ${errorMessages}`));
          return;
        }

        const data = results.data as Record<string, string>[];

        // Validate required columns
        if (data.length > 0) {
          const firstRow = data[0];
          const availableColumns = Object.keys(firstRow).map((c) =>
            c.toLowerCase()
          );

          const missingColumns = REQUIRED_COLUMNS.filter(
            (col) =>
              !availableColumns.some((ac) => ac.includes(col) || col.includes(ac))
          );

          if (missingColumns.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${missingColumns.join(', ')}`
              )
            );
            return;
          }
        }

        const schedules: ParsedSchedule[] = data
          .filter((row) => {
            // Filter out rows where all required fields are empty
            return (
              row.nip?.trim() ||
              row.day?.trim() ||
              row.startTime?.trim() ||
              row.endTime?.trim() ||
              row.activity?.trim()
            );
          })
          .map((row) => ({
            nip: row.nip?.trim() || '',
            day: row.day?.trim() || '',
            startTime: row.startTime?.trim() || '',
            endTime: row.endTime?.trim() || '',
            activity: row.activity?.trim() || '',
            room: row.room?.trim() || undefined,
            notes: row.notes?.trim() || undefined,
          }));

        resolve(schedules);
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Validate parsed schedule data against lecturers
 */
export function validateScheduleData(
  schedules: ParsedSchedule[],
  lecturers: Lecturer[]
): CSVRowData[] {
  // Create a map of NIP to lecturer for quick lookup
  const lecturerMap = new Map<string, Lecturer>();
  lecturers.forEach((lecturer) => {
    lecturerMap.set(lecturer.nip, lecturer);
  });

  const validDays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
    'senin',
    'selasa',
    'rabu',
    'kamis',
    'jumat',
    'sabtu',
    'minggu',
  ];

  return schedules.map((schedule, index) => {
    const errors: string[] = [];
    const rowNumber = index + 2; // +2 because row 1 is header

    // Validate NIP
    const lecturer = lecturerMap.get(schedule.nip);
    if (!schedule.nip) {
      errors.push('NIP is required');
    } else if (!lecturer) {
      errors.push(`NIP "${schedule.nip}" not found in lecturers`);
    }

    // Validate day
    if (!schedule.day) {
      errors.push('Day is required');
    } else {
      const dayLower = schedule.day.toLowerCase();
      if (!validDays.some((d) => dayLower.includes(d) || d.includes(dayLower))) {
        errors.push(`Invalid day: "${schedule.day}"`);
      }
    }

    // Validate start time
    if (!schedule.startTime) {
      errors.push('Start time is required');
    } else if (!isValidTime(schedule.startTime)) {
      errors.push(`Invalid start time format: "${schedule.startTime}"`);
    }

    // Validate end time
    if (!schedule.endTime) {
      errors.push('End time is required');
    } else if (!isValidTime(schedule.endTime)) {
      errors.push(`Invalid end time format: "${schedule.endTime}"`);
    }

    // Validate time order
    if (
      schedule.startTime &&
      schedule.endTime &&
      isValidTime(schedule.startTime) &&
      isValidTime(schedule.endTime)
    ) {
      if (compareTime(schedule.startTime, schedule.endTime) >= 0) {
        errors.push('End time must be after start time');
      }
    }

    // Validate activity
    if (!schedule.activity) {
      errors.push('Activity is required');
    }

    return {
      ...schedule,
      _rowNumber: rowNumber,
      _isValid: errors.length === 0,
      _lecturerId: lecturer?._id as Id<'lecturers'>,
      _lecturerName: lecturer?.name,
      _errors: errors.length > 0 ? errors : undefined,
    };
  });
}

/**
 * Check if time string is valid (HH:MM format)
 */
function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

/**
 * Compare two time strings
 * Returns negative if time1 < time2, 0 if equal, positive if time1 > time2
 */
function compareTime(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return h1 * 60 + m1 - (h2 * 60 + m2);
}

/**
 * Generate sample CSV content for download
 */
export function generateSampleCSV(): string {
  const headers = ['NIP', 'Day', 'StartTime', 'EndTime', 'Activity', 'Room', 'Notes'];
  const sampleData = [
    ['198001011990011001', 'Monday', '08:00', '10:00', 'Teaching Database Systems', 'Room 301', ''],
    ['198001011990011001', 'Wednesday', '13:00', '15:00', 'Consultation', 'Office', 'Student consultation'],
    ['198002021991022002', 'Tuesday', '09:00', '11:00', 'Teaching Machine Learning', 'Lab 2', ''],
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download sample CSV file
 */
export function downloadSampleCSV(): void {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'schedule_template.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
