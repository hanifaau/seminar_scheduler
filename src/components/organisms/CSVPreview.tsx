'use client';

import * as React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

export interface CSVRow {
  _rowNumber: number;
  nip: string;
  day: string;
  startTime: string;
  endTime: string;
  activity: string;
  room?: string;
  notes?: string;
  _isValid?: boolean;
  _lecturerName?: string;
  _errors?: string[];
}

interface CSVPreviewProps {
  data: CSVRow[];
  onConfirm: () => void;
  onCancel: () => void;
  isUploading?: boolean;
  className?: string;
}

export function CSVPreview({
  data,
  onConfirm,
  onCancel,
  isUploading,
  className,
}: CSVPreviewProps) {
  const validRows = data.filter((row) => row._isValid);
  const invalidRows = data.filter((row) => !row._isValid);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          <span className="font-medium">{validRows.length} valid rows</span>
        </div>
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="font-medium">{invalidRows.length} invalid rows</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-12">#</th>
              <th className="px-3 py-2 text-left font-medium">NIP</th>
              <th className="px-3 py-2 text-left font-medium">Lecturer</th>
              <th className="px-3 py-2 text-left font-medium">Day</th>
              <th className="px-3 py-2 text-left font-medium">Time</th>
              <th className="px-3 py-2 text-left font-medium">Activity</th>
              <th className="px-3 py-2 text-left font-medium w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row._rowNumber}
                className={cn(
                  'border-b transition-colors',
                  row._isValid ? 'bg-background' : 'bg-red-50'
                )}
              >
                <td className="px-3 py-2 text-muted-foreground">
                  {row._rowNumber}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.nip}</td>
                <td className="px-3 py-2">
                  {row._lecturerName || (
                    <span className="text-muted-foreground italic">
                      Not found
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{row.day}</td>
                <td className="px-3 py-2">
                  {row.startTime} - {row.endTime}
                </td>
                <td className="px-3 py-2">{row.activity}</td>
                <td className="px-3 py-2">
                  {row._isValid ? (
                    <Badge variant="success" className="text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Invalid
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error Details */}
      {invalidRows.length > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <h4 className="font-medium text-yellow-800 mb-2">
            Rows with errors will be skipped:
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {invalidRows.map((row) => (
              <li key={row._rowNumber}>
                Row {row._rowNumber}: {row._errors?.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isUploading || validRows.length === 0}
        >
          {isUploading
            ? 'Uploading...'
            : `Upload ${validRows.length} Valid Rows`}
        </Button>
      </div>
    </div>
  );
}
