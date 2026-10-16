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

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 60);
    return () => clearTimeout(timer);
  }, []);

  const handleMouseEnter = (href: string) => {
    // Di trỏ chuột vào là hiện lên tiêu đề ngay lập tức (0ms)
    setActiveTooltipKey(href);
  };

  const handleMouseLeave = (href: string) => {
    setActiveTooltipKey((current) => (current === href ? null : current));
    setClickedKey(null);
  };

  const handleNavClick = (href: string) => {
    setClickedKey(href);
    setActiveTooltipKey(null);
    onNavigate?.();

    const normPath = (pathname || '').replace(/^\/app(?=\/|$)/, '') || '/dashboard';
    const normHref = href.replace(/^\/app(?=\/|$)/, '') || '/dashboard';

    // If already on the target route, don't trigger loading or navigation
    if (normPath === normHref) {
      return;
    }

    router.push(href);
  };

  return (
    <aside
      id="app-sidebar"
      aria-label="Điều hướng chính"
      suppressHydrationWarning
      className={`shrink-0 ${
        isMounted ? 'transition-[width,transform] duration-300 ease-in-out' : ''
      } select-none flex flex-col justify-between fixed top-16 left-0 bottom-0 z-50 overflow-y-auto md:overflow-visible bg-white dark:bg-[#1e1f20] shadow-xl md:bg-google-bg md:dark:bg-[#131314] md:shadow-none md:z-50 py-3 px-2.5 ${
        sidebarCollapsed
          ? 'w-[280px] -translate-x-full md:translate-x-0 md:w-[64px]'
          : 'translate-x-0 w-[280px] md:w-[220px]'
      }`}
    >
      <div className="space-y-4 w-full">
        {/* Navigation List */}
        <nav className="space-y-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const normPath = pathname?.replace(/^\/app(?=\/|$)/, '') || '/dashboard';
            const normHref = item.href.replace(/^\/app(?=\/|$)/, '') || '/dashboard';
            const isActive =
              normPath === normHref ||
              (normHref !== '/dashboard' && normPath.startsWith(normHref)) ||
              (normHref === '/classes' && (normPath.startsWith('/classes') || normPath.startsWith('/assignments')));

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
                  aria-label={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className={`h-11 transition-[background-color,color] duration-200 ease-in-out flex items-center justify-start rounded-full overflow-hidden shrink-0 cursor-pointer w-full ${
                    isActive
                      ? 'bg-blue-100/80 dark:bg-blue-950/60 text-google-blue dark:text-blue-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                  }`}
                >
                  {/* Fixed 44x44 icon container, anchored permanently to left edge without shifting */}
                  <div className="w-11 h-11 flex items-center justify-center shrink-0">
                    {Icon && (
                      <Icon
                        size={20}
                        className={
                          isActive
                            ? 'text-google-blue dark:text-blue-400 stroke-[2]'
                            : 'text-slate-600 dark:text-slate-400 stroke-[1.8]'
                        }
                      />
                    )}
                  </div>
                  <span
                    className={`truncate text-left whitespace-nowrap overflow-hidden pr-2 text-sm font-medium ${
                      sidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100'
                    } transition-opacity duration-150`}
                  >
                    {item.label}
                  </span>
                </button>

                {/* Floating Tooltip Pill on Hover when Sidebar is Collapsed */}
                <div
                  className={`absolute left-[52px] top-1/2 -translate-y-1/2 ml-1 transition-all duration-150 ease-out pointer-events-none z-[9999] ${
                    isTooltipVisible
                      ? 'opacity-100 scale-100 translate-x-0'
                      : 'opacity-0 scale-95 -translate-x-1.5'
                  } hidden md:block`}
                >
                  <div className="bg-slate-900 text-white dark:bg-[#2d2f31] dark:text-[#f1f3f4] font-medium text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center border border-slate-700/50 dark:border-[#3c4043]">
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
