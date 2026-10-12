'use client';

import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (isOpen) {
      gameAudio.playVictory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sort teams by score descending
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const topTeam = winnerTeamId
    ? teams.find((t) => t.id === winnerTeamId) || sortedTeams[0]
    : sortedTeams[0];

  const isTie =
    sortedTeams.length > 1 && sortedTeams[0].score === sortedTeams[1].score && !winnerTeamId;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-0 duration-200">
      <div className="bg-white dark:bg-[#1e1f20] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/10 text-center animate-in zoom-in-95 duration-200 flex flex-col items-center">
        {/* Animated Trophy Icon */}
        <div className="relative mb-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <Trophy size={48} className="text-amber-500" />
          </div>
          <div className="absolute -top-1 -right-1 text-yellow-400 animate-spin">
            <Sparkles size={24} />
          </div>
        </div>

        {/* Victory Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">
          {isTie ? '🎉 Cả Lớp Đều Xuất Sắc!' : `🎉 Chúc Mừng ${topTeam?.name || 'Đội Thắng'}!`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6">
          {isTie
            ? 'Hai đội có số điểm bằng nhau trong vòng đấu vừa qua.'
            : 'Đã xuất sắc giành chiến thắng trong tiết học hôm nay!'}
        </p>

        {/* Podium / Scoreboard Summary */}
        <div className="w-full space-y-2 mb-6">
          {sortedTeams.map((team, idx) => {
            const isWinner = team.id === topTeam?.id && !isTie;
            return (
              <div
                key={team.id}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-400/30'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200/80 dark:border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? 'bg-amber-500 text-white shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200'
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {idx === 0 ? <Crown size={14} /> : `#${idx + 1}`}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                      {team.name}
                      {isWinner && <Award size={14} className="text-amber-500" />}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {team.score}{' '}
                    <span className="text-xs font-normal text-slate-500">điểm</span>
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
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>Quay lại</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex-1 py-3 px-4 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>Chơi lại vòng mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
