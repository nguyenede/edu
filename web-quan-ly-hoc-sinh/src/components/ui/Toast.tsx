import React from 'react';
import { useToastStore, type ToastType } from '../../store/toastStore';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from './Button';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-[#0071E3]" />,
  error: <XCircle className="w-5 h-5 text-[#D70015]" />,
  warning: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  info: <Info className="w-5 h-5 text-[#0071E3]" />,
};

const borderMap: Record<ToastType, string> = {
  success: 'border-l-[#0071E3]',
  error: 'border-l-[#D70015]',
  warning: 'border-l-orange-500',
  info: 'border-l-[#0071E3]',
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div role="status" aria-live="polite" className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[2000] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto w-[360px] max-w-[calc(100vw-48px)] min-h-[64px] p-4 bg-white border border-[#EDEDF2] border-l-4 shadow-[0_4px_12px_rgba(0,0,0,0.15)] flex items-start gap-3 animate-toast',
            borderMap[toast.type]
          )}
        >
          <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
          <p className="flex-1 text-[15px] text-[#1D1D1F] leading-snug">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Đóng thông báo"
            className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[#6E6E73]" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
