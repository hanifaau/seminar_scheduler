'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { toast } from 'sonner';

export default function KonfirmasiDosenPage() {
  const teamSchedules = useQuery(api.teaching_schedules.getTeamTeachingSchedules);
  const updateTeachingPeriod = useMutation(api.teaching_schedules.updateTeachingPeriod);

  const [savingId, setSavingId] = useState<string | null>(null);

  if (teamSchedules === undefined) {
    return <div className="p-8 text-center text-gray-500">Memuat data ruang tunggu...</div>;
  }

  // Group schedules by activity to show them together
  const groupedSchedules = teamSchedules.reduce((acc, schedule) => {
    const key = `${schedule.activity}-${schedule.day}-${schedule.startTime}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(schedule);
    return acc;
  }, {} as Record<string, typeof teamSchedules>);

  const handlePeriodChange = async (scheduleId: any, newPeriod: 'sebelum_uts' | 'setelah_uts' | 'full') => {
    setSavingId(scheduleId);
    try {
      await updateTeachingPeriod({
        id: scheduleId,
        teachingPeriod: newPeriod,
      });
      toast.success('Periode mengajar berhasil diperbarui');
    } catch (error) {
      console.error(error);
      toast.error('Gagal memperbarui periode mengajar');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Ruang Tunggu Konfirmasi Dosen</h1>
        <p className="text-gray-500 mt-2">
          Daftar mata kuliah di bawah ini terdeteksi diajar oleh lebih dari satu dosen (Team Teaching). 
          Silakan tentukan kapan masing-masing dosen bertugas mengajar.
        </p>
      </div>

      {Object.keys(groupedSchedules).length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-6 py-8 rounded-xl text-center">
          <p className="font-medium">Tidak ada jadwal Team Teaching yang perlu dikonfirmasi.</p>
          <p className="text-sm mt-1 opacity-80">Semua mata kuliah saat ini diampu oleh dosen tunggal.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSchedules).map(([key, schedules], idx) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{schedules[0].activity}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {schedules[0].day}, {schedules[0].startTime} - {schedules[0].endTime} | {schedules[0].room || 'Tanpa Ruangan'}
                  </p>
                </div>
                <div className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {schedules.length} Dosen
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {schedules.map((schedule) => (
                  <div key={schedule._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <h3 className="font-medium text-gray-900">{schedule.lecturer?.name || 'Dosen Tidak Diketahui'}</h3>
                      <p className="text-sm text-gray-500 mt-1">Grup: {schedule.group?.name || '-'}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-600">Tugas Mengajar:</label>
                      <select
                        value={schedule.teachingPeriod || 'full'}
                        onChange={(e) => handlePeriodChange(schedule._id, e.target.value as any)}
                        disabled={savingId === schedule._id}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="full">Seluruh Semester (Penuh)</option>
                        <option value="sebelum_uts">Hanya Sebelum UTS</option>
                        <option value="setelah_uts">Hanya Setelah UTS</option>
                      </select>
                      {savingId === schedule._id && (
                        <span className="text-xs text-blue-600 animate-pulse">Menyimpan...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
