'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  Shuffle,
  Trash2,
  CheckCircle2,
  X,
  Target,
  Sparkles,
  Camera,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';
import { useThemeStore } from '@/store/useThemeStore';
import { LuckyLensIcon } from './GameCustomIcons';

export interface LuckyLensGameProps {
  students: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSelectWinner?: (winner: string) => void;
  onRemoveStudent?: (student: string) => void;
  className?: string;
}

export const LuckyLensGame: React.FC<LuckyLensGameProps> = ({
  students: initialStudents,
  soundEnabled: externalSound,
  onToggleSound,
  onSelectWinner,
  onRemoveStudent,
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

  const [isScanning, setIsScanning] = useState(false);
  const [activeTargetIdx, setActiveTargetIdx] = useState<number | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleShuffle = () => {
    setStudents([...students].sort(() => Math.random() - 0.5));
  };

  const handleScan = () => {
    if (isScanning || students.length === 0) return;
    setIsScanning(true);
    setWinner(null);
    setIsWinnerModalOpen(false);

    let tick = 0;
    let speed = 60;
    const totalTicks = 32 + Math.floor(Math.random() * 10);

    const step = () => {
      tick++;
      const randIdx = Math.floor(Math.random() * students.length);
      setActiveTargetIdx(randIdx);

      if (soundActive) gameAudio.playTick();

      if (tick < totalTicks) {
        if (tick > totalTicks - 10) speed += 30;
        else if (tick > totalTicks - 5) speed += 60;
        setTimeout(step, speed);
      } else {
        const chosen = students[randIdx];
        setIsScanning(false);
        setWinner(chosen);
        setIsWinnerModalOpen(true);
        if (soundActive) {
          gameAudio.playAirHorn();
          gameAudio.playCheer();
        }
        if (onSelectWinner) onSelectWinner(chosen);
      }
    };

    setTimeout(step, speed);
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex-1 flex flex-col bg-slate-950 text-white select-none overflow-hidden font-sans min-h-0 p-4 sm:p-6 ${className || ''}`}
    >
      {/* High-Tech Radar HUD Background */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
        <div className="w-full h-full bg-[linear-gradient(to_right,#0284c715_1px,transparent_1px),linear-gradient(to_bottom,#0284c715_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      </div>

      {/* Futuristic Scope Crosshair in Center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-cyan-500/30 flex items-center justify-center">
          <div className="absolute w-full h-px bg-cyan-500/20" />
          <div className="absolute h-full w-px bg-cyan-500/20" />
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-dashed border-cyan-400/40 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="w-24 h-24 rounded-full border-2 border-cyan-400/50 flex items-center justify-center">
            <Target size={28} className="text-cyan-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Top HUD Telemetry */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Camera size={16} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-cyan-400 tracking-wider">
              CAMERA SCANNER // ỐNG KÍNH MAY MẮN
            </h3>
            <span className="text-[10px] text-slate-400">
              TARGETS: {students.length} HỌC SINH // RADAR ONLINE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5">
            {isScanning ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>SCANNING...</span>
              </>
            ) : (
              'READY'
            )}
          </span>
        </div>
      </div>

      {/* Target Grid Matrix */}
      <div className="relative z-10 flex-1 w-full overflow-y-auto min-h-0 pb-20 pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {students.map((name, idx) => {
            const isTargeted = activeTargetIdx === idx;
            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border transition-all duration-100 flex flex-col justify-between relative overflow-hidden ${
                  isTargeted
                    ? 'bg-cyan-500/30 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105 z-20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isTargeted && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-cyan-500 font-bold">
                    #0{idx + 1}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                      isTargeted
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isTargeted ? 'LOCKED' : 'TRACK'}
                  </span>
                </div>

                <div className="text-center my-1">
                  <span
                    className={`text-xs sm:text-sm font-black truncate block ${
                      isTargeted ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {name}
                  </span>
                </div>

                {/* Cyber Corner Decals */}
                {isTargeted && (
                  <>
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* FLOATING ACTION LAUNCH BAR (When Idle) */}
      {!isScanning && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-cyan-500/30 shadow-xl">
          <button
            onClick={handleShuffle}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer text-xs font-semibold flex items-center gap-1.5"
            title="Xáo trộn vị trí mục tiêu"
          >
            <Shuffle size={13} />
            <span className="hidden sm:inline">Xáo trộn radar</span>
          </button>

          <button
            onClick={handleScan}
            className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.03] active:scale-95 cursor-pointer"
          >
            <Play size={16} className="fill-white" />
            <span>QUÉT MỤC TIÊU NGAY</span>
          </button>
        </div>
      )}

      {/* WINNER MODAL */}
      {isWinnerModalOpen && winner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-400 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.4)] text-white relative flex flex-col items-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsWinnerModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mb-3 shadow-md animate-pulse">
              <LuckyLensIcon size={46} />
            </div>

            <div className="text-xs uppercase font-mono font-extrabold text-cyan-400 tracking-widest mb-1 flex items-center gap-1">
              <Sparkles size={14} />
              <span>TARGET LOCKED // MỤC TIÊU ĐƯỢC CHỌN:</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white text-center mb-6 px-4 py-2 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 w-full drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
              {winner}
            </h3>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 gap-2.5 w-full">
              <button
                onClick={() => {
                  if (onSelectWinner) onSelectWinner(winner);
                  setIsWinnerModalOpen(false);
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Xác Nhận Gọi Bạn Này</span>
              </button>

              <button
                onClick={() => {
                  if (onRemoveStudent) onRemoveStudent(winner);
                  setIsWinnerModalOpen(false);
                }}
                className="px-4 py-3 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-800/40 transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Loại mục tiêu này & Quét tiếp</span>
              </button>

              <button
                onClick={() => setIsWinnerModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Quét Lại Từ Đầu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
