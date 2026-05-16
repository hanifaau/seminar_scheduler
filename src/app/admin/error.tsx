'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/atoms/Button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Admin Page Error:', error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-12 w-12 text-destructive" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        Terjadi Kesalahan Aplikasi
      </h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Maaf, sistem mengalami masalah saat memuat halaman ini.
      </p>
      
      <div className="mb-8 w-full max-w-2xl rounded-md bg-muted p-4 text-left border overflow-auto">
        <p className="font-mono text-sm text-destructive font-semibold mb-2">Error Details:</p>
        <p className="font-mono text-xs break-all">{error.message || 'Unknown error'}</p>
        {error.stack && (
          <pre className="mt-2 text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
            {error.stack}
          </pre>
        )}
      </div>

      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Muat Ulang Halaman
        </Button>
      </div>
    </div>
  );
}
