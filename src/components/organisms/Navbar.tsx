'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  { href: '/admin/ruangan', label: 'Data Ruangan', icon: Home },
  { href: '/admin/jadwal/unggah', label: 'Unggah Jadwal', icon: Upload },
  { href: '/admin/staff', label: 'Pegawai', icon: Users },
  { href: '/admin/roles', label: 'Pengaturan Jabatan', icon: UserCog },
];

export function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showAdminMenu, setShowAdminMenu] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  // Handle scroll for glass effect
  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdminActive = adminNavItems.some(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  );

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled
          ? 'glass border-b border-white/20 shadow-sm'
          : 'bg-white/80 border-b border-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo Container */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-1"
            >
              {!logoError ? (
                <Image
                  src="/Logo Unand PTNBH.png"
                  alt="Logo Universitas Andalas"
                  width={36}
                  height={36}
                  className="object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <GraduationCap className="h-9 w-9 text-primary" />
              )}
            </motion.div>

            {/* Title */}
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                Teknik Industri Unand
              </span>
              <span className="text-base font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent tracking-tight">
                Sistem Penjadwalan Seminar
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/25'
                        : 'text-muted-foreground hover:bg-primary/8 hover:text-primary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}

            {/* Admin Dropdown */}
            <div className="relative">
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                onBlur={() => setTimeout(() => setShowAdminMenu(false), 150)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                  isAdminActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-accent/8 hover:text-accent'
                )}
              >
                <Users className="h-4 w-4" />
                <span>Admin</span>
                <ChevronDown className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  showAdminMenu && 'rotate-180'
                )} />
              </motion.button>

              <AnimatePresence>
                {showAdminMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-xl border border-border/50 bg-white/95 backdrop-blur-sm shadow-xl shadow-black/5 py-1.5 z-50"
                  >
                    {adminNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                            isActive
                              ? 'bg-primary/8 text-primary font-medium'
                              : 'text-foreground hover:bg-muted'
                          )}
                          onClick={() => setShowAdminMenu(false)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
              className="rounded-xl"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden glass border-t border-white/10"
          >
            <div className="space-y-1 px-4 py-4">
              {/* Main Menu */}
              <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                Menu Utama
              </p>
              {mainNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <motion.div
                    key={item.href}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                        isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'text-foreground hover:bg-muted'
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}

              {/* Admin Menu */}
              <p className="px-3 py-1.5 mt-4 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                Menu Admin
              </p>
              {adminNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <motion.div
                    key={item.href}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 + index * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all',
                        isActive
                          ? 'bg-accent/10 text-accent'
                          : 'text-foreground hover:bg-muted'
                      )}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
