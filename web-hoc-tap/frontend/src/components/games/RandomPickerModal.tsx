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
  RotateCcw
} from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';

export type RandomPickerSubMode =
  | 'wheel'
  | 'duck'
  | 'marble'
  | 'blind_duck'
  | 'photo_call'
  | 'photo_pair'
  | 'lucky_lens';

interface RandomPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: RandomPickerSubMode;
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
  icon: string;
  desc: string;
  color: string;
}[] = [
  { id: 'wheel', title: 'Vòng quay', icon: '🎡', desc: 'Vòng quay nhiều màu sắc may mắn gọi tên ngẫu nhiên', color: '#ea580c' },
  { id: 'duck', title: 'Đua vịt', icon: '🦆', desc: 'Đàn vịt bơi đua tốc độ về đích để chọn bạn chiến thắng', color: '#0891b2' },
  { id: 'marble', title: 'Đua bi', icon: '🔮', desc: 'Đường đua bi ngẫu nhiên qua các chướng ngại vật', color: '#7c3aed' },
  { id: 'blind_duck', title: 'Bắt vịt 3D', icon: '🙈', desc: 'Bắt chú vịt bồng bềnh dưới hồ nước', color: '#db2777' },
  { id: 'photo_call', title: 'Gọi tên bằng ảnh', icon: '🖼️', desc: 'Thẻ tên học sinh bay lướt và dừng lại ngẫu nhiên', color: '#16a34a' },
  { id: 'photo_pair', title: 'Ghép cặp bằng ảnh', icon: '👥', desc: 'Tự động ghép đôi cả lớp thành từng cặp học tập', color: '#ea580c' },
  { id: 'lucky_lens', title: 'Ống kính may mắn', icon: '📷', desc: 'Kính ngắm camera quét và khóa mục tiêu bạn học sinh', color: '#0891b2' },
];

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'wheel',
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeMode, setActiveMode] = useState<RandomPickerSubMode>(initialMode);
  const [studentList, setStudentList] = useState<string[]>(DEFAULT_STUDENTS);
  const [studentInput, setStudentInput] = useState<string>(DEFAULT_STUDENTS.join(', '));
  const [isEditRosterOpen, setIsEditRosterOpen] = useState(false);

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
    if (typeof window !== 'undefined') {
      try {
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
  }, []);

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

  const handleApplyRoster = () => {
    const list = studentInput
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (list.length > 0) {
      setStudentList(list);
    }
    setIsEditRosterOpen(false);
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
      const racers = currentStudents.slice(0, 6);
      setDuckPositions(racers.map(() => 0));
      const startTime = Date.now();
      const raceDuration = 3200;

      const raceTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / raceDuration);

        setDuckPositions(() =>
          racers.map(() => {
            const speedFactor = 0.65 + Math.random() * 0.7;
            return Math.min(92, progress * 90 * speedFactor);
          })
        );

        if (soundEnabled) gameAudio.playTick();

        if (elapsed >= raceDuration) {
          clearInterval(raceTimer);
          const winningIdx = Math.floor(Math.random() * racers.length);
          const winningDuck = racers[winningIdx];
          setDuckPositions((prev) =>
            racers.map((_, i) => (i === winningIdx ? 95 : Math.min(90, (prev[i] || 0) + 5)))
          );
          setWinner(winningDuck);
          setDisplayCandidate(winningDuck);
          setIsRunning(false);
          if (soundEnabled) gameAudio.playVictory();
        }
      }, 140);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-gradient-to-b from-[#2e1065] via-[#1e1b4b] to-[#0f172a] text-white rounded-3xl shadow-2xl border border-purple-500/30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎲</span>
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
          {isEditRosterOpen ? (
            /* Edit Roster Panel */
            <div className="w-full max-w-lg bg-white/10 p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                <Users size={16} />
                <span>Nhập danh sách học sinh (cách nhau bởi dấu phẩy hoặc xuống dòng)</span>
              </h3>
              <textarea
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                rows={5}
                className="w-full p-3 rounded-xl bg-black/40 border border-white/20 text-xs text-white focus:outline-none focus:border-amber-400 font-sans"
                placeholder="Nhập tên học sinh..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditRosterOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  onClick={handleApplyRoster}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Lưu danh sách ({studentInput.split(/[,\n]/).filter((s) => s.trim().length > 0).length} bạn)
                </button>
              </div>
            </div>
          ) : activeMode === 'wheel' ? (
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
                    <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-slate-900 font-bold text-xs border-2 border-slate-300">
                      🎡
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="text-xs uppercase tracking-widest text-purple-300 font-semibold mb-1">
                  {winner ? '🎉 Học sinh được chọn' : 'Đang quay...'}
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
            <div className="w-full max-w-xl space-y-2.5">
              <div className="text-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {winner ? `🏆 Vịt về đích đầu tiên: ${winner}` : 'Đua vịt tốc độ'}
                </span>
              </div>
              {currentStudents.slice(0, 6).map((student, idx) => {
                const pos = duckPositions[idx] || 0;
                const isDuckWinner = winner === student;
                return (
                  <div
                    key={student}
                    className="relative p-2 rounded-xl bg-blue-950/60 border border-cyan-500/30 overflow-hidden flex items-center"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-blue-900/40 pointer-events-none" />

                    <div
                      className="relative z-10 transition-all ease-out flex items-center gap-1.5"
                      style={{
                        transform: `translateX(${pos * 3.6}px)`,
                        transitionDuration: '0.2s',
                      }}
                    >
                      <span className="text-2xl filter drop-shadow">🦆</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          isDuckWinner
                            ? 'bg-amber-400 text-slate-900 font-black'
                            : 'bg-black/50 text-white'
                        }`}
                      >
                        {student}
                      </span>
                    </div>

                    <div className="absolute right-3 top-0 bottom-0 w-2 border-r-2 border-dashed border-red-500 flex items-center justify-center">
                      <span className="text-[10px] text-red-400 font-bold -mr-4">ĐÍCH</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeMode === 'photo_pair' ? (
            /* PHOTO PAIRS MODE */
            <div className="w-full max-w-xl">
              <div className="text-center mb-4">
                <h3 className="text-sm font-bold text-amber-300">
                  {pairsResult.length > 0
                    ? '✨ Kết quả ghép cặp cả lớp'
                    : 'Bấm Bắt đầu để tự động ghép cặp đôi'}
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
                      <span className="text-xs text-amber-400 font-black">🤝</span>
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
            /* LUCKY LENS / MARBLE / BLIND DUCK / PHOTO CALL */
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-44 h-44 rounded-full border-4 border-amber-400/80 bg-gradient-to-br from-purple-800 to-indigo-950 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent animate-pulse" />
                <div className="text-5xl filter drop-shadow-md">
                  {activeMode === 'marble' && '🔮'}
                  {activeMode === 'blind_duck' && '🦆'}
                  {activeMode === 'photo_call' && '🖼️'}
                  {activeMode === 'lucky_lens' && '📷'}
                </div>
              </div>

              <div>
                <span className="text-xs uppercase font-bold text-purple-300 tracking-widest block mb-1">
                  {winner ? '🎉 Bạn được gọi là:' : 'Đang tìm kiếm...'}
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
      </div>
    </div>,
    document.body
  );
};
