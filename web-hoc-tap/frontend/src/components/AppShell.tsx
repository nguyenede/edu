'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDrawer } from './NotificationDrawer';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Sidebar } from './Sidebar';
import {
  Menu,
  SlidersHorizontal,
  Search,
  Clock,
  Check,
  HelpCircle,
  Settings,
  Home,
  GraduationCap,
  BookOpen,
  Play,
  FileText,
  BarChart3,
  Bell,
  LogIn,
  UserPlus,
  Sparkles,
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const recentSearches = [
    'otp',
    'roblox',
    'n8n',
    'bonevn.net',
    'bonevn',
    'ku9w69767b847ad93',
  ];

  const toggleFilter = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((f) => f !== filterId) : [...prev, filterId]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const isTeacher = user?.role === 'TEACHER';

  const navItems = [
    { label: 'Trang chủ', href: '/app/dashboard', icon: Home },
    { label: 'Trợ lý AI', href: '/app/ai', icon: Sparkles },
    { label: 'Lớp học của tôi', href: '/app/classes', icon: GraduationCap },
    { label: 'Tài liệu', href: '/app/documents', icon: FileText },
    ...(isTeacher
      ? [
          { label: 'Ngân hàng câu hỏi', href: '/app/question-bank', icon: BookOpen },
          { label: 'Đề thi & Game', href: '/app/quizzes', icon: Play },
        ]
      : []),
    { label: 'Báo cáo', href: '/app/results', icon: BarChart3 },
    { label: 'Thông báo', href: '/app/notifications', icon: Bell },
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
    <div className="relative h-dvh w-full overflow-hidden bg-google-bg dark:bg-google-bg-dark text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Header (Navbar) - Fixed 100% Frozen at top:0 */}
      <header className="fixed top-0 left-0 right-0 h-16 shrink-0 pl-2 sm:pl-3 pr-2 flex items-center justify-between select-none z-50 bg-google-bg dark:bg-google-bg-dark gap-1 sm:gap-4">
        {/* Dark Dimmed Backdrop Overlay when Search is Active */}
        {isSearchFocused && (
          <div
            onClick={() => setIsSearchFocused(false)}
            className="fixed inset-0 bg-black/35 dark:bg-black/60 z-20 pointer-events-auto"
          />
        )}

        {/* Left: Menu & Brand Logo */}
        <div className={`flex items-center gap-1 shrink min-w-0 w-auto sm:w-[200px] relative z-10 ${isSearchFocused ? 'pointer-events-none' : ''}`}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0"
            title="Menu chính"
            aria-label="Toggle Navigation"
            aria-controls="app-sidebar"
            aria-expanded={!sidebarCollapsed}
          >
            <Menu size={20} />
          </button>

          <div
            onClick={() => router.push('/app/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer whitespace-nowrap ml-1 min-w-0"
          >
            {/* KiyoEdu modern logo */}
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shrink-0 shadow-sm border border-slate-200/70 dark:border-slate-800">
              <svg viewBox="0 0 24 24" className="w-full h-full">
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
        <div ref={searchRef} className="hidden md:block flex-1 max-w-2xl mx-2 relative z-30">
          <div
            className={`relative w-full ${
              isSearchFocused ? 'shadow-2xl rounded-[24px]' : ''
            }`}
            style={isSearchFocused ? { backgroundColor: '#ffffff' } : undefined}
          >
            <form
              onSubmit={(e) => {
                handleSearch(e);
                setIsSearchFocused(false);
              }}
              className="w-full"
            >
              <div
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  isSearchFocused
                    ? '!bg-white dark:!bg-white text-slate-900 rounded-t-[24px] rounded-b-none'
                    : 'bg-google-hover/80 dark:bg-google-hover-dark/80 hover:bg-google-hover dark:hover:bg-google-hover-dark rounded-full'
                }`}
                style={isSearchFocused ? { backgroundColor: '#ffffff', color: '#0f172a' } : undefined}
              >
                <Search
                  size={18}
                  className={isSearchFocused ? 'text-slate-600 shrink-0' : 'text-slate-500 shrink-0'}
                />
                <input
                  type="text"
                  placeholder={
                    isTeacher
                      ? 'Tìm kiếm câu hỏi, đề thi, bài tập và lớp học...'
                      : 'Tìm kiếm lớp học và bài tập...'
                  }
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-transparent text-sm placeholder-slate-500 focus:outline-none focus:ring-0 ${
                    isSearchFocused ? 'text-slate-900' : 'text-slate-900 dark:text-slate-100'
                  }`}
                  style={isSearchFocused ? { backgroundColor: '#ffffff', color: '#0f172a' } : undefined}
                />
                <button
                  type="button"
                  className={`p-1.5 rounded-full transition-colors ${
                    isSearchFocused
                      ? 'hover:bg-slate-100 text-slate-600'
                      : 'hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-500'
                  }`}
                  title="Tùy chọn tìm kiếm"
                >
                  <SlidersHorizontal size={18} />
                </button>
              </div>
            </form>

            {/* Expanded 100% White Search Card Dropdown */}
            {isSearchFocused && (
              <div
                className="absolute top-full left-0 right-0 !bg-white dark:!bg-white text-slate-900 rounded-b-[24px] p-4 space-y-4 pt-2 z-30 border-t-0 -mt-[1px]"
                style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
              >
                {/* Quick Filter Pills Row (Exact like uploaded screenshot) */}
                <div className="flex flex-wrap gap-2 items-center">
                  {[
                    { id: 'attachment', label: 'Chứa tệp đính kèm' },
                    { id: '7days', label: '7 ngày qua' },
                    { id: 'from_me', label: 'Từ tôi' },
                  ].map((filter) => {
                    const isActive = activeFilters.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => toggleFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-blue-50 text-google-blue border-google-blue/40 font-semibold'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {isActive && <Check size={14} className="text-google-blue" />}
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {/* History Search List (Exact like uploaded screenshot) */}
                <div className="space-y-0.5 pt-1">
                  {recentSearches.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSearchQuery(item);
                        setIsSearchFocused(false);
                        if (isTeacher) {
                          router.push(`/app/question-bank?search=${encodeURIComponent(item)}`);
                        } else {
                          router.push(`/app/classes?search=${encodeURIComponent(item)}`);
                        }
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                    >
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Google Top Utility Icons */}
        <div className={`flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-10 ${isSearchFocused ? 'pointer-events-none' : ''}`}>
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
            className="hidden sm:block p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Trợ giúp & Hướng dẫn"
          >
            <HelpCircle size={20} />
          </button>

          {user && <NotificationDrawer />}

          {user && (
            <button
              type="button"
              onClick={() => router.push('/app/settings')}
              className="hidden sm:block p-2.5 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title="Cài đặt"
            >
              <Settings size={20} />
            </button>
          )}

          {user ? (
            /* Google Avatar Circle with colorful ring */
            <div
              onClick={() => router.push('/settings')}
              className="relative cursor-pointer p-0.5 rounded-full ring-2 ring-google-blue/60 ml-1"
              title={`${user?.name || user?.email} (${user?.role})`}
            >
              <div className="w-8 h-8 rounded-full bg-google-blue text-white flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
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
          className="fixed inset-0 top-16 z-40 bg-slate-950/40 backdrop-blur-[1px] md:hidden"
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
        user={user}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Content Area - Fixed frame, only inner content scrolls */}
      <div
        id="main-scroll"
        className={`absolute inset-0 pt-16 overflow-hidden transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[200px]'
        }`}
      >
        <div className="mr-0 h-full flex flex-col">
          {/* Inner Google White Sheet Canvas */}
          <div className="bg-white dark:bg-google-card-dark rounded-none md:rounded-tl-2xl md:rounded-tr-none md:rounded-b-none shadow-none flex-1 flex flex-col overflow-hidden">
            {/* Page Body Viewport - Title and content scroll together smoothly */}
            <main
              id="app-main-viewport"
              className={`flex-1 w-full ${
                pathname?.startsWith('/app/ai') || pathname?.startsWith('/ai')
                  ? 'p-0 flex flex-col overflow-hidden no-scrollbar'
                  : 'overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-3.5 pt-4'
              }`}
              style={pathname?.startsWith('/app/ai') || pathname?.startsWith('/ai') ? undefined : { scrollbarGutter: 'stable' }}
            >
              {/* Action / Title Bar Header */}
              {(title || action) && (
                <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
                  <div className="min-w-0">
                    {title &&
                      (typeof title === 'string' ? (
                        <h1 className="text-xl sm:text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 leading-tight break-words">
                          {title}
                        </h1>
                      ) : (
                        <div className="font-[450]">{title}</div>
                      ))}
                  </div>
                  {action && <div className="flex w-full sm:w-auto min-w-0 items-center gap-2 [&>*]:min-w-0 [&>*]:flex-wrap">{action}</div>}
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
