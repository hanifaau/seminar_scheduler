'use client';

import * as React from 'react';
import { Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

export interface Lecturer {
  _id: string;
  name: string;
  nip: string;
  expertise: string[];
  status?: string;
  createdAt: number;
}

interface LecturerTableProps {
  lecturers: Lecturer[];
  onEdit?: (lecturer: Lecturer) => void;
  onDelete?: (lecturer: Lecturer) => void;
  isLoading?: boolean;
}

export function LecturerTable({
  lecturers,
  onEdit,
  onDelete,
  isLoading,
}: LecturerTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (lecturers.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">
          No lecturers found. Add your first lecturer to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">NIP</th>
              <th className="px-4 py-3 text-left font-medium">Expertise</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.map((lecturer) => (
              <tr
                key={lecturer._id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="px-4 py-3 font-medium">{lecturer.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {lecturer.nip}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {lecturer.expertise.slice(0, 3).map((exp, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {exp}
                      </Badge>
                    ))}
                    {lecturer.expertise.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{lecturer.expertise.length - 3}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      lecturer.status === 'active'
                        ? 'success'
                        : lecturer.status === 'on leave'
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {lecturer.status || 'active'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(lecturer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(lecturer)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
