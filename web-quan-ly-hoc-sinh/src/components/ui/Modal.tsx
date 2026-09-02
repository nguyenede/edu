import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { lockPageScroll } from '../../lib/scrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const titleId = React.useId();
  useEffect(() => {
    if (isOpen) {
      const unlockScroll = lockPageScroll();
      const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
      document.addEventListener('keydown', closeOnEscape);
      return () => {
        document.removeEventListener('keydown', closeOnEscape);
        unlockScroll();
      };
    }

    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative bg-white w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-[#EDEDF2] flex items-center justify-between">
          <h3 id={titleId} className="text-xl font-semibold text-[#1D1D1F] font-display">{title}</h3>
          <button 
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="p-2 hover:bg-[#F5F5F7] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#6E6E73]" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-6.5rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
