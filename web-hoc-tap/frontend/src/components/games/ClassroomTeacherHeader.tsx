'use client';

import React from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
  Gamepad2,
  Sparkles,
  Pause,
  Play,
  Shuffle,
  ListOrdered,
  Plus,
  Minus,
  Type,
} from 'lucide-react';

export interface ClassroomTeam {
  id: string;
  name: string;
  score: number;
  color: string;
  borderColor: string;
  bgLight: string;
}

interface ClassroomTeacherHeaderProps {
  title: string;
  gameShortName?: string;
  teams: ClassroomTeam[];
  activeTeamId: string | null;
  onSelectActiveTeam?: (teamId: string) => void;
  onAdjustScore?: (teamId: string, delta: number) => void;
  timerSeconds?: number | null;
  isTimerPaused?: boolean;
  onTogglePauseTimer?: () => void;
  onAddSeconds?: (delta: number) => void;
  currentIndex?: number;
  totalQuestions?: number;
  onOpenQuestionGrid?: () => void;
  onOpenStudentPicker?: () => void;
  fontSize?: 'normal' | 'large' | 'xlarge';
  onChangeFontSize?: (size: 'normal' | 'large' | 'xlarge') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onBack: () => void;
  onRestart: () => void;
  onOpenSettings?: () => void;
}

export const ClassroomTeacherHeader: React.FC<ClassroomTeacherHeaderProps> = ({
  title,
  gameShortName,
  teams,
  activeTeamId,
  onSelectActiveTeam,
  onAdjustScore,
  timerSeconds,
  isTimerPaused,
  onTogglePauseTimer,
  onAddSeconds,
  currentIndex,
  totalQuestions,
  onOpenQuestionGrid,
  onOpenStudentPicker,
  fontSize,
  onChangeFontSize,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  onRestart,
}) => {
  return (
    <div className="w-full bg-white dark:bg-[#1a1b1e] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 select-none transition-colors">
      {/* 1. LEFT: BACK BUTTON, GAME TITLE & QUESTION PROGRESS */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
          title="Quay lại danh mục trò chơi"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {gameShortName || title}
            </span>
            {currentIndex !== undefined && totalQuestions !== undefined && (
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                Câu hỏi {currentIndex + 1} / {totalQuestions}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. CENTER: TEAM SCORES WITH QUICK (+1 / -1) CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {teams.map((team, idx) => {
          const isActive = activeTeamId === team.id;
          const isBlue = idx === 0;

          return (
            <div
              key={team.id}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl transition-all ${
                isActive
                  ? isBlue
                    ? 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                    : 'bg-rose-100/90 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100'
                  : 'bg-slate-100/70 dark:bg-white/5 opacity-80'
              }`}
            >
              {/* Active Click Area to toggle turn */}
              <div
                onClick={() => onSelectActiveTeam && onSelectActiveTeam(team.id)}
                className="flex items-center gap-2 cursor-pointer"
                title={`Bấm để chuyển lượt sang ${team.name}`}
              >
                <span
                  className={`w-3 h-3 rounded-full ${
                    isBlue ? 'bg-blue-600' : 'bg-rose-600'
                  } ${isActive ? 'animate-pulse' : ''}`}
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 max-w-[90px] sm:max-w-[130px] truncate">
                  {team.name}
                </span>
                <span
                  className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg text-white shadow-xs ${
                    isBlue ? 'bg-blue-600' : 'bg-rose-600'
                  }`}
                >
                  {team.score}
                </span>
              </div>

              {/* Quick +/- score adjust buttons for teacher */}
              {onAdjustScore && (
                <div className="flex items-center pl-1.5 ml-1 gap-1">
                  <button
                    type="button"
                    onClick={() => onAdjustScore(team.id, -1)}
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer text-xs"
                    title="Trừ 1 điểm"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustScore(team.id, 1)}
                    className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer text-xs font-bold"
                    title="Cộng 1 điểm"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. RIGHT: TEACHER TOOLBAR (TIMER, CALL STUDENT, QUESTION LIST, FONT, SOUND, FULLSCREEN) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Countdown Timer with Pause and +15s */}
        {timerSeconds !== null && timerSeconds !== undefined && (
          <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={onTogglePauseTimer}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                timerSeconds <= 5 && timerSeconds > 0
                  ? 'bg-rose-500 text-white animate-pulse'
                  : isTimerPaused
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                  : 'text-slate-700 dark:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-white/10'
              }`}
              title={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng'}
            >
              <Clock size={15} />
              <span className="font-mono text-sm">{timerSeconds}s</span>
              {isTimerPaused ? <Play size={11} className="fill-current" /> : <Pause size={11} className="fill-current opacity-60" />}
            </button>
            {onAddSeconds && (
              <button
                type="button"
                onClick={() => onAddSeconds(15)}
                className="px-2 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Cộng thêm 15 giây"
              >
                +15s
              </button>
            )}
          </div>
        )}

        {/* Random Student Picker */}
        {onOpenStudentPicker && (
          <button
            type="button"
            onClick={onOpenStudentPicker}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100/70 hover:bg-purple-200/70 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            title="Gọi ngẫu nhiên học sinh trong lớp"
          >
            <Shuffle size={14} />
            <span className="hidden md:inline">Gọi tên 🎲</span>
          </button>
        )}

        {/* Question Selector List */}
        {onOpenQuestionGrid && (
          <button
            type="button"
            onClick={onOpenQuestionGrid}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Bảng danh sách câu hỏi"
          >
            <ListOrdered size={15} />
            <span className="hidden lg:inline">Danh sách câu</span>
          </button>
        )}

        {/* Font Size Toggle for Projector */}
        {onChangeFontSize && (
          <button
            type="button"
            onClick={() => {
              const next = fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal';
              onChangeFontSize(next);
            }}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            title={`Cỡ chữ: ${fontSize || 'large'} (Bấm để đổi)`}
          >
            <Type size={16} />
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer ${
            soundEnabled
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
          }`}
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình chiếu TV'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Restart */}
        <button
          type="button"
          onClick={onRestart}
          className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Chơi lại từ đầu"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};
