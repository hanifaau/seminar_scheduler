import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
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
    idPegawai: v.string(), // Employee ID
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
    .index('by_idPegawai', ['idPegawai'])
    .index('by_role', ['role']),

  // Courses table - stores course information (Master Mata Kuliah)
  courses: defineTable({
    code: v.string(), // e.g., "TI101"
    name: v.string(), // e.g., "Metode Statistik" (unique, used for CSV mapping)
    sks: v.number(), // Credit units: 2 or 3
    lecturerIds: v.array(v.id('lecturers')), // Array of lecturer IDs (Team Dosen Pengampu)
    semester: v.optional(v.number()), // e.g., 1-8
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_code', ['code'])
    .index('by_name', ['name'])
    .index('by_sks', ['sks']),

  // Teaching schedules table - stores teaching schedule entries
  teaching_schedules: defineTable({
    lecturerId: v.id('lecturers'),
    courseId: v.optional(v.id('courses')), // Reference to course
    day: v.string(), // e.g., "Senin", "Selasa", etc.
    shiftId: v.optional(v.string()), // e.g., "2sks-1", "3sks-2"
    startTime: v.string(), // e.g., "07:30"
    endTime: v.string(), // e.g., "09:10"
    activity: v.string(), // e.g., "Teaching", "Meeting", "Consultation"
    room: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_lecturer', ['lecturerId'])
    .index('by_lecturer_day', ['lecturerId', 'day'])
    .index('by_day', ['day'])
    .index('by_course', ['courseId'])
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
      v.literal('scheduled') // Sudah dijadwalkan
    ),
    scheduledDate: v.optional(v.string()), // Tanggal terjadwal (jika sudah)
    scheduledTime: v.optional(v.string()), // Waktu terjadwal (jika sudah) - deprecated, use startTime/endTime
    scheduledStartTime: v.optional(v.string()), // Waktu mulai (format HH:mm)
    scheduledEndTime: v.optional(v.string()), // Waktu selesai (format HH:mm)
    scheduledRoom: v.optional(v.string()), // Ruangan (jika sudah)
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_supervisor1', ['supervisor1Id'])
    .index('by_nim', ['nim']),
});
