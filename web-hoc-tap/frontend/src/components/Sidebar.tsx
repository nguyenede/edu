'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Plus,
  FolderPlus,
  BookOpen,
  FilePlus,
  Gamepad2,
  HardDrive,
  LucideIcon,
} from 'lucide-react';

import { startTopLoading } from './TopLoadingBar';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface SidebarProps {
  sidebarCollapsed: boolean;
  isTeacher: boolean;
  isNewMenuOpen: boolean;
  setIsNewMenuOpen: (open: boolean) => void;
  setIsCreateClassOpen: (open: boolean) => void;
  navItems: NavItem[];
  user: any;
  handleLogout: () => void;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarCollapsed,
  isTeacher,
  isNewMenuOpen,
  setIsNewMenuOpen,
  setIsCreateClassOpen,
  navItems,
  user,
  handleLogout,
  onNavigate,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // State-driven hover and warm tooltip tracking
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);
  const [clickedKey, setClickedKey] = useState<string | null>(null);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isWarmRef = useRef<boolean>(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const handleMouseEnter = (href: string) => {
    // Hủy bộ đếm thời gian nguội nếu người dùng vừa di chuyển từ icon khác sang
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (isWarmRef.current) {
      // Đã hiện tiêu đề rồi -> chuyển sang icon khác trong thanh thì hiện ngay lập tức (0ms)
      setActiveTooltipKey(href);
    } else {
      // Lần đầu di chuột vào: chờ đúng 1 giây (1000ms) sau mới cho hiện tiêu đề
      hoverTimerRef.current = setTimeout(() => {
        setActiveTooltipKey(href);
        isWarmRef.current = true;
      }, 1000);
    }
  };

  const handleMouseLeave = (href: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    setActiveTooltipKey((current) => (current === href ? null : current));
    setClickedKey(null);

    // Khi di chuột ra khỏi icon: giữ trạng thái warm trong 400ms để rê sang icon khác thì hiện ngay
    // Nếu quá 400ms không chạm vào icon nào thì tắt warm (lần sau phải đợi 1s)
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      isWarmRef.current = false;
    }, 400);
  };

  const handleNavClick = (href: string) => {
    setClickedKey(href);
    setActiveTooltipKey(null);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    isWarmRef.current = false;
    onNavigate?.();
    startTopLoading();
    // Allow 130ms for the smooth closing transition (fade-out & scale-down) to finish before pushing route
    setTimeout(() => {
      router.push(href);
    }, 130);
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Điều hướng chính"
      suppressHydrationWarning
      className={`shrink-0 ${
        isMounted ? 'transition-[width,transform] duration-300 ease-in-out' : ''
      } select-none flex flex-col justify-between fixed top-16 left-0 bottom-0 z-50 overflow-y-auto md:overflow-visible bg-white dark:bg-google-card-dark shadow-xl md:bg-google-bg md:dark:bg-google-bg-dark md:shadow-none md:z-50 py-3 px-2.5 ${
        sidebarCollapsed
          ? 'w-[280px] -translate-x-full md:translate-x-0 md:w-[64px]'
          : 'translate-x-0 w-[280px] md:w-[200px]'
      }`}
    >
      <div className="space-y-4 w-full">
        {/* Navigation List */}
        <nav className="space-y-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            const isTooltipVisible =
              sidebarCollapsed &&
              activeTooltipKey === item.href &&
              clickedKey !== item.href;

            return (
              <div
                key={item.href}
                className="relative w-full"
                onMouseEnter={() => handleMouseEnter(item.href)}
                onMouseLeave={() => handleMouseLeave(item.href)}
              >
                <button
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  className={`h-11 text-sm font-medium transition-colors duration-200 ease-in-out flex items-center rounded-full overflow-hidden shrink-0 cursor-pointer ${
                    sidebarCollapsed ? 'w-11 justify-center' : 'w-full'
                  } ${
                    isActive
                      ? 'bg-google-pill text-google-pill-text dark:bg-google-pill-dark dark:text-google-pill-dark-text font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-google-hover dark:hover:bg-google-hover-dark'
                  }`}
                >
                  <div className="w-11 h-11 flex items-center justify-center shrink-0">
                    <Icon size={21} />
                  </div>
                  {!sidebarCollapsed && (
                    <span className="truncate text-left whitespace-nowrap overflow-hidden pr-3 text-sm font-medium animate-in fade-in duration-200">
                      {item.label}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip Pill on Hover when Sidebar is Collapsed */}
                <div
                  className={`absolute left-full top-1/2 -translate-y-1/2 ml-2 transition-all duration-150 ease-out pointer-events-none z-[9999] ${
                    isTooltipVisible
                      ? 'opacity-100 scale-100 translate-x-0'
                      : 'opacity-0 scale-95 -translate-x-1.5'
                  } hidden md:block`}
                >
                  <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center border border-slate-700/50 dark:border-slate-300/50">
                    <span>{item.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </div>

    </aside>
  );
};
