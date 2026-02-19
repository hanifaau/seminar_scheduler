'use client';

import * as React from 'react';
import { Navbar } from '@/components/organisms/Navbar';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={cn('mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8', className)}>
        {children}
      </main>
    </div>
  );
}
