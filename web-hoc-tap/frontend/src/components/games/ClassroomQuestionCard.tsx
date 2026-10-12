'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export interface ClassroomOption {
  content: string;
  isCorrect: boolean;
}

export interface ClassroomQuestionItem {
  id: string;
  content: string;
  options: ClassroomOption[];
  explanation?: string;
}

interface ClassroomQuestionCardProps {
  question: ClassroomQuestionItem;
  questionNumber: number;
  totalQuestions: number;
  activeTeamName?: string;
  activeTeamColor?: string;
  answeredOptionIdx: number | null;
  isRevealed: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  onSelectOption: (optionIdx: number) => void;
  onNextQuestion: () => void;
  onOpenQuestionGrid?: () => void;
  isLastQuestion: boolean;
}

export const ClassroomQuestionCard: React.FC<ClassroomQuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  activeTeamName,
  activeTeamColor = 'text-google-blue',
  answeredOptionIdx,
  isRevealed,
  fontSize,
  onSelectOption,
  onNextQuestion,
  onOpenQuestionGrid,
  isLastQuestion,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

  // Font size utilities for projector readability
  const questionTextSize =
    fontSize === 'xlarge'
      ? 'text-xl sm:text-2xl md:text-3xl'
      : fontSize === 'large'
      ? 'text-lg sm:text-xl md:text-2xl'
      : 'text-base sm:text-lg md:text-xl';

  const optionTextSize =
    fontSize === 'xlarge'
      ? 'text-base sm:text-lg md:text-xl'
      : fontSize === 'large'
      ? 'text-sm sm:text-base md:text-lg'
      : 'text-xs sm:text-sm md:text-base';

  const optionLabelSize =
    fontSize === 'xlarge'
      ? 'w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-lg'
      : fontSize === 'large'
      ? 'w-8 h-8 sm:w-9 sm:h-9 text-sm sm:text-base'
      : 'w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm';

  const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const answeredCorrect =
    answeredOptionIdx !== null && Boolean(question.options[answeredOptionIdx]?.isCorrect);

  return (
    <div className="w-full bg-white dark:bg-[#1e1f20] rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col space-y-4">
      {/* Top Meta info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-google-blue/10 text-google-blue dark:text-blue-400 font-bold text-xs uppercase tracking-wide">
            Câu {questionNumber} / {totalQuestions}
          </span>
          {activeTeamName && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-zinc-200">
              <span className={`w-2 h-2 rounded-full ${activeTeamColor}`} />
              <span>Lượt của:</span>
              <span className="font-bold text-slate-900 dark:text-white">{activeTeamName}</span>
            </span>
          )}
        </div>

        {isRevealed && (
          <div className="flex items-center gap-1.5">
            {answeredCorrect ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={14} /> Chính xác!
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                <XCircle size={14} /> Chưa chính xác
              </span>
            )}
          </div>
        )}
      </div>

      {/* QUESTION CONTENT */}
      <div className="py-1">
        <p className={`font-semibold text-slate-900 dark:text-white leading-relaxed text-center sm:text-left ${questionTextSize}`}>
          {question.content}
        </p>
      </div>

      {/* OPTIONS GRID (2 COLUMNS ON DESKTOP, 1 ON MOBILE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 pt-1">
        {(question.options || []).length === 0 ? (
          <div className="col-span-2 p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-xl">
            Không tìm thấy phương án trắc nghiệm cho câu hỏi này.
          </div>
        ) : (
          (question.options || []).map((opt, idx) => {
            const label = OPTION_LABELS[idx] || String(idx + 1);
            const isCorrect = Boolean(opt?.isCorrect);
            const isSelected = answeredOptionIdx === idx;
            const cleanContent = (opt?.content || '').replace(/^[A-F][\s.:)-]+/i, '').trim();

            let btnClasses =
              'bg-slate-50 dark:bg-white/5 border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-zinc-100 hover:border-google-blue hover:bg-slate-100 dark:hover:bg-white/10';
            let labelClasses =
              'bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-zinc-300';

            if (isRevealed) {
              if (isCorrect) {
                btnClasses =
                  'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-400/50 shadow-md scale-101 font-bold';
                labelClasses = 'bg-white text-emerald-700 font-black shadow-xs';
              } else if (isSelected && !isCorrect) {
                btnClasses =
                  'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-400/50 opacity-90 font-bold';
                labelClasses = 'bg-white text-rose-700 font-black shadow-xs';
              } else {
                btnClasses =
                  'opacity-35 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400';
                labelClasses = 'bg-slate-200/50 dark:bg-white/5 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isRevealed}
                onClick={() => onSelectOption(idx)}
                className={`group w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left font-medium transition-all flex items-center gap-3 cursor-pointer shadow-2xs ${btnClasses}`}
              >
                <span
                  className={`rounded-xl flex items-center justify-center font-bold shrink-0 transition-transform group-hover:scale-105 ${labelClasses} ${optionLabelSize}`}
                >
                  {label}
                </span>
                <span className={`flex-1 leading-snug break-words ${optionTextSize}`}>
                  {cleanContent}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* PEDAGOGICAL TEACHING BAR: EXPLANATION + NEXT QUESTION */}
      {isRevealed && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 animate-in fade-in-0 duration-200">
          {/* Explanation Toggle */}
          <div>
            {question.explanation ? (
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors cursor-pointer border border-amber-500/20"
              >
                <BookOpen size={14} />
                <span>{showExplanation ? 'Ẩn lời giải' : '💡 Xem giải thích / Giảng bài'}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Chốt đáp án chính xác cho cả lớp
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {onOpenQuestionGrid && (
              <button
                type="button"
                onClick={onOpenQuestionGrid}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Chọn câu khác
              </button>
            )}

            <button
              type="button"
              onClick={onNextQuestion}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span>{isLastQuestion ? 'Xem kết quả chung cuộc' : 'Câu tiếp theo'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* EXPANDABLE EXPLANATION CARD FOR TEACHERS */}
      {isRevealed && showExplanation && question.explanation && (
        <div className="mt-2 p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm text-slate-800 dark:text-amber-100 leading-relaxed animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300 mb-1">
            <Sparkles size={14} />
            <span>Lời giải & Chốt kiến thức giáo viên:</span>
          </div>
          <p className="whitespace-pre-line">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};
