'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  BookOpen,
  Award,
  Eye,
  EyeOff,
  Plus,
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
  onManualReveal?: () => void;
  onAwardTeamPoint?: (teamId: 'team1' | 'team2') => void;
  team1Name?: string;
  team2Name?: string;
  onPrevQuestion?: () => void;
  onNextQuestion: () => void;
  onOpenQuestionGrid?: () => void;
  isFirstQuestion?: boolean;
  isLastQuestion: boolean;
}

const formatContent = (str?: string) => {
  if (!str) return '';
  return str.replace(/^\$+|\$+$/g, '').trim();
};

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const ClassroomQuestionCard: React.FC<ClassroomQuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  activeTeamName,
  activeTeamColor = 'bg-blue-600',
  answeredOptionIdx,
  isRevealed,
  fontSize,
  onSelectOption,
  onManualReveal,
  onAwardTeamPoint,
  team1Name = 'Đội 1',
  team2Name = 'Đội 2',
  onPrevQuestion,
  onNextQuestion,
  onOpenQuestionGrid,
  isFirstQuestion = false,
  isLastQuestion,
}) => {
  const [showExplanation, setShowExplanation] = useState(false);

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
    <div className="w-full bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-4 transition-all h-full">
      {/* 1. TOP STATUS BAR: QUESTION INDEX, ACTIVE TURN & FEEDBACK */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-zinc-200 font-bold text-xs">
            Câu {questionNumber} / {totalQuestions}
          </span>

          {activeTeamName && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <span className={`w-2 h-2 rounded-full ${activeTeamColor} animate-pulse`} />
              <span>Lượt: <b className="font-bold">{activeTeamName}</b></span>
            </span>
          )}
        </div>

        {/* REVEAL STATUS BANNER */}
        {isRevealed && (
          <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150">
            {answeredCorrect ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>Chính xác</span>
              </span>
            ) : answeredOptionIdx !== null ? (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                <XCircle size={14} className="text-rose-600 dark:text-rose-400" />
                <span>Chưa đúng</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                <Eye size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Đáp án mở</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. QUESTION PROMPT */}
      <div className="py-2 px-0.5">
        <h2
          className={`font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight ${questionTextSize}`}
        >
          {formatContent(question.content)}
        </h2>
      </div>

      {/* 3. MINIMALIST OPTIONS GRID (A, B, C, D) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
        {(question.options || []).length === 0 ? (
          <div className="col-span-2 p-5 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
            Không tìm thấy phương án trả lời.
          </div>
        ) : (
          (question.options || []).map((opt, idx) => {
            const label = OPTION_LABELS[idx] || String(idx + 1);
            const isCorrect = Boolean(opt?.isCorrect);
            const isSelected = answeredOptionIdx === idx;
            const cleanContent = formatContent((opt?.content || '').replace(/^[A-F][\s.:)-]+/i, ''));

            let itemClass = 'bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-zinc-100';
            let badgeClass = 'bg-white dark:bg-[#25262b] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10';

            if (isRevealed) {
              if (isCorrect) {
                itemClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30 font-bold';
                badgeClass = 'bg-emerald-600 text-white font-bold border-transparent';
              } else if (isSelected && !isCorrect) {
                itemClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500/30';
                badgeClass = 'bg-rose-600 text-white font-bold border-transparent';
              } else {
                itemClass = 'opacity-40 bg-slate-50/40 dark:bg-white/5 border-slate-200/50 dark:border-white/5 text-slate-400';
                badgeClass = 'bg-slate-200 dark:bg-zinc-800 text-slate-400 border-transparent';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                className={`w-full p-3 sm:p-4 rounded-xl border text-left font-medium transition-all flex items-center gap-3 cursor-pointer shadow-2xs ${itemClass}`}
              >
                {/* Minimalist Letter Badge */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${badgeClass}`}
                >
                  {label}
                </div>

                {/* Option Text */}
                <span className={`flex-1 leading-snug break-words tracking-tight ${optionTextSize}`}>
                  {cleanContent}
                </span>

                {/* Status indicator icon on revealed */}
                {isRevealed && isCorrect && (
                  <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 4. EXPANDABLE TEACHER EXPLANATION BOX */}
      {showExplanation && question.explanation && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs sm:text-sm text-slate-800 dark:text-amber-100 leading-relaxed animate-in fade-in-0 duration-150">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 mb-1">
            <Sparkles size={14} className="text-amber-500" />
            <span>Lời giải & Chốt kiến thức:</span>
          </div>
          <p className="whitespace-pre-line font-medium leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {/* 5. TEACHER ACTION TOOLBAR (BOTTOM BAR) */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Actions: Reveal Answer & Explanation */}
        <div className="flex items-center gap-2">
          {onManualReveal && (
            <button
              type="button"
              onClick={onManualReveal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isRevealed
                  ? 'bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-200'
                  : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-google-blue dark:text-blue-300 hover:bg-blue-100'
              }`}
              title="Hiện đáp án đúng của câu này"
            >
              {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{isRevealed ? 'Đã mở đáp án' : 'Hiện đáp án 👁️'}</span>
            </button>
          )}

          {question.explanation && (
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer border border-amber-200 dark:border-amber-800"
            >
              <BookOpen size={13} />
              <span>{showExplanation ? 'Ẩn lời giải' : 'Giải thích 💡'}</span>
            </button>
          )}

          {/* Award Points for Teams Directly */}
          {onAwardTeamPoint && (
            <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => onAwardTeamPoint('team1')}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all cursor-pointer border border-blue-200/80 dark:border-blue-800/60"
                title={`Cộng 1 điểm cho ${team1Name}`}
              >
                +1 {team1Name}
              </button>
              <button
                type="button"
                onClick={() => onAwardTeamPoint('team2')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer border border-rose-200/80 dark:border-rose-800/60"
                title={`Cộng 1 điểm cho ${team2Name}`}
              >
                +1 {team2Name}
              </button>
            </div>
          )}
        </div>

        {/* Right Navigation: Prev Question & Next Question */}
        <div className="flex items-center gap-2">
          {onPrevQuestion && (
            <button
              type="button"
              disabled={isFirstQuestion}
              onClick={onPrevQuestion}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
              title="Câu hỏi trước"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Câu trước</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNextQuestion}
            className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <span>{isLastQuestion ? 'Tổng kết 🏆' : 'Câu tiếp theo'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
