import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'compose' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-google-blue text-white rounded-full active:bg-blue-700 dark:active:bg-blue-600 shadow-none hover:bg-blue-600',
    compose:
      'bg-google-pill text-google-pill-text dark:bg-google-pill-dark dark:text-google-pill-dark-text rounded-2xl active:bg-blue-200 dark:active:bg-blue-900 font-semibold shadow-sm hover:shadow-md',
    secondary:
      'bg-google-hover dark:bg-google-hover-dark text-slate-800 dark:text-slate-200 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-700/60 active:bg-slate-300 dark:active:bg-slate-700',
    outline:
      'bg-transparent border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-400 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800/60',
    danger:
      'bg-google-red text-white rounded-full active:bg-red-700 shadow-none',
    success:
      'bg-google-green text-white rounded-full active:bg-green-700 shadow-none',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
