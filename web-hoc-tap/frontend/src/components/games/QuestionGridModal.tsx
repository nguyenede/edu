'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Sparkles, HelpCircle } from 'lucide-react';

export interface QuestionStatus {
  index: number;
  status: 'unopened' | 'correct' | 'incorrect';
}

interface QuestionGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionsCount: number;
  currentIndex: number;
  statuses: Record<number, 'unopened' | 'correct' | 'incorrect'>;
  onSelectQuestion: (index: number) => void;
}

export const QuestionGridModal: React.FC<QuestionGridModalProps> = ({
  isOpen,
  onClose,
  questionsCount,
  currentIndex,
  statuses,
  onSelectQuestion,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#202020] rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200/80 dark:border-white/10 animate-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-1 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-google-blue/15 text-google-blue dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              <Sparkles size={15} />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Bảng chọn câu hỏi {questionsCount} câu
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Question Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-[360px] overflow-y-auto win-scrollbar p-1">
          {Array.from({ length: questionsCount }).map((_, idx) => {
            const status = statuses[idx] || 'unopened';
            const isCurrent = currentIndex === idx;

            let cardBg =
              'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:border-google-blue hover:scale-103';
            let icon = null;

            if (status === 'correct') {
              cardBg =
                'bg-emerald-500/15 border-emerald-500/60 text-emerald-800 dark:text-emerald-300 font-bold';
              icon = <Check size={12} className="text-emerald-600 dark:text-emerald-400" />;
            } else if (status === 'incorrect') {
              cardBg =
                'bg-rose-500/15 border-rose-500/60 text-rose-800 dark:text-rose-300 font-bold';
              icon = <X size={12} className="text-rose-600 dark:text-rose-400" />;
            }

            if (isCurrent) {
              cardBg += ' ring-2 ring-google-blue ring-offset-1 dark:ring-offset-black';
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onSelectQuestion(idx);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${cardBg}`}
              >
                <span className="text-xs font-bold leading-none">Câu {idx + 1}</span>
                <div className="mt-1 flex items-center justify-center h-3">
                  {icon ? (
                    icon
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      Chưa mở
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-1 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-white/20" />
            <span>Chưa mở</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Đã đúng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Chưa đúng</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
