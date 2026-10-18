'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, getStoredUser } from '../store/useAuthStore';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDrawer } from './NotificationDrawer';
import { Modal } from './Modal';

import { Button } from './Button';
import { Input } from './Input';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '../store/useSidebarStore';
import {
  Menu,
  Search,
  X,
  HelpCircle,
  Settings,
  LogIn,
  UserPlus,
  Sparkles,
  Home,
  GraduationCap,
  BookOpen,
  FileText,
  BarChart2,
  Gamepad2,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  subtitle,
  action,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const effectiveUser = user || (mounted && typeof window !== 'undefined' ? getStoredUser() : null);

  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useSidebarStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mainViewportRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    useSidebarStore.getState().initialize();
  }, []);

  const handleViewportScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrolled = e.currentTarget.scrollTop > 2;
    setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
  };

  useEffect(() => {
    setIsScrolled(false);
    if (mainViewportRef.current) {
      setIsScrolled(mainViewportRef.current.scrollTop > 2);
    }
  }, [pathname]);

  useEffect(() => {
    const handleWindowScroll = () => {
      const scrolled = window.scrollY > 2;
      setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
    };
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setSidebarCollapsed]);

  const isTeacher = useMemo(() => {
    if (!effectiveUser) return false;
    const r = (effectiveUser.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [effectiveUser]);

  const navItems = [
    { label: 'Trang chủ', href: '/app/dashboard', icon: Home },
    { label: 'Trợ lý SI', href: '/app/si', icon: Sparkles },
    { label: 'Lớp học của tôi', href: '/app/classes', icon: GraduationCap },
    ...(isTeacher
      ? [
          { label: 'Kho tài liệu', href: '/app/documents', icon: FileText },
          { label: 'Ngân hàng câu hỏi', href: '/app/question-bank', icon: BookOpen },
        ]
      : []),
    { label: 'Trò chơi lớp học', href: '/app/games', icon: Gamepad2 },
    { label: 'Báo cáo', href: '/app/results', icon: BarChart2 },
    { label: 'Cài đặt', href: '/app/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isTeacher) {
      router.push(`/app/question-bank?search=${encodeURIComponent(searchQuery)}`);
    } else {
      router.push(`/app/classes?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSidebarNavigation = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-google-bg dark:bg-[#131314] text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header (Navbar) - Fixed 100% Frozen at top:0 */}
      <header
        className={`fixed top-0 left-0 right-0 h-16 shrink-0 pl-2.5 pr-2 flex items-center justify-between select-none z-50 bg-google-bg dark:bg-[#131314] gap-1 sm:gap-4 transition-[border-color,box-shadow] duration-200 ease-in-out ${
          isScrolled && !(title || action)
            ? 'border-b border-black/[0.08] dark:border-white/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.04)]'
            : 'border-b border-transparent shadow-none'
        }`}
      >
        {/* Left: Menu & Brand Logo */}
        <div className="flex items-center gap-1 shrink min-w-0 w-auto sm:w-[200px] relative z-10">
          <button
            onClick={toggleSidebar}
            className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-slate-200/70 dark:hover:bg-[#2d2f31] text-slate-700 dark:text-slate-300 shrink-0 cursor-pointer"
            title="Menu chính"
            aria-label="Toggle Navigation"
            aria-controls="app-sidebar"
            aria-expanded={!sidebarCollapsed}
            suppressHydrationWarning
          >
            <Menu size={21} />
          </button>

          <div
            onClick={() => router.push('/app/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap ml-1 min-w-0"
          >
            {/* KiyoEdu modern logo */}
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#1e1f20] flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-slate-200/70 dark:border-[#2d2f31]">
              <svg viewBox="0 0 24 24" width="20" height="20" className="w-full h-full block" style={{ maxWidth: '20px', maxHeight: '20px' }}>
                <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
                <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
                <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
                <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100 truncate max-w-[132px] sm:max-w-none">
                KiyoEdu
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-google-blue">
                v2.0
              </span>
            </div>
          </div>
        </div>

        {/* Center: Google Drive Search Bar */}
        <div className="hidden md:block flex-1 max-w-2xl mx-2 relative z-10">
          <form onSubmit={handleSearch} className="w-full">
            <div className="flex items-center gap-3 px-4 py-2 bg-google-hover/80 dark:bg-[#282a2c] hover:bg-google-hover dark:hover:bg-[#323437] rounded-full transition-all text-slate-900 dark:text-slate-100 border border-transparent">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder={
                  isTeacher
                    ? 'Tìm kiếm câu hỏi, đề thi, bài tập và lớp học'
                    : 'Tìm kiếm lớp học và bài tập'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Google Top Utility Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-10">
          {/* Nâng cấp Button */}
          <button
            onClick={() => router.push('/app/settings/plans')}
            className="hidden lg:flex items-center gap-2 h-10 px-5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 hover:from-blue-500/25 hover:via-indigo-500/25 hover:to-purple-500/25 text-google-blue dark:text-blue-300 transition-all cursor-pointer mr-1"
            title="Nâng cấp tài khoản"
          >
            <Sparkles size={17} className="text-google-blue dark:text-blue-300 shrink-0" />
            <span>Nâng cấp</span>
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => router.push('/app/help')}
            className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200/70 dark:hover:bg-[#2d2f31] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Trợ giúp và Hướng dẫn"
          >
            <HelpCircle size={20} />
          </button>

          {effectiveUser && <NotificationDrawer />}

          {effectiveUser && (
            <button
              type="button"
              onClick={() => router.push('/app/settings')}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200/70 dark:hover:bg-[#2d2f31] text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <Settings size={20} />
            </button>
          )}

          {effectiveUser ? (
            /* Google Avatar Circle with colorful ring */
            <div
              onClick={() => router.push('/app/settings')}
              className="relative cursor-pointer p-0.5 rounded-full ring-2 ring-google-blue/60 ml-1"
              title={`${effectiveUser?.name || effectiveUser?.email} (${effectiveUser?.role})`}
            >
              <div className="w-8 h-8 rounded-full bg-google-blue text-white flex items-center justify-center font-bold text-xs">
                {effectiveUser?.name ? effectiveUser.name[0].toUpperCase() : 'U'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
                className="gap-1.5"
              >
                <LogIn size={15} /> Đăng nhập
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
                className="gap-1.5"
              >
                <UserPlus size={15} /> Đăng ký
              </Button>
            </div>
          )}
        </div>
      </header>

      {!sidebarCollapsed && (
        <button
          type="button"
          aria-label="Đóng menu điều hướng"
          onClick={() => setSidebarCollapsed(true)}
          className="fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-[1px] md:hidden"
        />
      )}

      {/* Sidebar - desktop rail and mobile slide-out drawer */}
      <Sidebar
        sidebarCollapsed={sidebarCollapsed}
        isTeacher={isTeacher}
        isNewMenuOpen={isNewMenuOpen}
        setIsNewMenuOpen={setIsNewMenuOpen}
        setIsCreateClassOpen={() => {}}
        navItems={navItems}
        user={effectiveUser}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content Area - Fixed frame, only inner content scrolls */}
      <div
        id="main-scroll"
        suppressHydrationWarning
        className={`absolute inset-0 pt-16 overflow-hidden transition-[padding-left] duration-200 ease-in-out ${
          sidebarCollapsed ? 'md:pl-[64px]' : 'md:pl-[220px]'
        }`}
      >
        <div className="mr-0 h-full flex flex-col">
          {/* Inner Google White Sheet Canvas */}
          <div className="bg-white dark:bg-[#1e1f20] rounded-none md:rounded-tl-3xl md:rounded-tr-none md:rounded-b-none shadow-none flex-1 flex flex-col overflow-hidden">
            {/* Fixed Action / Title Bar Header - Frozen at top, zero layout shift, zero scrollbar interference */}
            {(title || action) && (
              <header
                className={`app-title-bar shrink-0 w-full px-3 sm:px-4 h-14 max-h-14 flex flex-row items-center justify-between gap-3 print:hidden select-none relative z-10 bg-white dark:bg-[#1e1f20] transition-[border-color,box-shadow] duration-200 ease-in-out ${
                  isScrolled
                    ? 'border-b border-black/[0.08] dark:border-white/10 shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.04)]'
                    : 'border-b border-transparent shadow-none'
                }`}
              >
                <div className="app-title-container min-w-0 flex-1 flex items-center h-full">
                  {title &&
                    (typeof title === 'string' ? (
                      <h1 className="text-xl font-normal tracking-tight text-slate-900 dark:text-slate-100 leading-tight truncate">
                        {title}
                      </h1>
                    ) : (
                      <div className="text-xl font-normal tracking-tight text-slate-900 dark:text-slate-100 leading-tight min-w-0 w-full flex items-center">
                        {title}
                      </div>
                    ))}
                </div>
                {action && (
                  <div className="flex items-center gap-2 shrink-0 h-full max-h-9 [&>*]:min-w-0">
                    {action}
                  </div>
                )}
              </header>
            )}

            {/* Page Body Viewport - ONLY inner content scrolls */}
            <main
              id="app-main-viewport"
              ref={mainViewportRef}
              onScroll={handleViewportScroll}
              className={`flex-1 w-full ${
                pathname?.startsWith('/app/si') || pathname?.startsWith('/si') || pathname?.startsWith('/app/ai') || pathname?.startsWith('/ai')
                  ? 'p-0 flex flex-col overflow-hidden no-scrollbar'
                  : `overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-3.5 ${(title || action) ? 'pt-1' : 'pt-4'}`
              }`}
              style={pathname?.startsWith('/app/si') || pathname?.startsWith('/si') || pathname?.startsWith('/app/ai') || pathname?.startsWith('/ai') ? undefined : { scrollbarGutter: 'stable' }}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
