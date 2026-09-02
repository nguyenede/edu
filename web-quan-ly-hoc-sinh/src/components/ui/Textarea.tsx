import React, { useEffect, useState } from 'react';
import { cn } from './Button';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, placeholder, value, defaultValue, onChange, onFocus, onBlur, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = props.id || generatedId;
    const [isFocused, setIsFocused] = useState(false);
    const [hasContent, setHasContent] = useState(Boolean(value ?? defaultValue));

    useEffect(() => {
      if (value !== undefined) {
        setHasContent(value !== null && value !== '');
      }
    }, [value]);

    const isFloating = isFocused || hasContent;

    return (
      <div className="w-full">
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${textareaId}-error` : undefined}
            placeholder={placeholder || ' '}
            value={value}
            defaultValue={defaultValue}
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
            className={cn(
              'peer min-h-[100px] w-full px-4 pt-[25.5px] pb-1 bg-white border border-[#D5D5D7] rounded-lg outline-none focus:outline-none focus-visible:outline-none shadow-none transition-colors duration-150 text-sm font-normal text-[#1D1D1F] resize-y',
              'focus:border-[#0071E3]',
              error && 'border-[#D70015] focus:border-[#D70015]',
              'disabled:bg-[#F5F5F7] disabled:text-[#6E6E73]',
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={textareaId}
              className={cn(
              'absolute left-4 pointer-events-none select-none text-sm leading-none font-normal tracking-normal transition-colors duration-150',
              isFloating
                  ? 'top-[14px] text-[#1D1D1F]'
                  : 'top-1/2 -translate-y-1/2 text-[#6E6E73]',
                isFocused && 'text-[#1D1D1F]',
                error && isFocused && 'text-[#D70015]',
                props.disabled && 'text-[#6E6E73]'
              )}
            >
              {label}
            </label>
          )}
        </div>
        {error && <p id={`${textareaId}-error`} role="alert" className="text-[12px] text-[#D70015] mt-1.5 ml-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
