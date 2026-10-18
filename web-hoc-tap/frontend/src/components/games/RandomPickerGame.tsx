'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Play,
  Shuffle,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Trophy,
  CheckCircle2,
  Layers,
  Edit3,
  X,
  Camera,
  Target
} from 'lucide-react';
import { ClassroomTeacherHeader } from './ClassroomTeacherHeader';
import { gameAudio } from '@/lib/gameSound';

export type RandomPickerSubMode =
  | 'wheel'
  | 'duck'
  | 'marble'
  | 'blind_duck'
  | 'photo_call'
  | 'photo_pair'
  | 'lucky_lens';

export interface RandomPickerGameProps {
  title?: string;
  initialMode?: RandomPickerSubMode;
  onBack: () => void;
  onSwitchGame?: (gameType: string) => void;
  onBackToHub?: () => void;
}

export const RANDOM_MODES: {
  id: RandomPickerSubMode;
  title: string;
  icon: string;
  subtitle: string;
  desc: string;
  badge: string;
  color: string;
}[] = [
  {
    id: 'wheel',
    title: 'Vòng quay nhiều màu',
    icon: '🎡',
    subtitle: 'Vòng quay may mắn gọi tên',
    desc: 'Vòng quay nhiều màu sắc quay đều với âm thanh kịch tính để chọn ngẫu nhiên một bạn học sinh.',
    badge: 'Phổ biến nhất',
    color: '#3b82f6',
  },
  {
    id: 'duck',
    title: 'Đua vịt về đích',
    icon: '🦆',
    subtitle: 'Đàn vịt bơi đua tốc độ',
    desc: 'Đàn vịt bơi đua tốc độ trên dòng sông. Chú vịt nào chạm đích trước sẽ đại diện học sinh trả lời.',
    badge: 'Sôi động',
    color: '#0891b2',
  },
  {
    id: 'marble',
    title: 'Đua bi tốc độ',
    icon: '🔮',
    subtitle: 'Đường đua bi vượt chướng ngại',
    desc: 'Các viên bi nhiều màu sắc lăn qua chướng ngại vật rơi xuống ô tên học sinh may mắn.',
    badge: 'Vật lý vui nhộn',
    color: '#7c3aed',
  },
  {
    id: 'blind_duck',
    title: 'Bắt vịt 3D',
    icon: '🙈',
    subtitle: 'Bắt chú vịt bồng bềnh',
    desc: 'Chọn chú vịt đang bơi lội dưới hồ nước để khám phá học sinh được gọi tên một cách bất ngờ.',
    badge: 'Tương tác 3D',
    color: '#db2777',
  },
  {
    id: 'photo_call',
    title: 'Gọi tên bằng ảnh',
    icon: '🖼️',
    subtitle: 'Thẻ tên lướt nhanh',
    desc: 'Thẻ tên học sinh lướt nhanh trên màn hình và dừng lại ngẫu nhiên ở bạn được chọn.',
    badge: 'Trực quan',
    color: '#16a34a',
  },
  {
    id: 'photo_pair',
    title: 'Ghép cặp bằng ảnh',
    icon: '👥',
    subtitle: 'Tự động chia cặp đôi',
    desc: 'Tự động chia cả lớp thành từng cặp đôi học tập hoặc nhóm làm bài một cách công bằng.',
    badge: 'Hoạt động nhóm',
    color: '#ea580c',
  },
  {
    id: 'lucky_lens',
    title: 'Ống kính may mắn',
    icon: '📷',
    subtitle: 'Quét và khóa mục tiêu',
    desc: 'Kính ngắm camera quét qua danh sách và khóa mục tiêu bạn học sinh may mắn.',
    badge: 'Kính ngắm camera',
    color: '#0284c7',
  },
];

