import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  pill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, pill = false, className = '', type = 'text', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={`w-full px-4 py-2.5 bg-google-input dark:bg-google-input-dark border border-slate-200/60 dark:border-transparent text-slate-900 dark:text-slate-100 ${
            pill ? 'rounded-full' : 'rounded-xl'
          } text-sm outline-none focus:outline-none focus:ring-0 focus:border-slate-200/60 dark:focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 transition-colors ${className}`}
          {...props}
        />
        {error && (
          <span className="text-xs text-google-red font-medium">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
