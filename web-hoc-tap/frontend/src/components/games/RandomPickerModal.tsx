'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Shuffle,
  Users,
  Award,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Dices,
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';
import { DuckRaceGame } from './DuckRaceGame';
import { RosterConfigModal } from './RosterConfigModal';
import {
  DuckRaceIcon,
  MarbleRaceIcon,
  LuckyWheelIcon,
  BlindDuckIcon,
  PhotoPairIcon,
  LuckyLensIcon,
} from './GameCustomIcons';

export type RandomPickerSubMode =
  | 'wheel'
  | 'duck'
  | 'marble'
  | 'blind_duck'
  | 'photo_pair'
  | 'lucky_lens';

export interface RandomPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: RandomPickerSubMode;
  students?: string[];
  onSaveStudents?: (newStudents: string[]) => void;
}

const DEFAULT_STUDENTS = [
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

export const RANDOM_MODES: {
  id: RandomPickerSubMode;
  title: string;
  icon: React.ReactNode;
  desc: string;
  color: string;
}[] = [
  { id: 'wheel', title: 'Vòng quay', icon: <LuckyWheelIcon size={18} />, desc: 'Vòng quay nhiều màu sắc may mắn gọi tên ngẫu nhiên', color: '#ea580c' },
  { id: 'duck', title: 'Đua vịt', icon: <DuckRaceIcon size={18} />, desc: 'Đàn vịt bơi đua tốc độ về đích để chọn bạn chiến thắng', color: '#0891b2' },
  { id: 'marble', title: 'Đua bi', icon: <MarbleRaceIcon size={18} />, desc: 'Đường đua bi ngẫu nhiên qua các chướng ngại vật', color: '#7c3aed' },
  { id: 'blind_duck', title: 'Bắt vịt 3D', icon: <BlindDuckIcon size={18} />, desc: 'Bắt chú vịt bồng bềnh dưới hồ nước', color: '#db2777' },
  { id: 'photo_pair', title: 'Ghép cặp bằng ảnh', icon: <PhotoPairIcon size={18} />, desc: 'Tự động ghép đôi cả lớp thành từng cặp học tập', color: '#ea580c' },
  { id: 'lucky_lens', title: 'Ống kính may mắn', icon: <LuckyLensIcon size={18} />, desc: 'Kính ngắm camera quét và khóa mục tiêu bạn học sinh', color: '#0891b2' },
];

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'wheel',
  students,
  onSaveStudents,
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeMode, setActiveMode] = useState<RandomPickerSubMode>(initialMode);
  const [studentList, setStudentList] = useState<string[]>(students && students.length > 0 ? students : DEFAULT_STUDENTS);
  const [studentInput, setStudentInput] = useState<string>((students && students.length > 0 ? students : DEFAULT_STUDENTS).join(', '));
  const [isEditRosterOpen, setIsEditRosterOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gameplay state
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [displayCandidate, setDisplayCandidate] = useState<string>('?');
  const [pairsResult, setPairsResult] = useState<[string, string][]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Wheel state
  const [wheelRotation, setWheelRotation] = useState(0);

  // Duck race state
  const [duckPositions, setDuckPositions] = useState<number[]>([]);

  useEffect(() => {
    setMounted(true);
    if (students && students.length > 0) {
      setStudentList(students);
      setStudentInput(students.join(', '));
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('random_picker_students');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudentList(parsed);
            setStudentInput(parsed.join(', '));
            return;
          }
        }
        const rawClass =
          sessionStorage.getItem('current_active_class') ||
          localStorage.getItem('current_active_class');
        if (rawClass) {
          const parsed = JSON.parse(rawClass);
          if (Array.isArray(parsed?.students) && parsed.students.length > 0) {
            const names = parsed.students
              .map((s: any) => s.name || s.studentName)
              .filter(Boolean);
            if (names.length > 0) {
              setStudentList(names);
              setStudentInput(names.join(', '));
            }
          }
        }
      } catch (_) {}
    }
  }, [students]);

  useEffect(() => {
    setActiveMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (isOpen) {
      setWinner(null);
      setDisplayCandidate('?');
      setIsRunning(false);
      setPairsResult([]);
    }
  }, [isOpen, activeMode]);

  if (!isOpen || !mounted) return null;

  const currentStudents = studentList.length > 0 ? studentList : DEFAULT_STUDENTS;

  const handleSaveRoster = (list: string[]) => {
    const finalItems = list.length > 0 ? list : DEFAULT_STUDENTS;
    setStudentList(finalItems);
    setStudentInput(finalItems.join(', '));
    setIsEditRosterOpen(false);
    if (onSaveStudents) {
      onSaveStudents(finalItems);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('random_picker_students', JSON.stringify(finalItems));
      } catch (e) {}
    }
  };

  // Launch Random Action
  const handleStart = () => {
    if (isRunning) return;
    setIsRunning(true);
    setWinner(null);

    if (activeMode === 'photo_pair') {
      const shuffled = [...currentStudents].sort(() => 0.5 - Math.random());
      const pairs: [string, string][] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1] || '(Tự chọn nhóm 3)']);
      }
      setTimeout(() => {
        setPairsResult(pairs);
        setIsRunning(false);
        if (soundEnabled) gameAudio.playVictory();
      }, 1500);
      return;
    }

    if (activeMode === 'wheel') {
      const spins = 5 + Math.floor(Math.random() * 5);
      const randomDeg = Math.floor(Math.random() * 360);
      const totalDeg = wheelRotation + spins * 360 + randomDeg;
      setWheelRotation(totalDeg);

      const duration = 3800;
      const intervalTime = 75;
      const startTime = Date.now();

      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
          const rand = currentStudents[Math.floor(Math.random() * currentStudents.length)];
          setDisplayCandidate(rand);
          if (soundEnabled) gameAudio.playTick();
        } else {
          clearInterval(timer);
          const chosen = currentStudents[Math.floor(Math.random() * currentStudents.length)];
          setDisplayCandidate(chosen);
          setWinner(chosen);
          setIsRunning(false);
          if (soundEnabled) gameAudio.playVictory();
        }
      }, intervalTime);
      return;
    }

    if (activeMode === 'duck') {
      return;
    }

    // Default shuffle for marble, blind duck, photo call, lucky lens
    const duration = 2400;
    const intervalTime = 70;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const rand = currentStudents[Math.floor(Math.random() * currentStudents.length)];
        setDisplayCandidate(rand);
        if (soundEnabled) gameAudio.playTick();
      } else {
        clearInterval(interval);
        const finalPick = currentStudents[Math.floor(Math.random() * currentStudents.length)];
        setDisplayCandidate(finalPick);
        setWinner(finalPick);
        setIsRunning(false);
        if (soundEnabled) gameAudio.playVictory();
      }
    }, intervalTime);
  };

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-3 sm:p-5'} bg-black/75 backdrop-blur-md animate-fadeIn select-none`}>
      <div className={`relative w-full ${isFullscreen ? 'h-full max-w-none max-h-none rounded-none' : 'max-w-4xl max-h-[92vh] rounded-3xl'} bg-gradient-to-b from-[#2e1065] via-[#1e1b4b] to-[#0f172a] text-white shadow-2xl border border-purple-500/30 flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <Dices size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-amber-300">
                Gọi Tên Ngẫu Nhiên
              </h2>
              <p className="text-[11px] text-purple-200/80">
                {currentStudents.length} học sinh trong danh sách
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition-colors cursor-pointer"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              onClick={() => setIsEditRosterOpen(!isEditRosterOpen)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/60 hover:bg-purple-600 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Users size={14} />
              <span>Danh sách lớp</span>
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition-colors cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Sub-modes Tab Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-black/20 overflow-x-auto border-b border-white/5 scrollbar-none">
          {RANDOM_MODES.map((m) => {
            const isActive = activeMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (isRunning) return;
                  setActiveMode(m.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                    : 'bg-white/5 hover:bg-white/15 text-purple-200 hover:text-white'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Interactive Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px]">
          {activeMode === 'wheel' ? (
            /* WHEEL MODE */
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-amber-400 filter drop-shadow-md" />

                <div
                  className="w-full h-full rounded-full border-4 border-white shadow-2xl relative overflow-hidden transition-transform ease-out"
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transitionDuration: isRunning ? '3.8s' : '0s',
                    background:
                      'conic-gradient(#f87171 0deg 72deg, #fbbf24 72deg 144deg, #34d399 144deg 216deg, #60a5fa 216deg 288deg, #c084fc 288deg 360deg)',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-slate-900 font-bold border-2 border-slate-300">
                      <LuckyWheelIcon size={28} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1 flex items-center justify-center gap-1">
                  {winner ? (
                    <>
                      <Sparkles size={14} className="text-amber-300" />
                      <span>Học sinh được chọn</span>
                    </>
                  ) : (
                    <span>Đang quay...</span>
                  )}
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-black ${
                    winner ? 'text-amber-300 animate-bounce' : 'text-white'
                  }`}
                >
                  {displayCandidate}
                </div>
              </div>
            </div>
          ) : activeMode === 'duck' ? (
            /* DUCK RACE MODE */
            <div className="w-full h-[460px] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
              <DuckRaceGame
                students={currentStudents}
                soundEnabled={soundEnabled}
                onToggleSound={() => setSoundEnabled((v) => !v)}
                onSelectWinner={(chosen) => {
                  setWinner(chosen);
                  setDisplayCandidate(chosen);
                  setIsRunning(false);
                }}
                onRemoveStudent={(removed) => {
                  setStudentList((prev) => prev.filter((s) => s !== removed));
                }}
              />
            </div>
          ) : activeMode === 'photo_pair' ? (
            /* PHOTO PAIRS MODE */
            <div className="w-full max-w-xl">
              <div className="text-center mb-4">
                <h3 className="text-sm font-bold text-amber-300 flex items-center justify-center gap-1.5">
                  <Sparkles size={15} />
                  <span>
                    {pairsResult.length > 0
                      ? 'Kết quả ghép cặp cả lớp'
                      : 'Bấm Bắt đầu để tự động ghép cặp đôi'}
                  </span>
                </h3>
              </div>
              {pairsResult.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-1">
                  {pairsResult.map(([a, b], idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-white/10 border border-purple-400/30 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-bold text-cyan-300 truncate">{a}</span>
                      <Users size={14} className="text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-purple-300 truncate">{b}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-purple-300/70 border border-dashed border-white/20 rounded-2xl">
                  Bấm nút bên dưới để chia {currentStudents.length} học sinh thành các cặp ngẫu nhiên
                </div>
              )}
            </div>
          ) : (
            /* LUCKY LENS / MARBLE / BLIND DUCK */
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-44 h-44 rounded-full border-4 border-amber-400/80 bg-gradient-to-br from-purple-800 to-indigo-950 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent animate-pulse" />
                <div className="flex items-center justify-center">
                  {activeMode === 'marble' && <MarbleRaceIcon size={56} />}
                  {activeMode === 'blind_duck' && <BlindDuckIcon size={56} />}
                  {activeMode === 'lucky_lens' && <LuckyLensIcon size={56} />}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-purple-300 tracking-widest flex items-center justify-center gap-1 mb-1">
                  {winner ? (
                    <>
                      <Sparkles size={14} className="text-amber-300" />
                      <span>Bạn được gọi là:</span>
                    </>
                  ) : (
                    <span>Đang tìm kiếm...</span>
                  )}
                </span>
                <span
                  className={`text-3xl sm:text-4xl font-black ${
                    winner ? 'text-amber-300 animate-bounce' : 'text-white'
                  }`}
                >
                  {displayCandidate}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Button */}
        {activeMode !== 'duck' && (
          <div className="p-4 bg-white/5 border-t border-white/10 flex items-center justify-between">
            <div className="text-xs text-purple-300/80">
              {RANDOM_MODES.find((m) => m.id === activeMode)?.desc}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStart}
                disabled={isRunning}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isRunning ? (
                  <>
                    <Shuffle className="animate-spin" size={16} />
                    <span>Đang chọn...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} className="fill-slate-950" />
                    <span>
                      {activeMode === 'photo_pair' ? 'Ghép cặp ngẫu nhiên' : 'Bắt đầu gọi tên'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Roster Configuration Modal (Excel/File upload & Number Generator) */}
      <RosterConfigModal
        isOpen={isEditRosterOpen}
        onClose={() => setIsEditRosterOpen(false)}
        students={currentStudents}
        onSave={handleSaveRoster}
        title="Danh sách học sinh"
      />
    </div>,
    document.body
  );
};
