'use client';

import React from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
  Grid,
  Pause,
  Play,
  Type,
  Plus,
  Minus,
  Clock,
  Sparkles,
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
  onSelectActiveTeam: (teamId: string) => void;
  onAdjustScore: (teamId: string, delta: number) => void;
  timerSeconds: number | null;
  isTimerPaused: boolean;
  onTogglePauseTimer?: () => void;
  currentIndex: number;
  totalQuestions: number;
  onOpenQuestionGrid: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onChangeFontSize: (size: 'normal' | 'large' | 'xlarge') => void;
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
  currentIndex,
  totalQuestions,
  onOpenQuestionGrid,
  fontSize,
  onChangeFontSize,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onBack,
  onRestart,
  onOpenSettings,
}) => {
  const cycleFontSize = () => {
    if (fontSize === 'normal') onChangeFontSize('large');
    else if (fontSize === 'large') onChangeFontSize('xlarge');
    else onChangeFontSize('normal');
  };

  const fontSizeLabel =
    fontSize === 'normal' ? 'Cỡ chữ: Chuẩn' : fontSize === 'large' ? 'Cỡ chữ: Lớn' : 'Cỡ chữ: Cực lớn';

  return (
    <div className="w-full bg-white dark:bg-[#1e1f20] border-b border-slate-200/80 dark:border-white/10 px-3 sm:px-5 py-2.5 rounded-t-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
      {/* LEFT: BACK BUTTON + GAME INFO */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
          title="Quay lại danh mục"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {gameShortName && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-google-blue dark:text-blue-400">
                {gameShortName}
              </span>
            )}
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Dành cho máy chiếu & màn hình tương tác lớp học
          </span>
        </div>
      </div>

      {/* CENTER: TEAMS SCOREBOARD & ACTIVE TURN SELECTOR */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {teams.map((team) => {
          const isActive = activeTeamId === team.id;
          return (
            <div
              key={team.id}
              onClick={() => onSelectActiveTeam(team.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isActive
                  ? `${team.bgLight} ${team.borderColor} ring-2 ring-google-blue/30 scale-102 font-bold`
                  : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 opacity-75 hover:opacity-100'
              }`}
              title={`Bấm để chọn ${team.name} phát biểu`}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${team.color}`} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[90px]">
                    {team.name}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {team.score} <span className="text-[10px] font-normal text-slate-500">điểm</span>
                </span>
              </div>

              {/* Quick Score Adjusters for Teachers */}
              <div
                className="flex items-center gap-0.5 ml-1 border-l border-slate-200/80 dark:border-white/10 pl-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onAdjustScore(team.id, -5)}
                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-200/70 hover:bg-rose-100 dark:bg-white/10 dark:hover:bg-rose-950/50 text-slate-600 dark:text-zinc-300 hover:text-rose-600 transition-colors cursor-pointer text-xs"
                  title="Trừ 5 điểm"
                >
                  <Minus size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustScore(team.id, 10)}
                  className="w-5 h-5 rounded flex items-center justify-center bg-slate-200/70 hover:bg-emerald-100 dark:bg-white/10 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-zinc-300 hover:text-emerald-600 transition-colors cursor-pointer text-xs"
                  title="Cộng 10 điểm"
                >
                  <Plus size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RIGHT: TEACHER CONTROLS (TIMER, QUESTION GRID, FONT, SOUND, FULLSCREEN) */}
      <div className="flex items-center gap-1.5">
        {/* Timer Box */}
        {timerSeconds !== null && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
              timerSeconds <= 5 && timerSeconds > 0
                ? 'bg-rose-50 border-rose-300 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 animate-pulse'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-zinc-300'
            }`}
            title="Thời gian suy nghĩ"
          >
            <Clock size={13} className="text-slate-400" />
            <span className="min-w-[20px] text-center font-mono">
              {timerSeconds > 0 ? `${timerSeconds}s` : 'Hết giờ'}
            </span>
            {onTogglePauseTimer && (
              <button
                type="button"
                onClick={onTogglePauseTimer}
                className="ml-1 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                title={isTimerPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
              >
                {isTimerPaused ? <Play size={11} /> : <Pause size={11} />}
              </button>
            )}
          </div>
        )}

        {/* Question Selector Button */}
        <button
          type="button"
          onClick={onOpenQuestionGrid}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
          title="Mở bảng câu hỏi để chọn câu"
        >
          <Grid size={13} className="text-google-blue dark:text-blue-400" />
          <span>
            {currentIndex + 1}/{totalQuestions}
          </span>
        </button>

        {/* Font Size Button */}
        <button
          type="button"
          onClick={cycleFontSize}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={fontSizeLabel}
        >
          <Type size={14} />
        </button>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} className="text-rose-500" />}
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình trình chiếu TV'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Restart Button */}
        <button
          type="button"
          onClick={onRestart}
          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Chơi lại từ đầu"
        >
          <RotateCcw size={14} />
        </button>

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Cài đặt luật & câu hỏi"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
