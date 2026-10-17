'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronRight,
  Folder,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface BreadcrumbFolderItem {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface BreadcrumbFileItem {
  id: string;
  name: string;
  parentId?: string | null;
  fileType?: 'docx' | 'txt' | 'pdf' | 'other' | string;
  createdAt?: string;
  parsedQuiz?: {
    title?: string;
    questions?: any[];
  };
}

export interface BreadcrumbDropdownItem {
  id?: string;
  name?: string;
  label?: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  isDivider?: boolean;
  isActive?: boolean;
}

interface BreadcrumbChevronProps {
  /** Explicit custom dropdown items (for non-folder breadcrumbs like Settings, Classes, Create modes) */
  items?: BreadcrumbDropdownItem[];
  /** Optional custom title/label for the dropdown header */
  menuTitle?: string;
  /** The folder ID whose children should be displayed (for documents). null = Root ("Tài liệu của tôi") */
  folderId?: string | null;
  /** List of all folders (if not supplied or empty, will read from localStorage) */
  allFolders?: BreadcrumbFolderItem[];
  /** Optional list of all files to display sub-documents */
  allFiles?: BreadcrumbFileItem[];
  /** Custom folder navigation callback. If not provided, routes to /app/documents?folderId=... */
  onNavigateFolder?: (folderId: string) => void;
  /** Custom file navigation callback. If not provided, routes to /app/documents/[fileId]/view */
  onNavigateFile?: (fileId: string) => void;
  /** If true, returns null when there are no items to drop down. Defaults to false */
  hideWhenEmpty?: boolean;
  /** If true, renders a static chevron separator when there are no items to drop down. Defaults to true */
  fallbackToStaticChevron?: boolean;
  /** If true, always renders as a static chevron separator without dropdown */
  isStatic?: boolean;
  className?: string;
}

export function BreadcrumbChevron({
  items,
  menuTitle,
  folderId,
  allFolders,
  allFiles,
  onNavigateFolder,
  onNavigateFile,
  hideWhenEmpty = false,
  fallbackToStaticChevron = true,
  isStatic,
  className = '',
}: BreadcrumbChevronProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Load child folders
  const subfolders = useMemo((): BreadcrumbFolderItem[] => {
    if (items || isStatic) return [];
    let source = allFolders;
    if (source === undefined && isMounted) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('app_documents_folders');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) source = parsed;
          }
        } catch {}
      }
    }
    const list = Array.isArray(source) ? source : [];
    if (folderId === undefined) return [];
    if (folderId === null) {
      return list.filter((f) => !f.parentId);
    }
    return list.filter((f) => f.parentId === folderId);
  }, [items, isStatic, allFolders, folderId, isMounted]);

  // Load child files
  const subfiles = useMemo((): BreadcrumbFileItem[] => {
    if (items || isStatic) return [];
    let source = allFiles;
    if (source === undefined && isMounted) {
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('app_documents_files');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) source = parsed;
          }
        } catch {}
      }
    }
    const list = Array.isArray(source) ? source : [];
    if (folderId === undefined) return [];
    if (folderId === null) {
      return list.filter((f) => !f.parentId);
    }
    return list.filter((f) => f.parentId === folderId);
  }, [items, isStatic, allFiles, folderId, isMounted]);

  const totalItems = items ? items.length : subfolders.length + subfiles.length;

  if (isStatic || totalItems === 0) {
    if (hideWhenEmpty && !isStatic) {
      return null;
    }
    if (isStatic || fallbackToStaticChevron) {
      return (
        <span className={`w-6 h-6 flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 select-none ${className}`}>
          <ChevronRight size={14} className="stroke-[2]" />
        </span>
      );
    }
    return null;
  }

  return (
    <div ref={containerRef} className={`relative inline-flex items-center justify-center w-6 h-6 shrink-0 ${className}`}>
      {/* Google Style Chevron Dropdown Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title={menuTitle || 'Mở danh sách'}
        className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer select-none ${
          isOpen
            ? 'bg-slate-200/90 dark:bg-[#333333] text-slate-900 dark:text-slate-100'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#2a2a2a]'
        }`}
      >
        <ChevronRight
          size={14}
          className={`stroke-[2] ${isOpen ? 'rotate-90 text-slate-800 dark:text-slate-200' : ''}`}
        />
      </button>

      {/* Windows 11 Address Bar Dropdown Menu (Acrylic Frosted Glass Blur) */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-50 min-w-[200px] max-w-[320px] max-h-[360px] flex flex-col bg-white/95 dark:bg-[#202020]/95 backdrop-blur-xl rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.22)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.7)] border border-slate-200/80 dark:border-white/10 py-1.5 text-xs select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {menuTitle && (
            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none border-b border-slate-200/50 dark:border-white/10 mb-0.5">
              {menuTitle}
            </div>
          )}
          <div className="overflow-y-auto win-scrollbar py-0.5 max-h-[330px]">
            {items ? (
              items.map((item, idx) => {
                if (item.isDivider) {
                  return (
                    <div
                      key={item.id || `divider-${idx}`}
                      className="my-1 border-t border-slate-200/60 dark:border-white/10"
                    />
                  );
                }
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (item.onClick) item.onClick();
                      else if (item.href) router.push(item.href);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-300/60 dark:active:bg-white/15 transition-colors cursor-pointer text-xs rounded-sm ${
                      item.isActive
                        ? 'bg-blue-50/80 text-google-blue font-semibold dark:bg-blue-950/50 dark:text-blue-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {item.icon ? (
                      <span className="shrink-0 flex items-center justify-center">{item.icon}</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
                      </span>
                    )}
                    <span className="truncate flex-1">{item.label || item.name}</span>
                    {item.isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-google-blue shrink-0" />
                    )}
                  </button>
                );
              })
            ) : subfolders.length === 0 && subfiles.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 text-center">
                Thư mục trống
              </div>
            ) : (
              <>
                {subfolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (onNavigateFolder) onNavigateFolder(folder.id);
                      else {
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('app_active_folder_id', folder.id);
                          sessionStorage.setItem('app_active_folder_name', folder.name);
                        }
                        router.push('/app/documents');
                      }
                    }}
                    className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-300/60 dark:active:bg-white/15 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer text-xs"
                  >
                    <Folder size={14} className="text-amber-500 fill-amber-500/20 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}

                {subfiles.length > 0 && subfolders.length > 0 && (
                  <div className="my-1 border-t border-slate-200/40 dark:border-white/10" />
                )}

                {subfiles.map((file) => {
                  const cleanDisplayName = file.name.replace(/\.(docx|pdf|txt|xlsx|doc)$/i, '');
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (onNavigateFile) onNavigateFile(file.id);
                        else router.push(`/app/documents/${file.id}`);
                      }}
                      className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-slate-200/60 dark:hover:bg-white/10 active:bg-slate-300/60 dark:active:bg-white/15 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs"
                    >
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="truncate">{cleanDisplayName}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
