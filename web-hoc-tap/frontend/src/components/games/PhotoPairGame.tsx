'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Shuffle,
  Users,
  Copy,
  Check,
  Sparkles,
  Zap,
  Rocket,
  Crown,
  Flame,
  Target,
  Star,
  Gem,
  Shield,
  Compass,
  Trophy,
  LucideIcon,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';
import { useThemeStore } from '@/store/useThemeStore';
import { PhotoPairIcon } from './GameCustomIcons';

export interface PhotoPairGameProps {
  students: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  className?: string;
}

interface TeamResult {
  id: number;
  name: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  members: string[];
}

const TEAM_NAMES = [
  { name: 'Biệt Đội Tia Chớp', icon: Zap, color: '#eab308', grad: 'from-amber-500/15 to-yellow-500/5' },
  { name: 'Tên Lửa Siêu Thanh', icon: Rocket, color: '#ef4444', grad: 'from-rose-500/15 to-red-500/5' },
  { name: 'Sư Tử Dũng Mãnh', icon: Crown, color: '#f97316', grad: 'from-orange-500/15 to-amber-500/5' },
  { name: 'Rồng Lửa Bất Diệt', icon: Flame, color: '#dc2626', grad: 'from-red-500/15 to-rose-500/5' },
  { name: 'Đại Bàng Quyết Thắng', icon: Target, color: '#0284c7', grad: 'from-sky-500/15 to-blue-500/5' },
  { name: 'Ngôi Sao May Mắn', icon: Star, color: '#8b5cf6', grad: 'from-purple-500/15 to-indigo-500/5' },
  { name: 'Kim Cương Bất Hoại', icon: Gem, color: '#06b6d4', grad: 'from-cyan-500/15 to-teal-500/5' },
  { name: 'Hiệp Sĩ Quả Cảm', icon: Shield, color: '#64748b', grad: 'from-slate-500/15 to-zinc-500/5' },
  { name: 'Hải Âu Thông Thái', icon: Compass, color: '#3b82f6', grad: 'from-blue-500/15 to-indigo-500/5' },
  { name: 'Chiến Binh Vinh Quang', icon: Trophy, color: '#f43f5e', grad: 'from-pink-500/15 to-rose-500/5' },
];

export const PhotoPairGame: React.FC<PhotoPairGameProps> = ({
  students: initialStudents,
  soundEnabled: externalSound,
  onToggleSound,
  className,
}) => {
  const currentTheme = useThemeStore((state) => state.theme);
  const isDark = currentTheme === 'dark';

  const [students, setStudents] = useState<string[]>(
    initialStudents && initialStudents.length > 0 ? initialStudents : ['Học sinh 1', 'Học sinh 2', 'Học sinh 3']
  );

  useEffect(() => {
    if (initialStudents && initialStudents.length > 0) {
      setStudents(initialStudents);
    }
  }, [initialStudents]);

  const soundActive = externalSound ?? true;

  const [groupSize, setGroupSize] = useState<number>(2); // 2 (pairs), 3, 4, 5
  const [isShuffling, setIsShuffling] = useState(false);
  const [teams, setTeams] = useState<TeamResult[]>([]);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleCreateTeams = (sizeToUse = groupSize) => {
    if (students.length === 0) return;
    setIsShuffling(true);

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      if (soundActive) gameAudio.playTick();

      // Preliminary shuffle preview
      const shuffled = [...students].sort(() => Math.random() - 0.5);
      const generated: TeamResult[] = [];
      let teamIdx = 0;

      for (let i = 0; i < shuffled.length; i += sizeToUse) {
        const slice = shuffled.slice(i, i + sizeToUse);
        const meta = TEAM_NAMES[teamIdx % TEAM_NAMES.length];
        generated.push({
          id: teamIdx + 1,
          name: meta.name,
          icon: meta.icon,
          color: meta.color,
          bgGradient: meta.grad,
          members: slice,
        });
        teamIdx++;
      }

      setTeams(generated);

      if (tick > 14) {
        clearInterval(interval);
        setIsShuffling(false);
        if (soundActive) gameAudio.playCheer();
      }
    }, 100);
  };

  const handleCopyTeams = () => {
    if (teams.length === 0) return;
    const text = teams
      .map(
        (t) =>
          `[Nhóm ${t.id}] ${t.name}:\n  - ${t.members.join('\n  - ')}`
      )
      .join('\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex-1 flex flex-col bg-white dark:bg-[#18191c] text-slate-900 dark:text-white select-none overflow-hidden font-sans min-h-0 p-4 sm:p-6 ${className || ''}`}
    >
      {/* Top Banner / Status */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center">
            <PhotoPairIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              {teams.length > 0 ? `ĐÃ CHIA THÀNH ${teams.length} NHÓM HỌC TẬP` : 'GHÉP CẶP & CHIA NHÓM TỰ ĐỘNG'}
            </h3>
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Tổng số {students.length} học sinh
            </span>
          </div>
        </div>

        {teams.length > 0 && (
          <button
            onClick={handleCopyTeams}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
            title="Sao chép toàn bộ danh sách nhóm vào clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            <span>{copied ? 'Đã sao chép!' : 'Sao chép kết quả'}</span>
          </button>
        )}
      </div>

      {/* Main Teams Grid Area */}
      <div className="flex-1 w-full overflow-y-auto min-h-0 pb-20 pr-1">
        {teams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {teams.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-gradient-to-br ${t.bgGradient} bg-white dark:bg-[#1e1f20] shadow-sm flex flex-col justify-between transition-all transform ${
                  isShuffling ? 'scale-98 opacity-75' : 'scale-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-2xs"
                        style={{ backgroundColor: t.color }}
                      >
                        <t.icon size={13} />
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-zinc-100">
                        {t.name}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      Nhóm {t.id}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {t.members.map((member, mIdx) => (
                      <div
                        key={mIdx}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs"
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 text-[10px] font-black flex items-center justify-center shrink-0">
                          {mIdx + 1}
                        </span>
                        <span className="truncate">{member}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-3xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center mb-3 shadow-md animate-bounce">
              <PhotoPairIcon size={46} />
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              Sẵn sàng ghép cặp & chia nhóm
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-6">
              Chọn số lượng bạn mỗi nhóm (cặp 2 người, nhóm 3, 4 hoặc 5 người) và nhấn Bắt đầu chia nhóm bên dưới!
            </p>
          </div>
        )}
      </div>

      {/* FLOATING ACTION LAUNCH BAR (When Idle) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl">
        {/* Size selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 dark:text-zinc-400 font-semibold hidden sm:inline">Mỗi nhóm:</span>
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
            {[2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setGroupSize(num);
                  if (teams.length > 0) handleCreateTeams(num);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  groupSize === num
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {num === 2 ? 'Cặp đôi (2)' : `${num} bạn`}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => handleCreateTeams()}
          disabled={isShuffling}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <Play size={16} className="fill-white" />
          <span>{teams.length > 0 ? 'XÁO TRỘN LẠI' : 'BẮT ĐẦU CHIA NHÓM'}</span>
        </button>
      </div>
    </div>
  );
};
