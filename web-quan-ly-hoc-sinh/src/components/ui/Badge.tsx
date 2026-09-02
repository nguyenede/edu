import React from 'react';
import { cn } from './Button';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'admin' | 'teacher' | 'student' | 'parent' | 'active' | 'inactive' | 'success' | 'warning' | 'error';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'active', className }) => {
  const variants = {
    admin: 'bg-[#0071E3]/10 text-[#0071E3]',
    teacher: 'bg-[#1D1D1F]/8 text-[#1D1D1F]',
    student: 'bg-[#6E6E73]/12 text-[#333336]',
    parent: 'bg-black/5 text-[#333336]',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    success: 'bg-[#0071E3]/10 text-[#0071E3]',
    warning: 'bg-orange-100 text-orange-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center h-7 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

export default Badge;
