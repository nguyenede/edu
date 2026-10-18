'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Shuffle,
  Trash2,
  CheckCircle2,
  X,
  Trophy,
  RotateCcw,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';
import { useThemeStore } from '@/store/useThemeStore';
import { LuckyWheelIcon } from './GameCustomIcons';

export interface LuckyWheelViewProps {
  students: string[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSelectWinner?: (winner: string) => void;
  onRemoveStudent?: (student: string) => void;
  className?: string;
}

// Vibrant candy pastel palette from giaoviendoimoi / modern edtech
const WHEEL_PALETTE = [
  '#fa709a', '#fee140', '#38ef7d', '#11998e',
  '#4facfe', '#00f2fe', '#ff758c', '#ff7eb3',
  '#f77062', '#fe5196', '#b176f2', '#30cfd0',
  '#a1c4fd', '#c2e9fb', '#ff9a9e', '#fecfef',
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
];

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  vRot: number;
  alpha: number;
}

export const LuckyWheelView: React.FC<LuckyWheelViewProps> = ({
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

  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const lastSliceIdxRef = useRef<number>(-1);
  const pointerWiggleRef = useRef<number>(0);

  const [wheelSize, setWheelSize] = useState<number>(600);

  // Measure container and compute ideal wheel size (square aspect-ratio)
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const availableW = rect.width;
      const availableH = rect.height;

      // Leave room for the spin button on the right (or bottom)
      const isLandscape = availableW > 640;
      const maxDimW = isLandscape ? availableW - 140 : availableW - 24;
      const maxDimH = isLandscape ? availableH - 30 : availableH - 120;
      const calculated = Math.max(260, Math.min(maxDimW, maxDimH, 840));

      setWheelSize(calculated);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Redraw canvas whenever students or angle changes
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;
    const total = Math.max(students.length, 1);
    const arc = (2 * Math.PI) / total;

    ctx.clearRect(0, 0, size, size);

    // Draw slices
    for (let i = 0; i < total; i++) {
      const start = angle + i * arc;
      const end = start + arc;
      const color = WHEEL_PALETTE[i % WHEEL_PALETTE.length];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.fillStyle = color;
      ctx.fill();

      // Clean white borders between slices
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = total > 30 ? 1.5 : 3;
      ctx.stroke();

      // Radial student name label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';

      // Dynamic font sizing based on slice count
      const fontSize = total > 25 ? 12 : total > 15 ? 14 : 16;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const name = students[i] || `Học sinh ${i + 1}`;
      const maxTextLength = total > 20 ? 14 : 20;
      const displayName = name.length > maxTextLength ? name.slice(0, maxTextLength - 1) + '…' : name;

      ctx.fillText(displayName, radius - 24, fontSize * 0.35);
      ctx.restore();
    }

    // Outer pure white ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  useEffect(() => {
    drawWheel(rotationAngleRef.current);
  }, [students, wheelSize]);

  // Spawn confetti celebration
  const spawnConfetti = (cx: number, cy: number) => {
    const colors = ['#f59e0b', '#fa709a', '#fee140', '#38ef7d', '#4facfe', '#ec4899', '#ffffff'];
    for (let i = 0; i < 100; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 9 + 4;
      confettiRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        alpha: 1,
      });
    }
  };

  // Spin Wheel Execution
  const handleSpin = () => {
    if (isSpinning || students.length === 0) return;
    setIsSpinning(true);
    setWinner(null);
    setIsWinnerModalOpen(false);

    const total = students.length;
    const arc = (2 * Math.PI) / total;
    const targetIndex = Math.floor(Math.random() * total);
    const chosenStudent = students[targetIndex];

    // Pointer is at right side (angle 0 / 2*PI)
    // Target slice center needs to stop at angle 0
    const targetSliceCenter = targetIndex * arc + arc / 2;
    const baseStopAngle = (2 * Math.PI - (targetSliceCenter % (2 * Math.PI))) % (2 * Math.PI);

    const extraSpins = 6 + Math.floor(Math.random() * 3);
    const totalRotation = extraSpins * 2 * Math.PI + baseStopAngle;
    const duration = 5400; // 5.4s realistic spin
    const startTime = performance.now();
    const initialAngle = rotationAngleRef.current;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic bezier ease-out (.25, .1, .25, 1) approximation
      const ease = 1 - Math.pow(1 - progress, 3.2);
      const currentA = initialAngle + totalRotation * ease;
      rotationAngleRef.current = currentA;

      drawWheel(currentA);

      // Check slice tick sound & pointer bounce
      const normalizedA = (currentA % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentPassedSlice = Math.floor(((2 * Math.PI - normalizedA + 4 * Math.PI) % (2 * Math.PI)) / arc);

      if (currentPassedSlice !== lastSliceIdxRef.current) {
        lastSliceIdxRef.current = currentPassedSlice;
        pointerWiggleRef.current = 1;
        if (soundActive) gameAudio.playTick();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setWinner(chosenStudent);
        setIsWinnerModalOpen(true);
        if (soundActive) gameAudio.playCheer();
        if (onSelectWinner) onSelectWinner(chosenStudent);

        // Spawn confetti from center
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) spawnConfetti(rect.width / 2, rect.height / 2);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const handleShuffle = () => {
    setStudents([...students].sort(() => Math.random() - 0.5));
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex-1 flex flex-col items-center justify-center select-none overflow-hidden font-sans min-h-0 p-3 sm:p-5 ${
        isDark
          ? 'bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#1e1b4b]'
          : 'bg-gradient-to-br from-[#70aefa] via-[#39e5d7] to-[#e9a6f0]'
      } ${className || ''}`}
    >
      {/* Top Left Floating Indicator */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/90 dark:bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md text-xs font-bold text-slate-800 dark:text-zinc-200 border border-white/30">
        <LuckyWheelIcon size={16} />
        <span>Vòng quay gọi tên</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>{students.length} bạn</span>
      </div>

      {/* Top Right Quick Shuffle */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={handleShuffle}
          disabled={isSpinning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white dark:bg-black/40 dark:hover:bg-black/60 backdrop-blur-md shadow-md text-xs font-bold text-slate-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50 border border-white/30"
          title="Xáo trộn thứ tự các nan quạt"
        >
          <Shuffle size={13} />
          <span className="hidden sm:inline">Xáo trộn</span>
        </button>
      </div>

      {/* Main Wheel Arena with Side Spin Button */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 w-full h-full my-auto">
        {/* Wheel Box with Aspect Ratio 1:1 */}
        <div
          className="relative flex items-center justify-center flex-shrink-0"
          style={{ width: wheelSize, height: wheelSize }}
        >
          {/* Canvas Wheel with 3D Drop Shadow */}
          <canvas
            ref={canvasRef}
            width={840}
            height={840}
            className="w-full h-full block rounded-full"
            style={{
              filter: 'drop-shadow(0 20px 50px rgba(0, 0, 0, 0.4)) drop-shadow(-10px -10px 30px rgba(255, 255, 255, 0.25))',
            }}
          />

          {/* Iconic giaoviendoimoi Pointer Pin on the Right (Pointing Left into the wheel) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 right-[-24px] sm:right-[-28px] z-20 pointer-events-none transition-transform duration-75"
            style={{
              transform: `translateY(-50%) rotate(${isSpinning && pointerWiggleRef.current ? -12 : 0}deg)`,
              filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35))',
            }}
          >
            <div className="relative flex items-center">
              {/* Triangle pointing left */}
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '11px solid transparent',
                  borderBottom: '11px solid transparent',
                  borderRight: '22px solid #ffffff',
                }}
              />
              {/* White rectangular base */}
              <div
                style={{
                  width: '42px',
                  height: '18px',
                  backgroundColor: '#ffffff',
                  borderRadius: '0 6px 6px 0',
                }}
              />
            </div>
          </div>

          {/* Wheel Center Gradient Hub with White Outer Ring & Inner Dot */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            style={{
              width: Math.max(48, Math.min(wheelSize * 0.16, 72)),
              height: Math.max(48, Math.min(wheelSize * 0.16, 72)),
              background: 'linear-gradient(135deg, #fa709a, #fee140)',
              border: '5px solid #ffffff',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={handleSpin}
            title="Bấm để quay vòng quay!"
          >
            <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
          </div>
        </div>

        {/* Big giaoviendoimoi Style Spin Button */}
        <button
          onClick={handleSpin}
          disabled={isSpinning || students.length === 0}
          title="Quay vòng để chọn học sinh"
          className="flex-shrink-0 px-6 sm:px-7 py-3.5 sm:py-5 rounded-2xl text-white font-black cursor-pointer shadow-xl transition-all transform hover:scale-105 active:scale-95 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1 min-w-[100px] sm:min-w-[85px] border-none disabled:opacity-60 disabled:cursor-not-allowed animate-pulse"
          style={{
            background: 'linear-gradient(135deg, rgb(102, 126, 234) 0%, rgb(118, 75, 162) 100%)',
            boxShadow: 'rgba(102, 126, 234, 0.45) 0px 6px 20px',
          }}
        >
          <LuckyWheelIcon size={30} />
          <span className="text-sm sm:text-xs font-black tracking-wider uppercase">
            {isSpinning ? 'Đang quay...' : 'Quay!'}
          </span>
        </button>
      </div>

      {/* WINNER CELEBRATION MODAL */}
      {isWinnerModalOpen && winner && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/40 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1b1e] border-2 border-amber-400 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-white relative flex flex-col items-center animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsWinnerModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 dark:text-zinc-300 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-20 h-20 rounded-3xl bg-amber-100 dark:bg-amber-400/20 text-amber-500 border border-amber-200 dark:border-amber-400/30 flex items-center justify-center mb-3 shadow-md animate-bounce">
              <LuckyWheelIcon size={46} />
            </div>

            <div className="text-xs uppercase font-extrabold text-amber-600 dark:text-amber-400 tracking-wider mb-1 flex items-center gap-1">
              <Trophy size={14} />
              <span>VÒNG QUAY ĐÃ DỪNG LẠI TẠI:</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center mb-6 px-4 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 w-full">
              {winner}
            </h3>

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 gap-2.5 w-full">
              <button
                onClick={() => {
                  if (onSelectWinner) onSelectWinner(winner);
                  setIsWinnerModalOpen(false);
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                <span>Gọi Bạn Này Trả Lời</span>
              </button>

              <button
                onClick={() => {
                  if (onRemoveStudent) onRemoveStudent(winner);
                  setIsWinnerModalOpen(false);
                }}
                className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900/40 transition cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Loại bạn này & Quay tiếp</span>
              </button>

              <button
                onClick={() => setIsWinnerModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-white/10 transition cursor-pointer"
              >
                <RotateCcw size={15} />
                <span>Quay Lại Từ Đầu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
