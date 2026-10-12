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
  currentIndex?: number;
  totalQuestions?: number;
  onOpenQuestionGrid?: () => void;
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
  timerSeconds,
  isTimerPaused,
  onTogglePauseTimer,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  onRestart,
}) => {
  return (
    <div className="w-full bg-white dark:bg-[#1e1f20] border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-2.5 rounded-t-2xl shadow-xs flex items-center justify-between gap-4 select-none">
      {/* LEFT: BACK BUTTON & CLEAN TITLE */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer shrink-0"
          title="Quay lại"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">
            {gameShortName || title}
          </span>
          {gameShortName && title && title !== gameShortName && (
            <>
              <span className="text-slate-300 dark:text-zinc-600 text-xs">•</span>
              <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                {title}
              </span>
            </>
          )}
        </div>
      </div>

      {/* CENTER: CLEAN SCORE PILLS */}
      <div className="flex items-center gap-3 shrink-0">
        {teams.map((team) => {
          const isActive = activeTeamId === team.id;
          return (
            <div
              key={team.id}
              onClick={() => onSelectActiveTeam && onSelectActiveTeam(team.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer shadow-xs ${
                isActive
                  ? `${team.bgLight} ${team.borderColor} ring-2 ring-google-blue/30 font-bold scale-[1.02]`
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 opacity-85 hover:opacity-100'
              }`}
              title={`Lượt của ${team.name}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${team.color}`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                {team.name}
              </span>
              <span className="bg-amber-400 text-black text-xs font-black px-2 py-0.5 rounded-full min-w-[20px] text-center ml-0.5">
                {team.score}
              </span>
            </div>
          );
        })}
      </div>

      {/* RIGHT: ESSENTIAL ACTIONS ONLY (TIMER, SOUND, FULLSCREEN, RESTART) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Timer Box */}
        {timerSeconds !== null && timerSeconds !== undefined && (
          <button
            type="button"
            onClick={onTogglePauseTimer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              timerSeconds <= 5 && timerSeconds > 0
                ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 animate-pulse'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            title={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
          >
            <Clock size={13} className="text-slate-400" />
            <span className="font-mono">{timerSeconds > 0 ? `${timerSeconds}s` : '0s'}</span>
            {isTimerPaused && <span className="text-[10px] text-amber-500 font-extrabold ml-0.5">||</span>}
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-rose-500" />}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình trình chiếu TV'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Restart Button */}
        <button
          type="button"
          onClick={onRestart}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Chơi lại từ đầu"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
};
