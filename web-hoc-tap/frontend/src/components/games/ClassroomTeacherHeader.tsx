'use client';

import React from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Gamepad2,
  Sparkles,
  Shuffle,
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
  onOpenStudentPicker,
  fontSize,
  onChangeFontSize,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onRestart,
}) => {
  return (
    <div className="w-full bg-white dark:bg-[#1a1b1e] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 select-none transition-colors">
      {/* 1. LEFT: GAME TITLE */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
          {gameShortName || title}
        </span>
      </div>

      {/* 2. CENTER: TEAM SCORES WITH QUICK (+1 / -1) CONTROLS */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {teams.map((team, idx) => {
          const isActive = activeTeamId === team.id;
          const isBlue = idx === 0;

          return (
            <div
              key={team.id}
              onClick={() => onSelectActiveTeam && onSelectActiveTeam(team.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-xl transition-all cursor-pointer select-none ${
                isActive
                  ? isBlue
                    ? 'bg-blue-100/90 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100'
                    : 'bg-rose-100/90 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100'
                  : 'bg-slate-100/70 dark:bg-white/5 opacity-80 hover:opacity-100'
              }`}
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
          );
        })}
      </div>

      {/* 3. RIGHT: TEACHER TOOLBAR (CALL STUDENT, QUESTION LIST, FONT, SOUND, FULLSCREEN) */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Random Student Picker */}
        {onOpenStudentPicker && (
          <button
            type="button"
            onClick={onOpenStudentPicker}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100/70 hover:bg-purple-200/70 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            title="Gọi ngẫu nhiên học sinh trong lớp"
          >
            <Shuffle size={14} />
            <span className="hidden md:inline">Gọi tên</span>
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