export const DEFAULT_STUDENTS: string[] = [
  'Nguyễn Văn An',
  'Trần Thị Bích',
  'Lê Hoàng Cường',
  'Phạm Minh Đức',
  'Vũ Ngọc Hân',
  'Đỗ Hoàng Long',
  'Mai Thảo Linh',
  'Bùi Quốc Nam',
  'Hoàng Khánh Vy',
  'Đặng Gia Huy',
  'Ngô Phương Thảo',
  'Dương Anh Tuấn',
  'Phan Thanh Trúc',
  'Hà Minh Khôi',
  'Lý Cẩm Tú',
  'Trịnh Bảo Ngọc',
];

const WHEEL_PALETTE = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#84cc16', '#a855f7',
  '#0284c7', '#d97706', '#059669', '#7c3aed',
];

export const RandomPickerGame: React.FC<RandomPickerGameProps> = ({
  title,
  initialMode = 'wheel',
  onBack,
  onSwitchGame,
  onBackToHub,
}) => {
  const [activeMode, setActiveMode] = useState<RandomPickerSubMode>(initialMode);
  const [students, setStudents] = useState<string[]>(DEFAULT_STUDENTS);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [rosterInput, setRosterInput] = useState('');

  // Gameplay state
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [displayCandidate, setDisplayCandidate] = useState<string>('?');
  const [pairsResult, setPairsResult] = useState<[string, string][]>([]);
  const [duckPositions, setDuckPositions] = useState<number[]>([]);
  const [activeLensIndex, setActiveLensIndex] = useState<number | null>(null);

  // Wheel canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationAngle = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Load students from storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('random_picker_students');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudents(parsed);
            setRosterInput(parsed.join(', '));
            return;
          }
        }
        // Fallback to active classroom
        const rawClass =
          sessionStorage.getItem('current_active_class') ||
          localStorage.getItem('current_active_class');
        if (rawClass) {
          const c = JSON.parse(rawClass);
          if (Array.isArray(c.students) && c.students.length > 0) {
            const names = c.students.map((s: any) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
            if (names.length > 0) {
              setStudents(names);
              setRosterInput(names.join(', '));
              return;
            }
          }
        }
      } catch (e) {}
      setRosterInput(DEFAULT_STUDENTS.join(', '));
    }
  }, []);

  // Save updated students
  const handleSaveRoster = (newList: string[]) => {
    const cleaned = newList.map((s) => s.trim()).filter(Boolean);
    const finalStudents = cleaned.length > 0 ? cleaned : DEFAULT_STUDENTS;
    setStudents(finalStudents);
    setRosterInput(finalStudents.join(', '));
    setIsRosterModalOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('random_picker_students', JSON.stringify(finalStudents));
      } catch (e) {}
    }
    handleRestart();
  };

  // Draw wheel
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
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
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3;

      const name = students[i] || `Học sinh ${i + 1}`;
      const shortName = name.length > 15 ? name.slice(0, 14) + '...' : name;
      ctx.fillText(shortName, radius - 18, 5);
      ctx.restore();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Center text / icon
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎯', center, center + 4);
  };

  useEffect(() => {
    if (activeMode === 'wheel') {
      drawWheel(rotationAngle.current);
    }
  }, [students, activeMode]);

  // Restart / Reset state
  const handleRestart = () => {
    setIsRunning(false);
    setWinner(null);
    setDisplayCandidate('?');
    setPairsResult([]);
    setActiveLensIndex(null);
    setDuckPositions(students.map(() => 0));
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (activeMode === 'wheel') {
      drawWheel(rotationAngle.current);
    }
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // MAIN RUN ACTION
  const handleStart = () => {
    if (isRunning || students.length === 0) return;
    setIsRunning(true);
    setWinner(null);

    if (soundEnabled) {
      gameAudio.playWhistle();
    }

    // MODE: WHEEL
    if (activeMode === 'wheel') {
      const total = students.length;
      const targetIndex = Math.floor(Math.random() * total);
      const chosenStudent = students[targetIndex];

      const arc = (2 * Math.PI) / total;
      // Top indicator is at 3*PI/2 (270 degrees)
      const targetAngleAtTop = (3 * Math.PI) / 2;
      const targetCenterAngle = targetIndex * arc + arc / 2;
      const baseStopAngle = (targetAngleAtTop - targetCenterAngle + 4 * Math.PI) % (2 * Math.PI);

      const extraSpins = 6 + Math.floor(Math.random() * 3);
      const totalRotationNeeded = extraSpins * 2 * Math.PI + baseStopAngle;
      const duration = 4000;
      const startTime = performance.now();
      const initialAngle = rotationAngle.current;

      const animateWheel = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const currentA = initialAngle + totalRotationNeeded * ease;
        rotationAngle.current = currentA;
        drawWheel(currentA);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animateWheel);
        } else {
          setIsRunning(false);
          setWinner(chosenStudent);
          setDisplayCandidate(chosenStudent);
          if (soundEnabled) {
            gameAudio.playVictory();
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animateWheel);
      return;
    }

    // MODE: DUCK RACE
    if (activeMode === 'duck') {
      const totalDucks = students.length;
      const positions = new Array(totalDucks).fill(0);
      setDuckPositions([...positions]);

      const interval = setInterval(() => {
        for (let i = 0; i < totalDucks; i++) {
          positions[i] += Math.random() * 12 + 4;
        }
        setDuckPositions([...positions]);

        const winnerIdx = positions.findIndex((p) => p >= 100);
        if (winnerIdx !== -1) {
          clearInterval(interval);
          setIsRunning(false);
          const chosen = students[winnerIdx];
          setWinner(chosen);
          setDisplayCandidate(chosen);
          if (soundEnabled) {
            gameAudio.playVictory();
          }
        }
      }, 150);
      return;
    }

    // MODE: PHOTO PAIRS
    if (activeMode === 'photo_pair') {
      let tick = 0;
      const interval = setInterval(() => {
        tick++;
        const shuffled = [...students].sort(() => Math.random() - 0.5);
        const pairs: [string, string][] = [];
        for (let i = 0; i < shuffled.length; i += 2) {
          pairs.push([shuffled[i], shuffled[i + 1] || 'Độc lập (Tự chọn nhóm)']);
        }
        setPairsResult(pairs);

        if (tick > 15) {
          clearInterval(interval);
          setIsRunning(false);
          if (soundEnabled) {
            gameAudio.playVictory();
          }
        }
      }, 120);
      return;
    }

    // MODE: LUCKY LENS
    if (activeMode === 'lucky_lens') {
      let tick = 0;
      const interval = setInterval(() => {
        tick++;
        const randIdx = Math.floor(Math.random() * students.length);
        setActiveLensIndex(randIdx);
        setDisplayCandidate(students[randIdx]);

        if (tick > 25) {
          clearInterval(interval);
          setIsRunning(false);
          setWinner(students[randIdx]);
          if (soundEnabled) {
            gameAudio.playVictory();
          }
        }
      }, 100);
      return;
    }

    // MODE: BLIND DUCK / MARBLE / PHOTO CALL
    let counter = 0;
    const interval = setInterval(() => {
      counter++;
      const randIdx = Math.floor(Math.random() * students.length);
      setDisplayCandidate(students[randIdx]);

      if (counter > 24) {
        clearInterval(interval);
        setIsRunning(false);
        const finalStudent = students[randIdx];
        setWinner(finalStudent);
        setDisplayCandidate(finalStudent);
        if (soundEnabled) {
          gameAudio.playVictory();
        }
      }
    }, 110);
  };

  const currentModeMeta = RANDOM_MODES.find((m) => m.id === activeMode) || RANDOM_MODES[0];

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3 sm:space-y-4 min-h-0 select-none">
      {/* 1. SYNCHRONIZED CLASSROOM TEACHER HEADER */}
      <ClassroomTeacherHeader
        title={currentModeMeta.title}
        gameShortName="Gọi tên ngẫu nhiên"
        onSwitchGame={onSwitchGame}
        onBackToHub={onBackToHub}
        teams={[]}
        activeTeamId={null}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onBack={onBack}
        onRestart={handleRestart}
        customToolbarRight={
          <button
            type="button"
            onClick={() => setIsRosterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
            title="Quản lý danh sách học sinh"
          >
            <Users size={15} />
            <span className="font-semibold">{students.length} học sinh</span>
          </button>
        }
      />

      {/* 2. MAIN CLASSROOM PRESENTATION ARENA */}
      <div className="flex-1 w-full bg-white dark:bg-[#1a1b1e] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col overflow-hidden min-h-0 relative">
        {/* SUB-MODE TABS BAR */}
        <div className="px-4 py-3 bg-slate-50/90 dark:bg-[#131416]/90 border-b border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {RANDOM_MODES.map((mode) => {
              const isActive = activeMode === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setActiveMode(mode.id);
                    handleRestart();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-google-blue text-white shadow-xs scale-[1.02]'
                      : 'bg-white dark:bg-[#202124] text-slate-700 dark:text-zinc-300 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5'
                  }`}
                >
                  <span className="text-base">{mode.icon}</span>
                  <span>{mode.title}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400 shrink-0">
            <span>{currentModeMeta.subtitle}</span>
          </div>
        </div>

        {/* VISUAL GAME ARENA */}
        <div className="flex-1 w-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto relative min-h-0 bg-gradient-to-b from-slate-50/40 to-slate-100/30 dark:from-[#18191c] dark:to-[#141517]">
          {/* WINNER CELEBRATION BANNER */}
          {winner && (
            <div className="mb-2.5 px-5 py-2 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs sm:text-base flex items-center gap-2 shadow-lg animate-bounce select-none">
              <Trophy size={18} className="fill-slate-950" />
              <span>CHÚC MỪNG BẠN: {winner.toUpperCase()}!</span>
            </div>
          )}

          {/* MODE: WHEEL */}
          {activeMode === 'wheel' && (
            <div className="relative flex flex-col items-center justify-center my-auto">
              {/* Pointer indicator */}
              <div className="absolute top-[-8px] z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-md" />

              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="w-[270px] h-[270px] sm:w-[320px] sm:h-[320px] md:w-[350px] md:h-[350px] object-contain transition-transform select-none"
              />

              {/* Status pill under wheel */}
              <div className="mt-2 text-center">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider block">
                  {winner ? 'Đã chọn được học sinh' : isRunning ? 'Đang quay...' : 'Sẵn sàng'}
                </span>
                <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white block">
                  {displayCandidate}
                </span>
              </div>
            </div>
          )}

          {/* MODE: DUCK RACE */}
          {activeMode === 'duck' && (
            <div className="w-full max-w-2xl bg-sky-100/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900/50 rounded-2xl p-3 sm:p-4 max-h-[62vh] overflow-y-auto space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs font-bold text-sky-800 dark:text-sky-300 pb-2 border-b border-sky-200/80 dark:border-sky-900/50">
                <span>Vạch xuất phát 🏁</span>
                <span>Vạch đích 🏆</span>
              </div>

              {students.map((student, idx) => {
                const pos = Math.min(duckPositions[idx] || 0, 100);
                const isDuckWinner = winner === student;

                return (
                  <div
                    key={idx}
                    className="relative h-11 bg-white/80 dark:bg-black/30 rounded-xl flex items-center px-2 overflow-hidden border border-sky-200/60 dark:border-white/5"
                  >
                    <div
                      className="absolute flex items-center gap-1.5 transition-all"
                      style={{
                        left: `${Math.min(pos, 88)}%`,
                        transitionDuration: '0.15s',
                      }}
                    >
                      <span className="text-2xl filter drop-shadow select-none">🦆</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md truncate max-w-[130px] ${
                          isDuckWinner
                            ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                            : 'bg-slate-800 text-white dark:bg-slate-700'
                        }`}
                      >
                        {student}
                      </span>
                    </div>

                    <div className="absolute right-3 top-0 bottom-0 w-2 border-r-2 border-dashed border-rose-500 flex items-center justify-center">
                      <span className="text-[10px] text-rose-500 font-bold -mr-5">ĐÍCH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE: PHOTO PAIR (GHÉP CẶP) */}
          {activeMode === 'photo_pair' && (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <div className="text-center mb-3">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider block">
                  {pairsResult.length > 0
                    ? '✨ KẾT QUẢ GHÉP CẶP HỌC TẬP'
                    : 'Bấm Bắt đầu để tự động chia cặp đôi cho cả lớp'}
                </span>
              </div>

              {pairsResult.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-h-[58vh] overflow-y-auto p-1">
                  {pairsResult.map(([a, b], idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#202124] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-google-blue font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {a}
                        </span>
                      </div>
                      <span className="text-base font-black text-amber-500 shrink-0">🤝</span>
                      <div className="min-w-0 flex-1 text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                          {b}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-300 dark:border-white/15 rounded-3xl w-full max-w-lg">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <Users size={28} />
                  </div>
                  <p className="text-sm font-semibold">
                    Hệ thống sẽ ghép đôi ngẫu nhiên {students.length} học sinh thành {Math.ceil(students.length / 2)} nhóm
                  </p>
                </div>
              )}
            </div>
          )}

          {/* MODE: MARBLE, BLIND DUCK, PHOTO CALL, LUCKY LENS */}
          {['marble', 'blind_duck', 'photo_call', 'lucky_lens'].includes(activeMode) && (
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-4 border-amber-400 bg-gradient-to-br from-indigo-600 to-purple-800 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent animate-pulse" />
                <div className="text-6xl sm:text-7xl filter drop-shadow-md select-none">
                  {activeMode === 'marble' && '🔮'}
                  {activeMode === 'blind_duck' && '🦆'}
                  {activeMode === 'photo_call' && '🖼️'}
                  {activeMode === 'lucky_lens' && '📷'}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider block mb-1">
                  {winner ? '🎉 Bạn được gọi là:' : 'Đang tìm kiếm học sinh may mắn...'}
                </span>
                <span
                  className={`text-2xl sm:text-4xl font-black ${
                    winner ? 'text-amber-500 dark:text-amber-400 animate-bounce' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {displayCandidate}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM TEACHER ACTION CONTROLS */}
        <div className="px-5 py-3.5 bg-white dark:bg-[#1a1b1e] border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestart}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Quay lại ban đầu</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStart}
              disabled={isRunning}
              className="px-6 sm:px-8 py-2.5 rounded-2xl bg-google-blue hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Shuffle className="animate-spin" size={16} />
                  <span>Đang chọn...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-white" />
                  <span>
                    {activeMode === 'photo_pair' ? 'Ghép cặp ngẫu nhiên' : 'Bắt đầu gọi tên'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ROSTER MANAGEMENT MODAL */}
      {isRosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-google-blue" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Danh sách học sinh ({students.length})
                </h3>
              </div>
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Nhập danh sách học sinh của bạn, phân tách bằng dấu phẩy hoặc mỗi bạn một dòng:
              </p>

              <textarea
                rows={8}
                value={rosterInput}
                onChange={(e) => setRosterInput(e.target.value)}
                placeholder="Nguyễn Văn A, Trần Thị B, Lê Văn C..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-google-blue resize-none"
              />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setRosterInput(DEFAULT_STUDENTS.join(', '))}
                  className="text-xs font-semibold text-google-blue hover:underline cursor-pointer"
                >
                  Sử dụng danh sách mẫu (16 học sinh)
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-[#18191b] border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsRosterModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  const items = rosterInput
                    .split(/[\n,]+/)
                    .map((s) => s.trim())
                    .filter(Boolean);
                  handleSaveRoster(items);
                }}
                className="px-5 py-2 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Lưu danh sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
