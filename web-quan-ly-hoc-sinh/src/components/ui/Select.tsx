import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './Button';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
  containerClassName?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const getOptionText = (children: React.ReactNode): string => {
  return React.Children.toArray(children)
    .map((child) => (typeof child === 'string' || typeof child === 'number' ? String(child) : ''))
    .join('');
};

const getOptions = (children: React.ReactNode): SelectOption[] => {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return [];
    if (child.type !== 'option') return [];

    const optionValue = child.props.value;
    return [{
      value: optionValue === undefined ? getOptionText(child.props.children) : String(optionValue),
      label: getOptionText(child.props.children),
      disabled: child.props.disabled,
    }];
  });
};

const Select: React.FC<SelectProps> = ({
  className,
  label,
  error,
  children,
  containerClassName,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  disabled,
  required,
  name,
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => getOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const [internalValue, setInternalValue] = useState(() => String(value ?? defaultValue ?? ''));
  const selectedValue = String(value ?? internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue);
  const hasValue = selectedValue !== '';
  const hasLabel = Boolean(label);
  const isFloating = focused || open || hasValue;
  const ariaLabel = props['aria-label'];

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(String(value ?? ''));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setFocused(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDropdownPosition(null);
      return undefined;
    }

    const updateDropdownPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportPadding = 16;
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const maxHeight = Math.min(256, Math.max(160, Math.max(spaceBelow, spaceAbove)));
      const shouldOpenAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
      const top = shouldOpenAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding)
      );

      setDropdownPosition({
        top,
        left,
        width: rect.width,
        maxHeight,
      });
    };

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open]);

  const emitChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  const selectOption = (option: SelectOption) => {
    if (option.disabled || disabled) return;
    emitChange(option.value);
    setOpen(false);
    setFocused(false);
  };

  return (
    <div className={cn('w-full', containerClassName)} ref={wrapperRef}>
      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={selectedValue}
          required={required}
          disabled={disabled}
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={() => undefined}
          {...props}
        >
          {children}
        </select>

        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={hasLabel ? undefined : ariaLabel}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${selectId}-error` : undefined}
          disabled={disabled}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
          }}
          onBlur={(event) => {
            onBlur?.(event as unknown as React.FocusEvent<HTMLSelectElement>);
          }}
          onClick={() => {
            if (!disabled) {
              setFocused(true);
              setOpen((current) => !current);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false);
              setFocused(false);
            }
          }}
          className={cn(
            'peer w-full bg-white border border-[#D5D5D7] rounded-lg outline-none focus:outline-none focus-visible:outline-none shadow-none transition-colors duration-150 text-sm font-normal text-left text-[#1D1D1F]',
            hasLabel ? 'h-14 px-4 pt-[25.5px] pb-1' : 'h-10 px-3 py-0',
            'focus:border-[#0071E3]',
            error && 'border-[#D70015] focus:border-[#D70015]',
            disabled && 'bg-[#F5F5F7] text-[#6E6E73] cursor-not-allowed',
            !hasValue && 'text-[#6E6E73]',
            className
          )}
        >
          <span className="block truncate pr-8 leading-none">{hasValue ? selectedOption?.label : ''}</span>
        </button>

        <ChevronDown
          className={cn(
            'absolute right-3 h-4 w-4 -translate-y-1/2 pointer-events-none text-[#6E6E73] transition-transform duration-150',
            hasLabel ? 'top-[34px]' : 'top-1/2',
            open && 'rotate-180 text-[#1D1D1F]'
          )}
        />

        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'absolute left-4 pointer-events-none select-none text-sm leading-none font-normal tracking-normal transition-colors duration-150',
              isFloating ? 'top-[14px] text-[#1D1D1F]' : 'top-1/2 -translate-y-1/2 text-[#6E6E73]',
              focused && 'text-[#1D1D1F]',
              error && focused && 'text-[#D70015]',
              disabled && 'text-[#6E6E73]'
            )}
          >
            {label}
          </label>
        )}

        {open && dropdownPosition && createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            aria-labelledby={selectId}
            className="fixed z-[70] overflow-y-auto rounded-lg border border-[#E5E5EA] bg-white p-1 shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: dropdownPosition.maxHeight,
            }}
          >
            {options.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                role="option"
                aria-selected={option.value === selectedValue}
                disabled={option.disabled}
                onClick={() => selectOption(option)}
                className={cn(
                  'flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm font-normal text-[#1D1D1F] transition-colors',
                  'hover:bg-[#F5F5F7] focus:bg-[#F5F5F7] focus:outline-none',
                  option.value === selectedValue && 'bg-[#EAF3FF] text-[#0071E3]',
                  option.disabled && 'cursor-not-allowed opacity-45'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {option.value === selectedValue && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
      {error && <p id={`${selectId}-error`} role="alert" className="text-[12px] text-[#D70015] mt-1.5 ml-1">{error}</p>}
    </div>
  );
};

export default Select;
