'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Calendar,
  Users,
  Home,
  Upload,
  FileText,
  UserCheck,
  CalendarClock,
  UserCog,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/admin/permohonan', label: 'Permohonan', icon: FileText },
  { href: '/kaprodi/alokasi', label: 'Alokasi Penguji', icon: UserCheck },
  { href: '/admin/jadwal-seminar', label: 'Penjadwalan', icon: CalendarClock },
  { href: '/kalender', label: 'Kalender', icon: Calendar },
];

const adminNavItems = [
  { href: '/admin/dosen', label: 'Data Dosen', icon: Users },
  { href: '/admin/jadwal/unggah', label: 'Unggah Jadwal', icon: Upload },
  { href: '/admin/staff', label: 'Pegawai', icon: Users },
  { href: '/admin/roles', label: 'Pengaturan Jabatan', icon: UserCog },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const pathname = usePathname();

  const isAdminActive = adminNavItems.some(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  );

  return (
    <nav className="border-b bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo Container */}
            <div className="relative h-12 w-12 flex-shrink-0 rounded-lg bg-primary/10 p-1.5 overflow-hidden">
              {!logoError ? (
                <Image
                  src="/Logo Unand PTNBH.png"
                  alt="Logo Universitas Andalas"
                  fill
                  className="object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <GraduationCap className="h-full w-full text-primary" />
              )}
            </div>

            {/* Title */}
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Teknik Industri Unand
              </span>
              <span className="text-lg font-bold text-primary tracking-tight">
                Sistem Penjadwalan Seminar
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Admin Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                onBlur={() => setTimeout(() => setShowAdminMenu(false), 150)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  isAdminActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Users className="h-4 w-4" />
                <span>Admin</span>
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform',
                  showAdminMenu && 'rotate-180'
                )} />
              </button>

              {showAdminMenu && (
                <div className="absolute right-0 mt-1 w-48 rounded-lg border bg-white dark:bg-gray-800 shadow-lg py-1 z-50">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                        )}
                        onClick={() => setShowAdminMenu(false)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden border-t bg-white dark:bg-gray-900">
          <div className="space-y-1 px-2 py-3">
            {/* Main Menu */}
            <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase">
              Menu Utama
            </p>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            {/* Admin Menu */}
            <p className="px-4 py-1 mt-3 text-xs font-semibold text-muted-foreground uppercase">
              Menu Admin
            </p>
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-foreground hover:bg-muted'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
