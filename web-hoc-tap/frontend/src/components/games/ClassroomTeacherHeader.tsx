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
    <div className="w-full bg-white/95 dark:bg-[#1a1b1e]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-white/10 px-3.5 sm:px-6 py-2.5 rounded-t-2xl shadow-xs flex items-center justify-between gap-3 select-none transition-all">
      {/* LEFT: BACK BUTTON & TITLE */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
          title="Quay lại danh sách trò chơi"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Gamepad2 size={16} />
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
              {gameShortName || title}
            </span>
            {gameShortName && title && title !== gameShortName && (
              <>
                <span className="text-slate-300 dark:text-zinc-600 text-xs hidden md:inline">•</span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 truncate hidden md:inline font-medium">
                  {title}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CENTER: VIBRANT TEAM SCORE CAPSULES */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {teams.map((team, idx) => {
          const isActive = activeTeamId === team.id;
          const isTeam1 = idx === 0;

          return (
            <div
              key={team.id}
              onClick={() => onSelectActiveTeam && onSelectActiveTeam(team.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 border-blue-400/80 dark:border-blue-500/60 ring-2 ring-blue-500/30 scale-[1.03] shadow-xs'
                  : 'bg-slate-50/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 opacity-85 hover:opacity-100 hover:scale-[1.01]'
              }`}
              title={`Lượt thi đấu của ${team.name} (Bấm để chuyển lượt)`}
            >
              {/* Team color dot with pulse when active */}
              <div className="relative flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${team.color} shadow-xs`} />
                {isActive && (
                  <span
                    className={`absolute w-3 h-3 rounded-full ${team.color} animate-ping opacity-75`}
                  />
                )}
              </div>

              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-100 max-w-[90px] sm:max-w-[130px] truncate">
                {team.name}
              </span>

              {/* 3D Gold Score Badge */}
              <div className="bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-xs min-w-[24px] text-center ml-0.5 tracking-tight border border-amber-200/60">
                {team.score}
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT: ARCADE ACTIONS (TIMER, SOUND, FULLSCREEN, RESTART) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Modern Arcade Timer Badge */}
        {timerSeconds !== null && timerSeconds !== undefined && (
          <button
            type="button"
            onClick={onTogglePauseTimer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 ${
              timerSeconds <= 5 && timerSeconds > 0
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse shadow-rose-500/30 ring-2 ring-rose-400'
                : isTimerPaused
                ? 'bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-300'
                : 'bg-slate-100/90 dark:bg-white/5 border-slate-200/90 dark:border-white/10 text-slate-700 dark:text-zinc-200 hover:bg-slate-200/90 dark:hover:bg-white/10'
            }`}
            title={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
          >
            <Clock size={13} className={timerSeconds <= 5 && timerSeconds > 0 ? 'text-white' : 'text-slate-400'} />
            <span className="font-mono tracking-wider">{timerSeconds > 0 ? `${timerSeconds}s` : '0s'}</span>
            {isTimerPaused ? (
              <Play size={10} className="fill-current text-amber-500 ml-0.5" />
            ) : (
              <Pause size={10} className="fill-current opacity-40 ml-0.5" />
            )}
          </button>
        )}

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 shadow-2xs border ${
            soundEnabled
              ? 'bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300/80 dark:border-rose-900 text-rose-600 dark:text-rose-400'
          }`}
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        {/* Fullscreen TV Mode */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình trình chiếu TV/Máy chiếu'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Restart Button */}
        <button
          type="button"
          onClick={onRestart}
          className="p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
          title="Chơi lại từ đầu"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
};
