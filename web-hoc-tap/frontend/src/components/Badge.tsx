import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
}) => {
  const variants = {
    default: 'bg-google-hover dark:bg-google-hover-dark text-slate-700 dark:text-slate-300',
    primary: 'bg-google-pill text-google-pill-text dark:bg-google-pill-dark dark:text-google-pill-dark-text',
    success: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
    danger: 'bg-red-100 text-red-900 dark:bg-red-950/60 dark:text-red-300',
    info: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
