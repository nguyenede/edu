import React, { useEffect } from 'react';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';
import { lockPageScroll } from '../../lib/scrollLock';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  isLoading = false,
}) => {
  const titleId = React.useId();
  const descriptionId = React.useId();

  useEffect(() => {
    if (!isOpen) return;

    const unlockScroll = lockPageScroll();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockScroll();
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Đóng hộp thoại xác nhận"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-5">
            <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-[#D70015]' : 'text-[#0071E3]'}`} />
          </div>
          <h3 id={titleId} className="text-xl font-semibold text-[#1D1D1F] font-display">{title}</h3>
          {description && (
            <p id={descriptionId} className="mt-2 text-[15px] text-[#6E6E73] leading-relaxed">{description}</p>
          )}
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <Button autoFocus variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            className="flex-1"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
