import { action } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';

// Types for notification payload
interface NotificationPayload {
  lecturerName: string;
  lecturerRole: string; // "Pembimbing Utama", "Pembimbing Pendamping", "Penguji 1", "Penguji 2"
  studentName: string;
  nim: string;
  seminarType: string;
  date: string;
  time: string;
  room: string;
}

// Whapi.cloud API Configuration
// Add these environment variables in Convex Dashboard:
// - WHATSAPP_API_URL: https://gate.whapi.cloud
// - WHATSAPP_API_KEY: your_api_token

// Format date to Indonesian format
function formatDateIndonesian(dateString: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const date = new Date(dateString);
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${dayName}, ${day} ${month} ${year}`;
}

// Build WhatsApp message in Indonesian
function buildWhatsAppMessage(payload: NotificationPayload): string {
  const formattedDate = formatDateIndonesian(payload.date);

  return `Yth. Bapak/Ibu ${payload.lecturerName},

Anda dijadwalkan sebagai ${payload.lecturerRole} pada:

Seminar: ${payload.seminarType}
Mahasiswa: ${payload.studentName} / ${payload.nim}
Waktu: ${formattedDate}, ${payload.time}
Ruang: ${payload.room || 'Belum ditentukan'}

Mohon kehadiran Bapak/Ibu tepat waktu. Terima kasih.

---
Pesan ini dikirim otomatis oleh Sistem Penjadwalan Seminar TI Unand.`;
}

// Send WhatsApp notification to a single lecturer using Whapi.cloud API
export const sendWhatsAppNotification = action({
  args: {
    lecturerName: v.string(),
    lecturerRole: v.string(),
    lecturerPhone: v.optional(v.string()),
    studentName: v.string(),
    nim: v.string(),
    seminarType: v.string(),
    date: v.string(),
    time: v.string(),
    room: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    // Get WhatsApp API configuration from Convex environment variables
    // Set these in Convex Dashboard > Settings > Environment Variables
    const whatsappApiUrl = process.env.WHATSAPP_API_URL; // e.g., "https://gate.whapi.cloud"
    const whatsappApiKey = process.env.WHATSAPP_API_KEY; // your API token

    // Validate environment variables
    if (!whatsappApiUrl || !whatsappApiKey) {
      console.log('[WhatsApp] Environment variables not configured. Logging message instead.');
      console.log('[WhatsApp] Set WHATSAPP_API_URL and WHATSAPP_API_KEY in Convex Dashboard');
      const message = buildWhatsAppMessage({
        lecturerName: args.lecturerName,
        lecturerRole: args.lecturerRole,
        studentName: args.studentName,
        nim: args.nim,
        seminarType: args.seminarType,
        date: args.date,
        time: args.time,
        room: args.room || 'Belum ditentukan',
      });
      console.log('[WhatsApp] Message would be sent:', message);
      return {
        success: true,
        message: 'Notifikasi dicatat (API tidak dikonfigurasi)',
      };
    }

    // Validate phone number
    if (!args.lecturerPhone) {
      return {
        success: false,
        message: `Nomor telepon tidak tersedia untuk ${args.lecturerName}`,
      };
    }

    // Build the message
    const message = buildWhatsAppMessage({
      lecturerName: args.lecturerName,
      lecturerRole: args.lecturerRole,
      studentName: args.studentName,
      nim: args.nim,
      seminarType: args.seminarType,
      date: args.date,
      time: args.time,
      room: args.room || 'Belum ditentukan',
    });

    try {
      // Format phone number for Whapi.cloud
      // Remove non-digits, ensure it starts with country code
      let phone = args.lecturerPhone.replace(/\D/g, '');
      if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
      } else if (!phone.startsWith('62')) {
        phone = '62' + phone;
      }

      // Whapi.cloud API endpoint for sending text messages
      const endpoint = `${whatsappApiUrl}/messages/text`;

      console.log(`[WhatsApp] Sending to ${args.lecturerName} at ${phone}`);

      // Send to Whapi.cloud API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappApiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          body: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WhatsApp] API Error:', response.status, errorText);
        return {
          success: false,
          message: `Gagal mengirim ke ${args.lecturerName}: ${response.status}`,
        };
      }

      const responseData = await response.json();
      console.log('[WhatsApp] API Response:', JSON.stringify(responseData));
      console.log(`[WhatsApp] Successfully sent notification to ${args.lecturerName}`);

      return {
        success: true,
        message: `Berhasil mengirim ke ${args.lecturerName}`,
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending notification:', error);
      return {
        success: false,
        message: `Error mengirim ke ${args.lecturerName}: ${error.message}`,
      };
    }
  },
});

// Send notifications to all lecturers involved in a seminar
export const sendSeminarNotifications = action({
  args: {
    seminarRequestId: v.id('seminar_requests'),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    results: Array<{ lecturer: string; role: string; success: boolean; message: string }>;
  }> => {
    // Use public query from seminar_requests module
    const seminarRequest = await ctx.runQuery(api.seminar_requests.get, {
      id: args.seminarRequestId,
    });

    if (!seminarRequest) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    if (seminarRequest.status !== 'scheduled') {
      throw new Error('Seminar belum dijadwalkan');
    }

    // Get all lecturers involved using public queries
    const lecturers = [];

    // Pembimbing Utama (Supervisor 1)
    if (seminarRequest.supervisor1Id) {
      const supervisor1 = await ctx.runQuery(api.lecturers.get, {
        id: seminarRequest.supervisor1Id,
      });
      if (supervisor1) {
        lecturers.push({
          name: supervisor1.name,
          phone: supervisor1.phone,
          role: 'Pembimbing Utama',
        });
      }
    }

    // Pembimbing Pendamping (Supervisor 2)
    if (seminarRequest.supervisor2Id) {
      const supervisor2 = await ctx.runQuery(api.lecturers.get, {
        id: seminarRequest.supervisor2Id,
      });
      if (supervisor2) {
        lecturers.push({
          name: supervisor2.name,
          phone: supervisor2.phone,
          role: 'Pembimbing Pendamping',
        });
      }
    }

    // Penguji 1 (Examiner 1)
    if (seminarRequest.examiner1Id) {
      const examiner1 = await ctx.runQuery(api.lecturers.get, {
        id: seminarRequest.examiner1Id,
      });
      if (examiner1) {
        lecturers.push({
          name: examiner1.name,
          phone: examiner1.phone,
          role: 'Penguji 1',
        });
      }
    }

    // Penguji 2 (Examiner 2)
    if (seminarRequest.examiner2Id) {
      const examiner2 = await ctx.runQuery(api.lecturers.get, {
        id: seminarRequest.examiner2Id,
      });
      if (examiner2) {
        lecturers.push({
          name: examiner2.name,
          phone: examiner2.phone,
          role: 'Penguji 2',
        });
      }
    }

    // Format time range
    const timeRange = seminarRequest.scheduledStartTime && seminarRequest.scheduledEndTime
      ? `${seminarRequest.scheduledStartTime} - ${seminarRequest.scheduledEndTime} WIB`
      : seminarRequest.scheduledTime || 'Waktu belum ditentukan';

    // Seminar type mapping
    const seminarTypeMap: Record<string, string> = {
      Proposal: 'Seminar Proposal',
      Hasil: 'Seminar Hasil',
      Sidang: 'Sidang Skripsi',
    };

    const results: Array<{ lecturer: string; role: string; success: boolean; message: string }> = [];

    // Get WhatsApp API configuration from environment variables
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const apiConfigured = !!(whatsappApiUrl && whatsappApiKey);

    // Send notification to each lecturer
    for (const lecturer of lecturers) {
      if (!apiConfigured || !lecturer.phone) {
        // Log or skip if API not configured or no phone
        results.push({
          lecturer: lecturer.name,
          role: lecturer.role,
          success: !apiConfigured,
          message: !apiConfigured ? 'Notifikasi dicatat (API tidak dikonfigurasi)' : `Nomor telepon tidak tersedia untuk ${lecturer.name}`,
        });
        continue;
      }

      // Build message
      const message = buildWhatsAppMessage({
        lecturerName: lecturer.name,
        lecturerRole: lecturer.role,
        studentName: seminarRequest.studentName,
        nim: seminarRequest.nim,
        seminarType: seminarTypeMap[seminarRequest.type] || seminarRequest.type,
        date: seminarRequest.scheduledDate || '',
        time: timeRange,
        room: seminarRequest.scheduledRoom || 'Belum ditentukan',
      });

      try {
        // Format phone number
        let phone = lecturer.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) {
          phone = '62' + phone.substring(1);
        } else if (!phone.startsWith('62')) {
          phone = '62' + phone;
        }

        const endpoint = `${whatsappApiUrl}/messages/text`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${whatsappApiKey}`,
          },
          body: JSON.stringify({
            to: phone,
            body: message,
          }),
        });

        if (response.ok) {
          results.push({
            lecturer: lecturer.name,
            role: lecturer.role,
            success: true,
            message: `Berhasil mengirim ke ${lecturer.name}`,
          });
        } else {
          results.push({
            lecturer: lecturer.name,
            role: lecturer.role,
            success: false,
            message: `Gagal mengirim ke ${lecturer.name}: ${response.status}`,
          });
        }
      } catch (error: any) {
        results.push({
          lecturer: lecturer.name,
          role: lecturer.role,
          success: false,
          message: `Error mengirim ke ${lecturer.name}: ${error.message}`,
        });
      }
    }

    const allSuccess = results.every((r) => r.success);

    console.log(`[WhatsApp] Notification batch complete. Success: ${allSuccess}`);
    console.log('[WhatsApp] Results:', JSON.stringify(results, null, 2));

    return {
      success: allSuccess,
      results,
    };
  },
});
