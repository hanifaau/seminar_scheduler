'use client';

import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { Plus, Edit, Trash2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from 'convex/_generated/api';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Badge } from '@/components/atoms/Badge';
import { SearchInput } from '@/components/molecules/SearchInput';
import { cn } from '@/lib/utils';
import { Id } from 'convex/_generated/dataModel';

interface Room {
  _id: string;
  name: string;
  capacity?: number;
  location?: string;
  status?: string;
}

// Skeleton component
function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded-md bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded-md bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded-md bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-6 w-16 animate-pulse rounded-md bg-muted" /></td>
      <td className="px-4 py-3"><div className="h-8 w-20 animate-pulse rounded-md bg-muted" /></td>
    </tr>
  );
}

export default function ManajemenRuanganPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingRoom, setEditingRoom] = React.useState<Room | null>(null);

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    capacity: '',
    location: '',
    status: 'active',
  });

  // Queries
  const rooms = useQuery(api.rooms.getAll);

  // Mutations
  const createRoom = useMutation(api.rooms.create);
  const updateRoom = useMutation(api.rooms.update);
  const deleteRoom = useMutation(api.rooms.remove);

  // Filter rooms
  const filteredRooms = React.useMemo(() => {
    if (!rooms) return [];

    return rooms.filter((room) => {
      const matchesSearch =
        searchQuery === '' ||
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.location && room.location.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [rooms, searchQuery]);

  const handleAddRoom = async () => {
    if (!formData.name) {
      toast.error('Nama ruangan wajib diisi');
      return;
    }

    try {
      await createRoom({
        name: formData.name,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        location: formData.location || undefined,
        status: formData.status,
      });

      toast.success('Ruangan berhasil ditambahkan');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menambahkan ruangan');
    }
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;
    if (!formData.name) {
      toast.error('Nama ruangan wajib diisi');
      return;
    }

    try {
      await updateRoom({
        id: editingRoom._id as Id<"rooms">,
        name: formData.name,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        location: formData.location || undefined,
        status: formData.status,
      });

      toast.success('Ruangan berhasil diperbarui');
      setEditingRoom(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Gagal memperbarui ruangan');
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus ruangan ${name}?`)) {
      try {
        await deleteRoom({ id: id as Id<"rooms"> });
        toast.success('Ruangan berhasil dihapus');
      } catch (error: any) {
        toast.error('Gagal menghapus ruangan');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      location: '',
      status: 'active',
    });
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      capacity: room.capacity ? room.capacity.toString() : '',
      location: room.location || '',
      status: room.status || 'active',
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Manajemen Ruangan
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola master data ruangan untuk keperluan jadwal kuliah dan seminar.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau lokasi ruangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        
        <Button
          onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}
          className="w-full sm:w-auto rounded-xl gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah Ruangan
        </Button>
      </div>

      <div className="card-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Nama Ruangan</th>
                <th className="px-6 py-4 font-medium">Kapasitas</th>
                <th className="px-6 py-4 font-medium">Lokasi</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rooms === undefined ? (
                <>
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </>
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <MapPin className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-base font-medium text-foreground">Belum ada ruangan</p>
                    <p className="text-sm mt-1">Tambahkan ruangan baru untuk mulai.</p>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => (
                  <tr key={room._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{room.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{room.capacity ? `${room.capacity} orang` : '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{room.location || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={room.status === 'active' ? 'default' : 'secondary'} className={room.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : ''}>
                        {room.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(room)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoom(room._id, room.name)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {(isAddDialogOpen || editingRoom) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-foreground">
                {editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Ruangan <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="Contoh: Ruang Seminar Lt.1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasitas (opsional)</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="Contoh: 40"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lokasi (opsional)</Label>
                <Input
                  id="location"
                  placeholder="Contoh: Gedung E Lantai 2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>
            
            <div className="p-6 border-t bg-muted/20 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingRoom(null);
                }}
              >
                Batal
              </Button>
              <Button onClick={editingRoom ? handleUpdateRoom : handleAddRoom}>
                {editingRoom ? 'Simpan Perubahan' : 'Simpan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
