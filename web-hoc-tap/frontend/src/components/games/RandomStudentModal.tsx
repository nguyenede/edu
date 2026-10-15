'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Shuffle, Users, Award, RotateCcw } from 'lucide-react';
import { gameAudio } from '@/lib/gameSound';

interface RandomStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentSelected?: (studentName: string) => void;
}

export const RandomStudentModal: React.FC<RandomStudentModalProps> = ({
  isOpen,
  onClose,
  onStudentSelected,
}) => {
  const [mode, setMode] = useState<'number' | 'name'>('number');
  const [totalStudents, setTotalStudents] = useState<number>(40);
  const [namesText, setNamesText] = useState<string>(
    'Nguyễn Văn An, Trần Thị Bích, Lê Hoàng Cường, Phạm Minh Đức, Vũ Ngọc Hân, Đỗ Hoàng Long, Mai Thảo Linh, Bùi Quốc Nam'
  );
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [displayNumber, setDisplayNumber] = useState<number | string>('?');

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(null);
      setDisplayNumber('?');
      setIsSpinning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedStudent(null);

    let parsedNames: string[] = [];
    if (mode === 'name') {
      parsedNames = namesText
        .split(/[,\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);
      if (parsedNames.length === 0) {
        parsedNames = ['Học sinh A', 'Học sinh B', 'Học sinh C'];
      }
    }

    const duration = 2000;
    const intervalTime = 60;
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        if (mode === 'number') {
          const randNum = Math.floor(Math.random() * totalStudents) + 1;
          setDisplayNumber(randNum);
        } else {
          const randName = parsedNames[Math.floor(Math.random() * parsedNames.length)];
          setDisplayNumber(randName);
        }
        gameAudio.playTick();
      } else {
        clearInterval(interval);
        let finalResult = '';
        if (mode === 'number') {
          const finalNum = Math.floor(Math.random() * totalStudents) + 1;
          setDisplayNumber(finalNum);
          finalResult = `Số ${finalNum}`;
        } else {
          const finalName = parsedNames[Math.floor(Math.random() * parsedNames.length)];
          setDisplayNumber(finalName);
          finalResult = finalName;
        }
        setSelectedStudent(finalResult);
        setIsSpinning(false);
        gameAudio.playVictory();
      }
    }, intervalTime);
  };

  const handleConfirm = () => {
    if (selectedStudent && onStudentSelected) {
      onStudentSelected(selectedStudent);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0 duration-150 select-none">
      <div className="bg-white dark:bg-[#1c1d21] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-google-blue flex items-center justify-center shadow-2xs">
              <Shuffle size={20} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Gọi tên ngẫu nhiên
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('number');
              setSelectedStudent(null);
              setDisplayNumber('?');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
              mode === 'number'
                ? 'bg-white dark:bg-[#25262b] text-google-blue dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Theo số thứ tự (Sĩ số)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('name');
              setSelectedStudent(null);
              setDisplayNumber('?');
            }}
            className={`flex-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
              mode === 'name'
                ? 'bg-white dark:bg-[#25262b] text-google-blue dark:text-blue-400 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Theo danh sách tên
          </button>
        </div>

        {/* Inputs */}
        {mode === 'number' ? (
          <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 px-1">
            <span>Sĩ số học sinh cả lớp:</span>
            <div className="flex items-center gap-2.5">
              <input
                type="number"
                min={2}
                max={60}
                value={totalStudents}
                onChange={(e) => setTotalStudents(Math.max(2, Math.min(60, Number(e.target.value))))}
                className="w-20 px-3 py-1.5 text-center font-black text-base rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs font-semibold">(1 - {totalStudents})</span>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Danh sách tên học sinh, ngăn cách bởi dấu phẩy:
            </label>
            <textarea
              rows={3}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên học sinh..."
            />
          </div>
        )}

        {/* Display Box */}
        <div className="py-8 px-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/80 dark:border-white/10 flex flex-col items-center justify-center min-h-[160px] sm:min-h-[180px] text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            {isSpinning ? 'Đang quay ngẫu nhiên...' : selectedStudent ? 'Học sinh được chọn' : 'Sẵn sàng'}
          </span>
          <div
            className={`font-black tracking-tight transition-transform ${
              isSpinning ? 'scale-110 text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'
            } ${
              typeof displayNumber === 'number' || (String(displayNumber).length <= 3 && !isNaN(Number(displayNumber)))
                ? 'text-6xl sm:text-7xl'
                : 'text-3xl sm:text-4xl'
            }`}
          >
            {displayNumber}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={isSpinning}
            onClick={handleSpin}
            className="flex-1 py-3 px-5 rounded-2xl bg-google-blue hover:bg-blue-600 text-white font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <Shuffle size={19} className={isSpinning ? 'animate-spin' : ''} />
            <span>{isSpinning ? 'Đang chọn...' : 'Quay ngẫu nhiên'}</span>
          </button>

          {selectedStudent && (
            <button
              type="button"
              onClick={handleConfirm}
              className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-sm transition-all cursor-pointer active:scale-98"
            >
              Chọn bạn này
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
