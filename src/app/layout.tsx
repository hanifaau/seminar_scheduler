import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ConvexClientProvider } from '@/lib/convex-provider';
import { Navbar } from '@/components/organisms/Navbar';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistem Penjadwalan Seminar - TI Unand',
  description: 'Sistem Penjadwalan Seminar Teknik Industri Universitas Andalas',
  icons: {
    icon: '/favicon.ico',
  },
};

// Force dynamic rendering to avoid build-time Convex client issues
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <ConvexClientProvider>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
          <Toaster position="top-right" richColors />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
