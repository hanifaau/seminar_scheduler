'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';

export default function AcademicCalendarPage() {
  const settings = useQuery(api.settings.getAcademicCalendar);
  const updateSettings = useMutation(api.settings.updateAcademicCalendar);

  const [semesterStartDate, setSemesterStartDate] = useState('');
  const [utsStartDate, setUtsStartDate] = useState('');
  const [utsEndDate, setUtsEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (settings !== undefined) {
      if (settings) {
        setSemesterStartDate(settings.semesterStartDate || '');
        setUtsStartDate(settings.utsStartDate || '');
        setUtsEndDate(settings.utsEndDate || '');
        // Default ke mode baca (read-only) jika sudah ada data
        setIsEditing(false);
      } else {
        // Jika belum ada data sama sekali, otomatis mode edit
        setIsEditing(true);
      }
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        semesterStartDate,
        utsStartDate,
        utsEndDate,
      });
      toast.success('Kalender Akademik berhasil diperbarui');
      setIsEditing(false); // Kembali ke mode baca setelah simpan
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan kalender akademik');
    } finally {
      setIsSaving(false);
    }
  };

  if (settings === undefined) {
    return <div className="p-8 text-center text-gray-500">Memuat data...</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Kalender Akademik</h1>
        <p className="text-gray-500 mt-2">
          Atur tanggal-tanggal penting agar sistem dapat otomatis menghitung minggu ganjil/genap dan masa sebelum/sesudah UTS.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Pengaturan Tanggal</h2>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal Mulai Semester (Hari Pertama Kuliah)
            </label>
            <input
              type="date"
              required
              disabled={!isEditing}
              value={semesterStartDate}
              onChange={(e) => setSemesterStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
            />
            <p className="mt-1 text-sm text-gray-500">
              Digunakan untuk menghitung urutan minggu (Minggu ke-1, ke-2, dst) untuk jadwal Ganjil/Genap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Mulai UTS
              </label>
              <input
                type="date"
                required
                disabled={!isEditing}
                value={utsStartDate}
                onChange={(e) => setUtsStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Masa perkuliahan (setelah uts)
              </label>
              <input
                type="date"
                required
                disabled={!isEditing}
                value={utsEndDate}
                onChange={(e) => setUtsEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-600"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Tanggal UTS akan otomatis dilompati (tidak dihitung sebagai minggu berjalan), dan digunakan sebagai batas pergantian dosen Team Teaching.
          </p>

          <div className="pt-4 flex justify-end gap-3">
            {isEditing && settings && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSemesterStartDate(settings.semesterStartDate || '');
                  setUtsStartDate(settings.utsStartDate || '');
                  setUtsEndDate(settings.utsEndDate || '');
                }}
                className="px-6 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className={`${
                !isEditing
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50`}
            >
              {isSaving ? 'Menyimpan...' : !isEditing ? 'Ubah Pengaturan' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
