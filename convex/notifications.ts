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

// Twilio API Configuration
// Add these environment variables in Convex Dashboard:
// - TWILIO_ACCOUNT_SID: your_account_sid
// - TWILIO_AUTH_TOKEN: your_auth_token
// - TWILIO_WHATSAPP_NUMBER: your_twilio_whatsapp_number (e.g. +14155238886)

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

// Helper to send Twilio message
async function sendTwilioMessage(toPhone: string, messageBody: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, atau TWILIO_WHATSAPP_NUMBER belum diatur di Convex Dashboard');
  }

  // Format phone number for Twilio WhatsApp
  let phone = toPhone.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  } else if (!phone.startsWith('62')) {
    phone = '62' + phone;
  }
  const toWhatsApp = `whatsapp:+${phone}`;
  const fromWhatsApp = `whatsapp:${fromNumber.startsWith('+') ? fromNumber : '+' + fromNumber}`;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: toWhatsApp,
    From: fromWhatsApp,
    Body: messageBody,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

// Send WhatsApp notification to a single lecturer using Twilio API
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
    const apiConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);

    if (!apiConfigured) {
      console.log('[Twilio] Environment variables not configured. Logging message instead.');
      return {
        success: true,
        message: 'Notifikasi dicatat (API Twilio tidak dikonfigurasi)',
      };
    }

    if (!args.lecturerPhone) {
      return {
        success: false,
        message: `Nomor telepon tidak tersedia untuk ${args.lecturerName}`,
      };
    }

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
      console.log(`[Twilio] Sending to ${args.lecturerName} at ${args.lecturerPhone}`);
      await sendTwilioMessage(args.lecturerPhone, message);
      console.log(`[Twilio] Successfully sent notification to ${args.lecturerName}`);
      return {
        success: true,
        message: `Berhasil mengirim ke ${args.lecturerName}`,
      };
    } catch (error: any) {
      console.error('[Twilio] Error sending notification:', error);
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
    const seminarRequest = await ctx.runQuery(api.seminar_requests.get, {
      id: args.seminarRequestId,
    });

    if (!seminarRequest) {
      throw new Error('Permohonan seminar tidak ditemukan');
    }

    if (seminarRequest.status !== 'scheduled') {
      throw new Error('Seminar belum dijadwalkan');
    }

    const lecturers = [];

    if (seminarRequest.supervisor1Id) {
      const supervisor1 = await ctx.runQuery(api.lecturers.get, { id: seminarRequest.supervisor1Id });
      if (supervisor1) lecturers.push({ name: supervisor1.name, phone: supervisor1.phone, role: 'Pembimbing Utama' });
    }
    if (seminarRequest.supervisor2Id) {
      const supervisor2 = await ctx.runQuery(api.lecturers.get, { id: seminarRequest.supervisor2Id });
      if (supervisor2) lecturers.push({ name: supervisor2.name, phone: supervisor2.phone, role: 'Pembimbing Pendamping' });
    }
    if (seminarRequest.examiner1Id) {
      const examiner1 = await ctx.runQuery(api.lecturers.get, { id: seminarRequest.examiner1Id });
      if (examiner1) lecturers.push({ name: examiner1.name, phone: examiner1.phone, role: 'Penguji 1' });
    }
    if (seminarRequest.examiner2Id) {
      const examiner2 = await ctx.runQuery(api.lecturers.get, { id: seminarRequest.examiner2Id });
      if (examiner2) lecturers.push({ name: examiner2.name, phone: examiner2.phone, role: 'Penguji 2' });
    }

    const timeRange = seminarRequest.scheduledStartTime && seminarRequest.scheduledEndTime
      ? `${seminarRequest.scheduledStartTime} - ${seminarRequest.scheduledEndTime} WIB`
      : seminarRequest.scheduledTime || 'Waktu belum ditentukan';

    const seminarTypeMap: Record<string, string> = {
      Proposal: 'Seminar Proposal',
      Hasil: 'Seminar Hasil',
      Sidang: 'Sidang Skripsi',
    };

    const results: Array<{ lecturer: string; role: string; success: boolean; message: string }> = [];

    const apiConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);

    for (const lecturer of lecturers) {
      if (!apiConfigured || !lecturer.phone) {
        results.push({
          lecturer: lecturer.name,
          role: lecturer.role,
          success: !apiConfigured,
          message: !apiConfigured ? 'Notifikasi dicatat (API Twilio tidak dikonfigurasi)' : `Nomor telepon tidak tersedia untuk ${lecturer.name}`,
        });
        continue;
      }

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
        await sendTwilioMessage(lecturer.phone, message);
        results.push({
          lecturer: lecturer.name,
          role: lecturer.role,
          success: true,
          message: `Berhasil mengirim ke ${lecturer.name}`,
        });
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
    console.log(`[Twilio] Notification batch complete. Success: ${allSuccess}`);

    return {
      success: allSuccess,
      results,
    };
  },
});
