import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Settings table - stores global configuration like academic calendar
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  // Rooms table - stores available rooms for seminars and classes
  rooms: defineTable({
    name: v.string(), // e.g., "Ruang Seminar Lt.1"
    capacity: v.optional(v.number()),
    location: v.optional(v.string()),
    status: v.optional(v.string()), // e.g., "active", "maintenance"
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_name', ['name'])
    .index('by_status', ['status']),

  // Lecturers table - stores lecturer information
  lecturers: defineTable({
    name: v.string(),
    nip: v.string(), // NIP is the Indonesian employee identification number
    phone: v.optional(v.string()), // Phone number for WhatsApp notifications
    expertise: v.array(v.string()), // Array of expertise areas
    status: v.optional(v.string()), // e.g., "active", "on leave", "inactive"
    activeReturnDate: v.optional(v.string()), // Tanggal kembali aktif setelah cuti (YYYY-MM-DD)
    role: v.optional(v.union(
      v.literal('dosen'),      // Regular lecturer
      v.literal('kaprodi'),    // Head of Department
      v.literal('sekprodi')    // Secretary of Department
    )),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_nip', ['nip'])
    .index('by_role', ['role']),

  // Staff table - stores administrative staff information
  staff: defineTable({
    name: v.string(),
    nip: v.optional(v.string()), // NIP (optional for non-civil servant)
    role: v.union(
      v.literal('admin_akademik'),  // Academic Admin
      v.literal('sekprodi'),        // Secretary of Department
      v.literal('kaprodi'),         // Head of Department
      v.literal('admin')            // General Admin
    ),
    status: v.optional(v.string()), // e.g., "active", "inactive"
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_nip', ['nip'])
    .index('by_role', ['role']),

  // Schedule Groups table - stores grouped teaching schedules (Reguler, UTS, UAS, etc.)
  schedule_groups: defineTable({
    name: v.string(), // e.g., "Jadwal Reguler Genap 24/25"
    type: v.string(), // e.g., "reguler", "uts", "uas", "libur"
    isActive: v.boolean(), // Is this schedule currently active?
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_active', ['isActive'])
    .index('by_type', ['type']),

  // Legacy Courses table - retained in schema to prevent strict validation deployment errors
  courses: defineTable({
    code: v.optional(v.any()), // e.g., "TII311"
    name: v.optional(v.any()), // e.g., "Simulasi Sistem"
    sks: v.optional(v.any()),
    semester: v.optional(v.any()),
    category: v.optional(v.any()), // e.g., "Wajib", "Pilihan"
    createdAt: v.optional(v.any()),
    updatedAt: v.optional(v.any()),
    lecturerIds: v.optional(v.any()), // residual field
  })
    .index('by_code', ['code'])
    .index('by_name', ['name']),

  // Teaching schedules table - stores teaching schedule entries
  teaching_schedules: defineTable({
    lecturerId: v.id('lecturers'),
    groupId: v.optional(v.id('schedule_groups')), // Reference to schedule group
    courseId: v.optional(v.any()), // Legacy field: retained as optional to prevent validation errors on old data
    day: v.string(), // e.g., "Senin", "Selasa", etc.
    date: v.optional(v.string()), // Specific date for one-off schedules like UTS/UAS, e.g., "2026-04-06"
    shiftId: v.optional(v.string()), // e.g., "2sks-1", "3sks-2"
    startTime: v.string(), // e.g., "07:30"
    endTime: v.string(), // e.g., "09:10"
    activity: v.string(), // e.g., "Teaching", "Meeting", "Consultation"
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
    
    // New fields for advanced scheduling
    weekType: v.optional(v.union(v.literal('ganjil'), v.literal('genap'), v.literal('rutin'))),
    teachingPeriod: v.optional(v.union(v.literal('sebelum_uts'), v.literal('setelah_uts'), v.literal('full'))),
    isTeamTeaching: v.optional(v.boolean()),
    
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_lecturer', ['lecturerId'])
    .index('by_lecturer_day', ['lecturerId', 'day'])
    .index('by_day', ['day'])
    .index('by_group', ['groupId'])
    .index('by_room_day', ['room', 'day']),

  // Expertise categories table - stores predefined expertise areas
  expertise_categories: defineTable({
    name: v.string(), // e.g., "Manajemen Produksi", "Ergonomi"
    description: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_name', ['name']),

  // Seminar requests table - stores student seminar requests
  seminar_requests: defineTable({
    studentName: v.string(), // Nama mahasiswa
    nim: v.string(), // NIM mahasiswa
    title: v.string(), // Judul seminar/skripsi
    type: v.union(
      v.literal('Proposal'),
      v.literal('Hasil'),
      v.literal('Sidang')
    ),
    supervisor1Id: v.id('lecturers'), // Pembimbing Utama (wajib)
    supervisor2Id: v.optional(v.id('lecturers')), // Pembimbing Pendamping (opsional)
    examiner1Id: v.optional(v.id('lecturers')), // Penguji 1
    examiner2Id: v.optional(v.id('lecturers')), // Penguji 2
    status: v.union(
      v.literal('requested'), // Menunggu alokasi penguji
      v.literal('allocated'), // Sudah ada penguji, siap dijadwalkan
      v.literal('waiting_confirmation'), // Menunggu konfirmasi
      v.literal('scheduled'), // Sudah dijadwalkan
      v.literal('completed') // Selesai
    ),
    scheduledDate: v.optional(v.string()), // Tanggal terjadwal (jika sudah)
    scheduledTime: v.optional(v.string()), // Waktu terjadwal (jika sudah) - deprecated, use startTime/endTime
    scheduledStartTime: v.optional(v.string()), // Waktu mulai (format HH:mm)
    scheduledEndTime: v.optional(v.string()), // Waktu selesai (format HH:mm)
    scheduledRoom: v.optional(v.string()), // Ruangan (jika sudah)
    revisionCount: v.optional(v.number()), // Jumlah revisi jadwal
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_supervisor1', ['supervisor1Id'])
    .index('by_nim', ['nim']),
});
