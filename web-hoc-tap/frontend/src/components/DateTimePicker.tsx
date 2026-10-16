'use client';

import React from 'react';

interface DateTimePickerProps {
  value: string; // ISO string or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
}

const padZero = (n: number) => String(n).padStart(2, '0');

export function formatDateTimeToInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  const h = padZero(date.getHours());
  const min = padZero(date.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function parseDateTimeString(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function formatVietnameseDateTime(date: Date): string {
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeek = dayNames[date.getDay()];
  const d = padZero(date.getDate());
  const m = padZero(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = padZero(date.getHours());
  const min = padZero(date.getMinutes());

  return `${h}:${min} • ${dayOfWeek}, ${d}/${m}/${y}`;
}

function normalizeToInputValue(val: string): string {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) {
    return val;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return formatDateTimeToInputValue(d);
}

export default function DateTimePicker({
  value,
  onChange,
  className = '',
  minDate,
}: DateTimePickerProps) {
  const inputValue = normalizeToInputValue(value);
  const minStr = minDate ? formatDateTimeToInputValue(minDate) : undefined;

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="datetime-local"
        value={inputValue}
        min={minStr}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1b1d] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-google-blue font-sans cursor-pointer transition-colors shadow-2xs"
      />
    </div>
  );
}
