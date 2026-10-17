'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T = string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
}

export function CustomSelect<T extends string | number>({
  value,
  onChange,
  options,
  placeholder = 'Chọn tùy chọn',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  disabled = false,
  size = 'md',
  id,
  name,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl min-h-[34px]',
    md: 'px-3.5 py-2.5 text-sm rounded-xl min-h-[42px]',
    lg: 'px-4 py-3 text-base rounded-2xl min-h-[48px]',
  }[size];

  const itemSizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-3.5 py-2.5 text-sm rounded-xl',
    lg: 'px-4 py-2.5 text-base rounded-xl',
  }[size];

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none ${className}`}
    >
      {/* Hidden input for form submission compatibility */}
      {name && <input type="hidden" name={name} value={String(value ?? '')} />}

      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full border flex items-center justify-between gap-2 transition-all cursor-pointer text-left focus:outline-none ${sizeStyles} ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
            : isOpen
            ? 'border-google-blue/60 dark:border-blue-500/80 bg-white dark:bg-[#1e1f20] ring-2 ring-google-blue/15 shadow-xs'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e1f20] hover:border-slate-300 dark:hover:border-slate-600'
        } ${triggerClassName}`}
      >
        <span
          className={`font-normal break-words text-left truncate flex items-center gap-2 ${
            selectedOption
              ? 'text-slate-900 dark:text-slate-100'
              : 'text-slate-400'
          }`}
        >
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>

        {/* Direction arrow: flips 180deg when open */}
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-180 text-slate-600 dark:text-slate-300' : 'rotate-0'
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          className={`absolute z-50 left-0 min-w-full w-max max-w-sm mt-1.5 max-h-72 overflow-y-auto win-scrollbar rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-[#1e1f20] shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-slate-400 text-center">
              Không có tùy chọn
            </div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              const isOptDisabled = option.disabled;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  disabled={isOptDisabled}
                  aria-selected={isSelected}
                  onClick={() => {
                    if (!isOptDisabled) {
                      onChange(option.value);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between text-left transition-colors ${itemSizeStyles} ${
                    isOptDisabled
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : isSelected
                      ? 'text-slate-900 dark:text-slate-100 font-normal bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
                  }`}
                >
                  <span className="pr-2 break-words text-left flex items-center gap-2 min-w-0">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </span>
                  {isSelected && (
                    <Check size={size === 'sm' ? 14 : 16} className="text-google-blue dark:text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export const Select = CustomSelect;
export default CustomSelect;
