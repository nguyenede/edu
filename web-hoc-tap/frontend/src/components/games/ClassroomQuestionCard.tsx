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
  Award,
  Layers,
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

const formatContent = (str?: string) => {
  if (!str) return '';
  return str.replace(/^\$+|\$+$/g, '').trim();
};

const OPTION_SHAPES = [
  { label: 'A', symbol: '▲', color: 'rose' },
  { label: 'B', symbol: '◆', color: 'blue' },
  { label: 'C', symbol: '●', color: 'amber' },
  { label: 'D', symbol: '■', color: 'emerald' },
  { label: 'E', symbol: '★', color: 'purple' },
  { label: 'F', symbol: '✦', color: 'cyan' },
];

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

  // Font size utilities for projector and interactive screens
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

  const answeredCorrect =
    answeredOptionIdx !== null && Boolean(question.options[answeredOptionIdx]?.isCorrect);

  return (
    <div className="w-full bg-white dark:bg-[#1a1b1e] rounded-3xl p-4 sm:p-7 border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col space-y-5 transition-all">
      {/* 1. TOP HEADER: QUESTION BADGE, ACTIVE TURN & FEEDBACK */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-xs">
            <Sparkles size={13} className="text-amber-300" />
            <span>Câu {questionNumber} / {totalQuestions}</span>
          </span>

          {activeTeamName && (
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200 shadow-2xs">
              <span className={`w-2.5 h-2.5 rounded-full ${activeTeamColor} animate-pulse`} />
              <span>Lượt của:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{activeTeamName}</span>
            </span>
          )}
        </div>

        {/* REVEAL STATUS BANNER */}
        {isRevealed && (
          <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
            {answeredCorrect ? (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 rounded-full shadow-md animate-bounce">
                <CheckCircle2 size={16} /> Chính xác! (+10đ)
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-rose-600 to-red-600 px-3.5 py-1.5 rounded-full shadow-md">
                <XCircle size={16} /> Chưa chính xác!
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. QUESTION PROMPT */}
      <div className="py-2 px-1">
        <h2
          className={`font-extrabold text-slate-900 dark:text-white leading-relaxed text-center sm:text-left tracking-tight ${questionTextSize}`}
        >
          {formatContent(question.content)}
        </h2>
      </div>

      {/* 3. 4 COLOR-THEMED ARCADE OPTIONS GRID (A, B, C, D) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
        {(question.options || []).length === 0 ? (
          <div className="col-span-2 p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/10">
            Không tìm thấy phương án trắc nghiệm cho câu hỏi này.
          </div>
        ) : (
          (question.options || []).map((opt, idx) => {
            const shapeInfo = OPTION_SHAPES[idx] || { label: String(idx + 1), symbol: '●', color: 'blue' };
            const isCorrect = Boolean(opt?.isCorrect);
            const isSelected = answeredOptionIdx === idx;
            const cleanContent = formatContent((opt?.content || '').replace(/^[A-F][\s.:)-]+/i, ''));

            // Default Color Schemes for Options A, B, C, D
            let cardClasses = '';
            let badgeClasses = '';

            if (idx === 0) {
              // A: ROSE / CRIMSON
              cardClasses =
                'bg-rose-50/70 hover:bg-rose-100/90 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-200/90 dark:border-rose-900/60 border-b-4 border-b-rose-300 dark:border-b-rose-800 text-slate-900 dark:text-zinc-100 hover:border-b-rose-400';
              badgeClasses = 'bg-rose-500 text-white shadow-xs';
            } else if (idx === 1) {
              // B: ROYAL BLUE
              cardClasses =
                'bg-blue-50/70 hover:bg-blue-100/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/90 dark:border-blue-900/60 border-b-4 border-b-blue-300 dark:border-b-blue-800 text-slate-900 dark:text-zinc-100 hover:border-b-blue-400';
              badgeClasses = 'bg-blue-600 text-white shadow-xs';
            } else if (idx === 2) {
              // C: WARM AMBER / GOLD
              cardClasses =
                'bg-amber-50/70 hover:bg-amber-100/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-200/90 dark:border-amber-900/60 border-b-4 border-b-amber-300 dark:border-b-amber-800 text-slate-900 dark:text-zinc-100 hover:border-b-amber-400';
              badgeClasses = 'bg-amber-500 text-white shadow-xs';
            } else {
              // D: VIVID EMERALD
              cardClasses =
                'bg-emerald-50/70 hover:bg-emerald-100/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-900/60 border-b-4 border-b-emerald-300 dark:border-b-emerald-800 text-slate-900 dark:text-zinc-100 hover:border-b-emerald-400';
              badgeClasses = 'bg-emerald-600 text-white shadow-xs';
            }

            // Reveal States Override
            if (isRevealed) {
              if (isCorrect) {
                cardClasses =
                  'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-600 border-b-4 border-b-emerald-700 ring-4 ring-emerald-400/40 shadow-lg scale-[1.01] font-bold';
                badgeClasses = 'bg-white text-emerald-700 font-black shadow-sm';
              } else if (isSelected && !isCorrect) {
                cardClasses =
                  'bg-gradient-to-r from-rose-500 to-red-500 text-white border-rose-600 border-b-4 border-b-rose-700 shadow-md opacity-95 font-bold';
                badgeClasses = 'bg-white text-rose-700 font-black shadow-sm';
              } else {
                cardClasses =
                  'opacity-35 bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 border-b-2 text-slate-400';
                badgeClasses = 'bg-slate-200 dark:bg-zinc-800 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isRevealed}
                onClick={() => onSelectOption(idx)}
                className={`group w-full p-4 sm:p-5 rounded-2xl border text-left font-semibold transition-all flex items-center gap-3.5 cursor-pointer shadow-sm active:translate-y-1 active:border-b-0 ${cardClasses}`}
              >
                {/* 3D Shape Badge (A, B, C, D) */}
                <div
                  className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black shrink-0 transition-transform group-hover:scale-105 ${badgeClasses}`}
                >
                  <span className="text-sm sm:text-base font-extrabold flex items-center gap-0.5">
                    {shapeInfo.label}
                  </span>
                </div>

                {/* Option Text */}
                <span className={`flex-1 leading-snug break-words tracking-tight ${optionTextSize}`}>
                  {cleanContent}
                </span>

                {/* Status indicator icon on revealed */}
                {isRevealed && isCorrect && (
                  <CheckCircle2 size={24} className="text-white shrink-0 animate-in zoom-in-50" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle size={24} className="text-white shrink-0 animate-in zoom-in-50" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 4. BOTTOM BAR: PEDAGOGICAL ACTIONS & ADVANCE */}
      {isRevealed && (
        <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 animate-in fade-in-0 duration-200">
          {/* Explanation Toggle */}
          <div>
            {question.explanation ? (
              <button
                type="button"
                onClick={() => setShowExplanation(!showExplanation)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-bold transition-all cursor-pointer border border-amber-500/20 shadow-2xs active:scale-95"
              >
                <BookOpen size={15} />
                <span>{showExplanation ? 'Ẩn lời giải' : '💡 Xem giải thích / Giảng bài'}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                Đáp án chính xác đã được hiển thị trên bảng
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {onOpenQuestionGrid && (
              <button
                type="button"
                onClick={onOpenQuestionGrid}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Chọn câu khác
              </button>
            )}

            <button
              type="button"
              onClick={onNextQuestion}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <span>{isLastQuestion ? 'Xem kết quả chung cuộc 🏆' : 'Câu tiếp theo'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 5. EXPANDABLE TEACHER EXPLANATION CARD */}
      {isRevealed && showExplanation && question.explanation && (
        <div className="mt-2 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs sm:text-sm text-slate-800 dark:text-amber-100 leading-relaxed animate-in slide-in-from-top-2 duration-150 shadow-inner">
          <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300 mb-1.5">
            <Sparkles size={16} className="text-amber-500" />
            <span>Lời giải & Chốt kiến thức giáo viên:</span>
          </div>
          <p className="whitespace-pre-line leading-relaxed font-medium">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};
