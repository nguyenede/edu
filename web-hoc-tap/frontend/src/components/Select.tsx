'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: string;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Chọn tùy chọn',
  className = '',
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none ${className}`}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 rounded-md border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left focus:outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : isOpen
            ? 'border-google-blue ring-1 ring-google-blue bg-white dark:bg-slate-900 shadow-xs'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <span
          className={`truncate font-medium ${
            selectedOption
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-400'
          }`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        {/* Direction arrow: points right (>) when closed, points down (v) when open */}
        <ChevronRight
          size={15}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-90 text-google-blue' : 'rotate-0'
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-80 overflow-y-auto no-scrollbar rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2 text-xs flex items-center justify-between text-left cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 text-google-blue font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {isSelected && (
                  <Check size={14} className="text-google-blue shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
