'use client';

import React, { useState } from 'react';
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

  // State-driven hover and click tracking
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [clickedKey, setClickedKey] = useState<string | null>(null);

  const handleNavClick = (href: string) => {
    setClickedKey(href);
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
      className={`shrink-0 transition-[width,transform] duration-300 ease-in-out select-none flex flex-col justify-between p-3 fixed top-16 left-0 bottom-0 z-50 overflow-y-auto overflow-x-visible bg-white dark:bg-google-card-dark shadow-xl md:bg-google-bg md:dark:bg-google-bg-dark md:shadow-none md:z-30 ${
        sidebarCollapsed
          ? 'w-[280px] -translate-x-full md:translate-x-0 md:w-[72px]'
          : 'translate-x-0 w-[280px] md:w-[200px]'
      }`}
    >
      <div className="space-y-4">
        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            const isTooltipVisible =
              sidebarCollapsed &&
              hoveredKey === item.href &&
              clickedKey !== item.href;

            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={() => {
                  setHoveredKey(item.href);
                }}
                onMouseLeave={() => {
                  setHoveredKey(null);
                  setClickedKey(null);
                }}
              >
                <button
                  onClick={() => handleNavClick(item.href)}
                  className={`h-10 text-sm font-medium transition-colors duration-200 ease-in-out inline-flex items-center rounded-full overflow-hidden shrink-0 ${
                    isActive
                      ? 'bg-google-pill text-google-pill-text dark:bg-google-pill-dark dark:text-google-pill-dark-text font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-google-hover dark:hover:bg-google-hover-dark'
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <Icon size={19} />
                  </div>
                  <span
                    className={`truncate text-left whitespace-nowrap overflow-hidden transition-[max-width,opacity,padding] duration-300 ease-in-out ${
                      sidebarCollapsed ? 'max-w-0 opacity-0 pr-0' : 'max-w-[150px] opacity-100 pr-3.5'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>

                {/* Floating Tooltip Pill on Hover when Sidebar is Collapsed */}
                <div
                  className={`absolute left-full top-1/2 -translate-y-1/2 ml-3 transition-all duration-150 ease-in-out pointer-events-none z-50 ${
                    isTooltipVisible
                      ? 'opacity-100 scale-100 translate-x-0'
                      : 'opacity-0 scale-95 -translate-x-2'
                  } hidden md:block`}
                >
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold text-xs px-4 py-2.5 rounded-2xl shadow-lg whitespace-nowrap flex items-center gap-2">
                    {item.label}
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
