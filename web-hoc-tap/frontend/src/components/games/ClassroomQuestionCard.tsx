import React from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ArrowRight,
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
  return str.replace(/\$+/g, '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim();
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
  onAwardTeamPoint,
  team1Name = 'Đội 1',
  team2Name = 'Đội 2',
  onPrevQuestion,
  onNextQuestion,
  onOpenQuestionGrid,
  isFirstQuestion = false,
  isLastQuestion,
}) => {
  const questionTextSize =
    fontSize === 'xlarge'
      ? 'text-xl sm:text-2xl md:text-3xl'
      : fontSize === 'large'
      ? 'text-lg sm:text-xl md:text-2xl'
      : 'text-base sm:text-lg font-semibold';

  const optionTextSize =
    fontSize === 'xlarge'
      ? 'text-base sm:text-lg md:text-xl'
      : fontSize === 'large'
      ? 'text-sm sm:text-base md:text-lg'
      : 'text-xs sm:text-sm';

  // Đảm bảo không bao giờ có lỗi hiển thị 2 câu cùng xanh (chỉ duy nhất 1 đáp án đúng)
  const sanitizedOptions = React.useMemo(() => {
    const raw = question.options || [];
    const correctIndices: number[] = [];
    raw.forEach((o, i) => {
      if (o?.isCorrect) correctIndices.push(i);
    });

    if (correctIndices.length <= 1) return raw;

    // Nếu dữ liệu bị lỗi gán 2 đáp án cùng đúng:
    // Ưu tiên đáp án mà học sinh vừa chọn (nếu nó nằm trong danh sách đúng) hoặc giữ lại đáp án đúng đầu tiên
    const singleCorrectIdx =
      answeredOptionIdx !== null && correctIndices.includes(answeredOptionIdx)
        ? answeredOptionIdx
        : correctIndices[0];

    return raw.map((o, i) => ({
      ...o,
      isCorrect: i === singleCorrectIdx,
    }));
  }, [question.options, answeredOptionIdx]);

  const answeredCorrect =
    answeredOptionIdx !== null && Boolean(sanitizedOptions[answeredOptionIdx]?.isCorrect);

  return (
    <div className="w-full bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 sm:space-y-5 transition-all h-full flex-1 border border-slate-100 dark:border-white/5 shadow-2xs">
      {/* 1. TOP STATUS BAR: QUESTION INDEX, ACTIVE TURN & FEEDBACK */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-zinc-200 font-bold text-xs">
            Câu {questionNumber} / {totalQuestions}
          </span>

          {activeTeamName && (
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300">
              <span className={`w-2.5 h-2.5 rounded-full ${activeTeamColor} animate-pulse`} />
              <span>Lượt: <b>{activeTeamName}</b></span>
            </span>
          )}
        </div>

        {/* REVEAL STATUS BANNER */}
        {isRevealed && (
          <div className="flex items-center gap-1.5 animate-in fade-in-0 duration-150">
            {answeredCorrect ? (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Chính xác</span>
              </span>
            ) : answeredOptionIdx !== null ? (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl">
                <XCircle size={16} className="text-rose-600 dark:text-rose-400" />
                <span>Chưa đúng</span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* 2. QUESTION PROMPT */}
      <div className="py-2 px-0.5">
        <h2
          className={`font-bold text-slate-900 dark:text-white leading-relaxed tracking-tight ${questionTextSize}`}
        >
          <span className="text-google-blue dark:text-blue-400 mr-2.5 whitespace-nowrap">
            Câu {questionNumber}:
          </span>
          <span>{formatContent(question.content)}</span>
        </h2>
      </div>

      {/* 3. OPTIONS GRID (A, B, C, D) - KHÔNG KHUNG VIỀN CỒNG KỀNH */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-1 flex-1">
        {(sanitizedOptions || []).length === 0 ? (
          <div className="col-span-2 p-8 text-center text-sm text-slate-500 bg-slate-50 dark:bg-white/5 rounded-2xl">
            Không tìm thấy phương án trả lời.
          </div>
        ) : (
          (sanitizedOptions || []).map((opt, idx) => {
            const label = OPTION_LABELS[idx] || String(idx + 1);
            const isCorrect = Boolean(opt?.isCorrect);
            const isSelected = answeredOptionIdx === idx;
            const cleanContent = formatContent((opt?.content || '').replace(/^[A-F][\s.:)-]+/i, ''));

            let itemClass = 'bg-slate-100/70 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-900 dark:text-zinc-100';
            let badgeClass = 'bg-white dark:bg-[#25262b] text-slate-700 dark:text-zinc-300';

            if (isRevealed) {
              if (isCorrect) {
                itemClass = 'bg-emerald-500 text-white font-bold';
                badgeClass = 'bg-white/20 text-white font-bold';
              } else if (isSelected && !isCorrect) {
                itemClass = 'bg-rose-500 text-white font-bold';
                badgeClass = 'bg-white/20 text-white font-bold';
              } else {
                itemClass = 'opacity-35 bg-slate-100/40 dark:bg-white/5 text-slate-400';
                badgeClass = 'bg-slate-200 dark:bg-zinc-800 text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                className={`w-full p-3.5 sm:p-4 rounded-xl text-left font-medium transition-all flex items-center gap-3 sm:gap-3.5 cursor-pointer min-h-[52px] sm:min-h-[58px] ${itemClass}`}
              >
                {/* Minimalist Letter Badge */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${badgeClass}`}
                >
                  {label}
                </div>

                {/* Option Text */}
                <span className={`flex-1 leading-snug break-words tracking-tight ${optionTextSize}`}>
                  {cleanContent}
                </span>

                {/* Status indicator icon on revealed */}
                {isRevealed && isCorrect && (
                  <CheckCircle2 size={18} className="text-white shrink-0" />
                )}
                {isRevealed && isSelected && !isCorrect && (
                  <XCircle size={18} className="text-white shrink-0" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* 4. TEACHER ACTION TOOLBAR (BOTTOM BAR) */}
      <div className="pt-4 flex flex-wrap items-center justify-end gap-3">
        {/* Right Navigation: Prev Question & Next Question */}
        <div className="flex items-center gap-2.5">
          {onPrevQuestion && (
            <button
              type="button"
              disabled={isFirstQuestion}
              onClick={onPrevQuestion}
              className="p-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Câu hỏi trước"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Câu trước</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNextQuestion}
            className="flex items-center gap-2 px-6 sm:px-7 py-2.5 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-sm sm:text-base font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <span>{isLastQuestion ? 'Tổng kết' : 'Câu tiếp theo'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
