import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  withSearchIcon?: boolean;
}

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const toDateValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDisplayDate = (value: string): string => {
  const date = parseDateValue(value);
  if (!date) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
};

const getCalendarDays = (monthDate: Date): Date[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, placeholder, withSearchIcon, value, defaultValue, onChange, onFocus, onBlur, type, min, max, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = props.id || generatedId;
    const descriptionId = error || helperText ? `${inputId}-description` : undefined;
    const isDateInput = type === 'date';
    const [isFocused, setIsFocused] = useState(false);
    const [hasContent, setHasContent] = useState(Boolean(value ?? defaultValue));
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [internalDate, setInternalDate] = useState(() => String(defaultValue ?? ''));
    const dateWrapperRef = useRef<HTMLDivElement>(null);
    const selectedDateValue = String(value ?? internalDate ?? '');
    const parsedSelectedDate = parseDateValue(selectedDateValue);
    const [viewMonth, setViewMonth] = useState(() => parsedSelectedDate || new Date());

    useEffect(() => {
      if (value !== undefined) {
        setHasContent(value !== null && value !== '');
        if (isDateInput) {
          const nextDate = parseDateValue(String(value));
          if (nextDate) setViewMonth(nextDate);
        }
      }
    }, [isDateInput, value]);

    useEffect(() => {
      if (!isDateOpen) return;

      const handlePointerDown = (event: PointerEvent) => {
        if (!dateWrapperRef.current?.contains(event.target as Node)) {
          setIsDateOpen(false);
          setIsFocused(false);
        }
      };

      document.addEventListener('pointerdown', handlePointerDown);
      return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isDateOpen]);

    const isFloating = isFocused || hasContent || isDateInput || type === 'time' || type === 'datetime-local' || type === 'month' || type === 'week';
    const calendarDays = useMemo(() => getCalendarDays(viewMonth), [viewMonth]);
    const minValue = min === undefined ? undefined : String(min);
    const maxValue = max === undefined ? undefined : String(max);

    const emitDateChange = (nextValue: string) => {
      if (value === undefined) {
        setInternalDate(nextValue);
      }

      setHasContent(nextValue !== '');
      onChange?.({
        target: { value: nextValue },
        currentTarget: { value: nextValue },
      } as React.ChangeEvent<HTMLInputElement>);
    };

    const isDateDisabled = (date: Date): boolean => {
      const dateValue = toDateValue(date);
      return Boolean((minValue && dateValue < minValue) || (maxValue && dateValue > maxValue));
    };

    const commonLabel = label && (
      <label
        htmlFor={inputId}
        className={cn(
          'absolute left-4 pointer-events-none select-none text-sm leading-none font-normal tracking-normal transition-colors duration-150',
          withSearchIcon && 'left-10',
          isFloating ? 'top-[14px] text-[#1D1D1F]' : 'top-1/2 -translate-y-1/2 text-[#6E6E73]',
          isFocused && 'text-[#1D1D1F]',
          error && isFocused && 'text-[#D70015]',
          disabled && 'text-[#6E6E73]'
        )}
      >
        {label}
      </label>
    );

    const inputClassName = cn(
      'peer h-14 w-full px-4 pt-[25.5px] pb-1 bg-white border border-[#D5D5D7] rounded-lg outline-none focus:outline-none focus-visible:outline-none shadow-none transition-colors duration-150 text-sm font-normal text-[#1D1D1F] leading-none',
      isDateInput && 'pr-11 cursor-pointer',
      type === 'date' && !isDateInput && 'pr-3',
      'focus:border-[#0071E3]',
      error && 'border-[#D70015] focus:border-[#D70015]',
      disabled && 'bg-[#F5F5F7] text-[#6E6E73] cursor-not-allowed',
      withSearchIcon && 'pl-10',
      className
    );

    return (
      <div className="w-full" ref={isDateInput ? dateWrapperRef : undefined}>
        <div className="relative">
          {isDateInput ? (
            <>
              <input
                ref={ref}
                id={inputId}
                aria-invalid={Boolean(error)}
                aria-describedby={descriptionId}
                placeholder={placeholder || ' '}
                value={formatDisplayDate(selectedDateValue)}
                readOnly
                disabled={disabled}
                onFocus={(event) => {
                  setIsFocused(true);
                  setIsDateOpen(true);
                  onFocus?.(event);
                }}
                onBlur={onBlur}
                onClick={() => {
                  if (!disabled) {
                    setIsFocused(true);
                    setIsDateOpen(true);
                  }
                }}
                className={inputClassName}
                {...props}
              />
              <CalendarDays className="absolute right-3 top-[34px] h-4 w-4 -translate-y-1/2 pointer-events-none text-[#6E6E73]" />
              {commonLabel}

              {isDateOpen && (
                <div className="absolute z-50 mt-2 w-[292px] rounded-lg border border-[#E5E5EA] bg-white p-3 shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Tháng trước"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#1D1D1F] hover:bg-[#F5F5F7]"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-normal text-[#1D1D1F]">
                      Tháng {viewMonth.getMonth() + 1}, {viewMonth.getFullYear()}
                    </div>
                    <button
                      type="button"
                      aria-label="Tháng sau"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#1D1D1F] hover:bg-[#F5F5F7]"
                      onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[12px] text-[#6E6E73]">
                    {weekDays.map((day) => <div key={day} className="py-1">{day}</div>)}
                  </div>
                  <div className="mt-1 grid grid-cols-7 gap-1">
                    {calendarDays.map((date) => {
                      const dateValue = toDateValue(date);
                      const isSelected = dateValue === selectedDateValue;
                      const isOutsideMonth = date.getMonth() !== viewMonth.getMonth();
                      const dateDisabled = isDateDisabled(date);

                      return (
                        <button
                          key={dateValue}
                          type="button"
                          disabled={dateDisabled}
                          onClick={() => {
                            if (dateDisabled) return;
                            emitDateChange(dateValue);
                            setIsDateOpen(false);
                            setIsFocused(false);
                          }}
                          className={cn(
                            'flex h-8 items-center justify-center rounded-md text-sm font-normal transition-colors',
                            isOutsideMonth ? 'text-[#A1A1A6]' : 'text-[#1D1D1F]',
                            'hover:bg-[#F5F5F7] focus:bg-[#F5F5F7] focus:outline-none',
                            isSelected && 'bg-[#0071E3] text-white hover:bg-[#0071E3]',
                            dateDisabled && 'cursor-not-allowed opacity-35 hover:bg-transparent'
                          )}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <input
                ref={ref}
                id={inputId}
                type={type}
                aria-invalid={Boolean(error)}
                aria-describedby={descriptionId}
                placeholder={placeholder || ' '}
                value={value}
                defaultValue={defaultValue}
                min={min}
                max={max}
                disabled={disabled}
                onFocus={(event) => {
                  setIsFocused(true);
                  onFocus?.(event);
                }}
                onBlur={(event) => {
                  setIsFocused(false);
                  onBlur?.(event);
                }}
                onChange={(event) => {
                  if (value === undefined) {
                    setHasContent(event.target.value !== '');
                  }
                  onChange?.(event);
                }}
                className={inputClassName}
                {...props}
              />
              {commonLabel}
            </>
          )}
        </div>
        {error && <p id={descriptionId} role="alert" className="text-[12px] text-[#D70015] mt-1.5 ml-1">{error}</p>}
        {helperText && !error && <p id={descriptionId} className="text-[12px] text-[#6E6E73] mt-1.5 ml-1">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
