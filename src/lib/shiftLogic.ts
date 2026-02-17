// Shift Rules Logic for TI Unand Manual Scheduling
// Strict departmental rules for 2 SKS and 3 SKS courses

export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat';

export interface Shift {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  sks: 2 | 3;
  hiddenOnFriday?: boolean;
}

// SISTEM 2 SKS
const SHIFTS_2_SKS: Omit<Shift, 'sks'>[] = [
  { id: '2sks-1', label: 'Shift 1', startTime: '07:30', endTime: '09:10' },
  { id: '2sks-2', label: 'Shift 2', startTime: '09:20', endTime: '11:00' },
  { id: '2sks-3', label: 'Shift 3', startTime: '11:10', endTime: '12:50', hiddenOnFriday: true },
  { id: '2sks-4', label: 'Shift 4', startTime: '13:30', endTime: '15:10' },
  { id: '2sks-5', label: 'Shift 5', startTime: '16:00', endTime: '17:40' },
];

// SISTEM 3 SKS
const SHIFTS_3_SKS: Omit<Shift, 'sks'>[] = [
  { id: '3sks-1', label: 'Shift 1', startTime: '07:30', endTime: '10:00' },
  { id: '3sks-2', label: 'Shift 2', startTime: '10:10', endTime: '12:40', hiddenOnFriday: true },
  { id: '3sks-3', label: 'Shift 3', startTime: '13:30', endTime: '16:00' },
  { id: '3sks-4', label: 'Shift Sore 2 SKS', startTime: '16:00', endTime: '17:40' },
];

/**
 * Get available shifts based on SKS and day
 * @param sks - Credit units (2 or 3)
 * @param day - Day of the week
 * @returns Array of available shifts
 */
export function getAvailableShifts(sks: 2 | 3, day: DayOfWeek): Shift[] {
  const shifts = sks === 2 ? SHIFTS_2_SKS : SHIFTS_3_SKS;
  const isFriday = day === 'Jumat';

  return shifts
    .filter((shift) => !isFriday || !shift.hiddenOnFriday)
    .map((shift) => ({
      ...shift,
      sks,
    }));
}

/**
 * Get shift details by ID
 * @param shiftId - The shift identifier
 * @returns Shift details or undefined if not found
 */
export function getShiftById(shiftId: string): Shift | undefined {
  const allShifts = [
    ...SHIFTS_2_SKS.map((s) => ({ ...s, sks: 2 as const })),
    ...SHIFTS_3_SKS.map((s) => ({ ...s, sks: 3 as const })),
  ];

  return allShifts.find((s) => s.id === shiftId);
}

/**
 * Get formatted shift label with time
 * @param shiftId - The shift identifier
 * @returns Formatted label or the shiftId if not found
 */
export function getFormattedShiftLabel(shiftId: string): string {
  const shift = getShiftById(shiftId);
  if (!shift) return shiftId;

  return `${shift.label} (${shift.startTime} - ${shift.endTime})`;
}

/**
 * Check if two time ranges overlap
 * @param start1 - Start time of first range (HH:mm)
 * @param end1 - End time of first range (HH:mm)
 * @param start2 - Start time of second range (HH:mm)
 * @param end2 - End time of second range (HH:mm)
 * @returns True if ranges overlap
 */
export function doTimeRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // Overlap if one range starts before the other ends
  return s1 < e2 && s2 < e1;
}

/**
 * Validate shift availability for a lecturer
 * @param existingSchedules - Existing schedules for the lecturer
 * @param day - Day to check
 * @param startTime - Start time of new schedule
 * @param endTime - End time of new schedule
 * @returns Object with validation result and conflict message
 */
export function validateLecturerAvailability(
  existingSchedules: Array<{ day: string; startTime: string; endTime: string; activity: string }>,
  day: string,
  startTime: string,
  endTime: string
): { valid: boolean; conflict?: string } {
  const daySchedules = existingSchedules.filter((s) => s.day === day);

  for (const schedule of daySchedules) {
    if (doTimeRangesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
      return {
        valid: false,
        conflict: `Bentrok dengan jadwal "${schedule.activity}" (${schedule.startTime} - ${schedule.endTime})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate room availability
 * @param existingSchedules - Existing schedules for the room
 * @param day - Day to check
 * @param startTime - Start time of new schedule
 * @param endTime - End time of new schedule
 * @returns Object with validation result and conflict message
 */
export function validateRoomAvailability(
  existingSchedules: Array<{ day: string; startTime: string; endTime: string; room: string }>,
  day: string,
  room: string,
  startTime: string,
  endTime: string
): { valid: boolean; conflict?: string } {
  const roomSchedules = existingSchedules.filter(
    (s) => s.day === day && s.room?.toLowerCase() === room.toLowerCase()
  );

  for (const schedule of roomSchedules) {
    if (doTimeRangesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
      return {
        valid: false,
        conflict: `Ruangan ${room} sudah digunakan pada jam ${schedule.startTime} - ${schedule.endTime}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Days of the week for scheduling
 */
export const DAYS_OF_WEEK: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

/**
 * Common rooms list
 */
export const COMMON_ROOMS = [
  'Lab. Komputer 1',
  'Lab. Komputer 2',
  'Lab. Komputer 3',
  'Ruang Rapat 1',
  'Ruang Rapat 2',
  'Ruang Sidang',
  'Ruang Kelas A',
  'Ruang Kelas B',
  'Ruang Kelas C',
  'Aula',
];
