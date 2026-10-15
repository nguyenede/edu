'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO string or 'YYYY-MM-DDTHH:mm'
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
}

const DAYS_OF_WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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

  // Check if today or tomorrow
  const today = new Date();
  const isToday =
    today.getDate() === date.getDate() &&
    today.getMonth() === date.getMonth() &&
    today.getFullYear() === date.getFullYear();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow =
    tomorrow.getDate() === date.getDate() &&
    tomorrow.getMonth() === date.getMonth() &&
    tomorrow.getFullYear() === date.getFullYear();

  if (isToday) {
    return `${h}:${min} • Hôm nay (${d}/${m}/${y})`;
  }
  if (isTomorrow) {
    return `${h}:${min} • Ngày mai (${d}/${m}/${y})`;
  }

  return `${h}:${min} • ${dayOfWeek}, ${d}/${m}/${y}`;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày và giờ hạn nộp',
  className = '',
  minDate,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = parseDateTimeString(value);
  const effectiveMinDate = minDate || new Date();
  effectiveMinDate.setHours(0, 0, 0, 0);

  // Month being viewed in calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  // Time state
  const selectedHours = selectedDate ? selectedDate.getHours() : 23;
  const selectedMinutes = selectedDate ? selectedDate.getMinutes() : 59;

  useEffect(() => {
    if (selectedDate) {
      setViewDate(new Date(selectedDate));
    }
  }, [value]);

  // Click outside to close
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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, selectedHours, selectedMinutes, 0);
    onChange(formatDateTimeToInputValue(newDate));
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    baseDate.setHours(hours, minutes, 0, 0);
    onChange(formatDateTimeToInputValue(baseDate));
  };

  const handleApplyPreset = (daysAhead: number, hours: number = 23, minutes: number = 59) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    target.setHours(hours, minutes, 0, 0);
    onChange(formatDateTimeToInputValue(target));
    setViewDate(new Date(target));
  };

  const handleApplyWeekend = () => {
    const target = new Date();
    const currentDay = target.getDay(); // 0 is Sunday
    const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay;
    target.setDate(target.getDate() + daysUntilSunday);
    target.setHours(23, 59, 0, 0);
    onChange(formatDateTimeToInputValue(target));
    setViewDate(new Date(target));
  };

  // Calendar generation
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // In Vietnam, Monday is index 0. (Sunday is 6)
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendarDays: Array<{
    day: number;
    isCurrentMonth: boolean;
    isPast: boolean;
    isSelected: boolean;
    isToday: boolean;
  }> = [];

  // Prev month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i;
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      isPast: true,
      isSelected: false,
      isToday: false,
    });
  }

  // Current month days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= daysInMonth; i++) {
    const dObj = new Date(year, month, i);
    dObj.setHours(0, 0, 0, 0);

    const isPast = dObj.getTime() < today.getTime();
    const isToday = dObj.getTime() === today.getTime();
    const isSelected = Boolean(
      selectedDate &&
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === i
    );

    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      isPast,
      isSelected,
      isToday,
    });
  }

  // Next month padding days to complete grid (42 days or 35 days)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      isPast: false,
      isSelected: false,
      isToday: false,
    });
  }

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button - Completely clean, no dashed placeholder */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between hover:border-google-blue dark:hover:border-google-blue transition-colors focus:outline-none focus:ring-1 focus:ring-google-blue"
      >
        <div className="flex items-center gap-2 truncate">
          <Calendar size={15} className="text-google-blue shrink-0" />
          <span className={selectedDate ? 'text-slate-900 dark:text-slate-100 font-semibold truncate' : 'text-slate-400 truncate'}>
            {selectedDate ? formatVietnameseDateTime(selectedDate) : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover / Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[330px] p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Gợi ý nhanh
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(1)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-google-blue dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors"
              >
                +1 ngày (23:59)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(3)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-google-blue dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors"
              >
                +3 ngày
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(7)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-google-blue dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors"
              >
                +1 tuần
              </button>
              <button
                type="button"
                onClick={handleApplyWeekend}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-google-blue dark:hover:bg-blue-950/60 dark:hover:text-blue-300 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cuối tuần
              </button>
            </div>
          </div>

          {/* Calendar Header: Month & Year with Navigation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Tháng {month + 1}, {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                title="Tháng sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((cDay, idx) => {
              if (!cDay.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-8 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 cursor-default"
                  >
                    {cDay.day}
                  </div>
                );
              }

              if (cDay.isPast) {
                return (
                  <div
                    key={idx}
                    className="h-8 flex items-center justify-center text-[11px] text-slate-300 dark:text-slate-700 cursor-not-allowed line-through"
                    title="Ngày đã qua"
                  >
                    {cDay.day}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDay(cDay.day)}
                  className={`h-8 rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${
                    cDay.isSelected
                      ? 'bg-google-blue text-white shadow-xs'
                      : cDay.isToday
                      ? 'border border-google-blue text-google-blue hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {cDay.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                Giờ nộp bài
              </span>
              <div className="flex items-center gap-1.5">
                {/* Giờ */}
                <select
                  value={selectedHours}
                  onChange={(e) => handleTimeChange(Number(e.target.value), selectedMinutes)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-google-blue cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {padZero(h)} giờ
                    </option>
                  ))}
                </select>
                <span className="text-xs font-bold text-slate-400">:</span>
                {/* Phút */}
                <select
                  value={selectedMinutes}
                  onChange={(e) => handleTimeChange(selectedHours, Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-google-blue cursor-pointer"
                >
                  {[0, 15, 30, 45, 50, 55, 59].map((m) => (
                    <option key={m} value={m}>
                      {padZero(m)} phút
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Shortcuts */}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              {[
                { label: '23:59', h: 23, m: 59 },
                { label: '22:00', h: 22, m: 0 },
                { label: '18:00', h: 18, m: 0 },
                { label: '12:00', h: 12, m: 0 },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleTimeChange(t.h, t.m)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    selectedHours === t.h && selectedMinutes === t.m
                      ? 'bg-blue-100 text-google-blue dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-google-blue hover:bg-[#1557b0] text-white text-xs font-bold transition-colors shadow-xs"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
