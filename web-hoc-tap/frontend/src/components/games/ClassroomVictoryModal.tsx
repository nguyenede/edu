'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Sparkles, RotateCcw, ArrowLeft, Award, Crown } from 'lucide-react';
import { ClassroomTeam } from './ClassroomTeacherHeader';
import { gameAudio } from '@/lib/gameSound';

interface ClassroomVictoryModalProps {
  isOpen: boolean;
  teams: ClassroomTeam[];
  winnerTeamId?: string | null;
  onRestart: () => void;
  onBack: () => void;
}

export const ClassroomVictoryModal: React.FC<ClassroomVictoryModalProps> = ({
  isOpen,
  teams,
  winnerTeamId,
  onRestart,
  onBack,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      gameAudio.playVictory();
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  // Sort teams by score descending
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const topTeam = winnerTeamId
    ? teams.find((t) => t.id === winnerTeamId) || sortedTeams[0]
    : sortedTeams[0];

  const isTie =
    sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score && !winnerTeamId;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      <div className="bg-white dark:bg-[#1a1b1e] rounded-3xl max-w-lg w-full p-6 sm:p-9 shadow-2xl border-2 border-amber-400/40 dark:border-amber-500/30 text-center animate-in zoom-in-95 duration-200 flex flex-col items-center relative overflow-hidden">
        {/* Top Glow Ambient Aura */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Trophy Icon */}
        <div className="relative mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-amber-400/20 via-yellow-400/30 to-amber-500/20 border-2 border-amber-400/40 text-amber-500 flex items-center justify-center mx-auto shadow-xl animate-bounce">
            <Trophy size={54} className="text-amber-500 filter drop-shadow-md" />
          </div>
          <div className="absolute -top-1 -right-1 text-yellow-400 animate-spin">
            <Sparkles size={28} />
          </div>
          <div className="absolute -bottom-1 -left-1 text-amber-400 animate-pulse">
            <Sparkles size={22} />
          </div>
        </div>

        {/* Victory Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-1.5 tracking-tight">
          {isTie ? 'Cả Lớp Đều Xuất Sắc!' : `Chúc Mừng ${topTeam?.name || 'Đội Thắng'}!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-sm">
          {isTie
            ? 'Hai đội có số điểm bằng nhau trong vòng đấu vừa qua.'
            : 'Đã xuất sắc giành chiến thắng vinh quang trong tiết học hôm nay!'}
        </p>

        {/* Podium / Scoreboard Summary */}
        <div className="w-full space-y-2.5 mb-7">
          {sortedTeams.map((team, idx) => {
            const isWinner = team.id === topTeam?.id && !isTie;
            return (
              <div
                key={team.id}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-amber-400/60 ring-4 ring-amber-400/25 shadow-md scale-[1.02]'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-xs ${
                      idx === 0
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md font-black'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200'
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {idx === 0 ? <Crown size={16} /> : `#${idx + 1}`}
                  </div>
                  <div className="text-left">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      {team.name}
                      {isWinner && <Award size={16} className="text-amber-500" />}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {team.score}{' '}
                    <span className="text-xs font-semibold text-slate-500">điểm</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Chơi lại vòng mới</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
