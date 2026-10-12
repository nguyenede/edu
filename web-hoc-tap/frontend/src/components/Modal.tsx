'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isOpen) {
      setIsMounted(true);
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setIsMounted(false);
      }, 200);
    }
    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '3xl': 'max-w-4xl',
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 transition-opacity duration-200 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Full-screen Dark Overlay Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs select-none transition-opacity duration-200 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Material You Modal Dialog */}
      <div
        className={`relative z-10 w-full ${maxWidths[maxWidth]} bg-white dark:bg-[#1e1f20] border border-slate-200/60 dark:border-[#2d2f31] rounded-3xl p-4 text-left flex flex-col gap-2 shadow-2xl my-auto transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          isVisible
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-95 opacity-0 translate-y-2'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-normal text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-[#2d2f31] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
};
