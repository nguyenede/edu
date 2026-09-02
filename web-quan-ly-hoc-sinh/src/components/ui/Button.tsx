import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#0071E3] text-white hover:bg-[#006EDB] active:bg-[#0076DF] disabled:opacity-45',
      secondary: 'bg-[#EDEDF2] text-[#1D1D1F] hover:bg-[#E5E5EA] active:bg-[#D1D1D6]',
      ghost: 'bg-transparent text-[#1D1D1F] hover:bg-black/5 active:bg-black/10',
      outline: 'bg-transparent border-2 border-[#0071E3] text-[#0071E3] hover:bg-[#0071E3]/5 active:bg-[#0071E3]/10',
      danger: 'bg-[#D70015] text-white hover:bg-[#C30010] active:bg-[#B1000C]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-full',
      md: 'h-11 px-6 text-[17px] rounded-full',
      lg: 'h-13 px-8 text-[19px] rounded-full',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-normal transition-all duration-150 active:scale-[0.99] disabled:active:scale-100 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Đang tải...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
export { cn };
