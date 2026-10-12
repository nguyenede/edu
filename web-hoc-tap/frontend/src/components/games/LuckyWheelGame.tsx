'use client';

import React, { useState, useEffect, useRef } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { RotateCw, Sparkles } from 'lucide-react';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { QuestionGridModal } from './QuestionGridModal';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';

interface Question {
  id: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

interface LuckyWheelGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

const WHEEL_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#10B981', '#6366F1', '#F43F5E', '#14B8A6'
];

export const LuckyWheelGame: React.FC<LuckyWheelGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [activeTeamId, setActiveTeamId] = useState<'team1' | 'team2'>('team1');
  const [answeredOptionIdx, setAnsweredOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'large');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, 'unopened' | 'correct' | 'incorrect'>>({});
  const [hasSpun, setHasSpun] = useState(false);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Xanh';
  const team2Name = config.team2Name || 'Đội Đỏ';

  const rotationAngle = useRef(0);
  const totalItems = Math.max(questions.length, 1);
  const arcSize = (2 * Math.PI) / totalItems;

  const currentQ = questions[currentIndex];

  // Draw wheel
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < totalItems; i++) {
      const sliceStart = angle + i * arcSize;
      const sliceEnd = sliceStart + arcSize;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
      const isSolved = questionStatuses[i] !== undefined;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, sliceStart, sliceEnd);
      ctx.fillStyle = isSolved ? '#94a3b8' : color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(sliceStart + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText(`Câu ${i + 1}`, radius - 18, 4);
      ctx.restore();
    }

    // Outer border
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center pin
    ctx.beginPath();
    ctx.arc(center, center, 22, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QUAY', center, center + 4);
  };

  useEffect(() => {
    drawWheel(rotationAngle.current);
  }, [totalItems, questionStatuses]);

  // Timer countdown
  useEffect(() => {
    if (timerSeconds === null || isTimerPaused || isAnswerRevealed || winnerTeamId) return;

    if (timerSeconds <= 0) {
      handleSelectOption(-1);
      return;
    }

    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timerSeconds, isTimerPaused, isAnswerRevealed, winnerTeamId]);

  const toggleSound = () => {
    gameAudio.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => null);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => null);
      setIsFullscreen(false);
    }
  };

  const handleAdjustScore = (teamId: string, delta: number) => {
    if (teamId === 'team1') setTeam1Score((s) => Math.max(0, s + delta));
    else setTeam2Score((s) => Math.max(0, s + delta));
  };

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setIsAnswerRevealed(false);
    setAnsweredOptionIdx(null);
    gameAudio.playWhistle();

    // Find unopened indices
    const unopened = Array.from({ length: totalItems })
      .map((_, i) => i)
      .filter((i) => !questionStatuses[i]);

    const targetIdx = unopened.length > 0
      ? unopened[Math.floor(Math.random() * unopened.length)]
      : Math.floor(Math.random() * totalItems);

    const fullRotations = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const targetSliceAngle = (2 * Math.PI) - (targetIdx * arcSize + arcSize / 2);
    const finalAngle = fullRotations + targetSliceAngle;

    const duration = 2800;
    const startTime = performance.now();
    const startAngle = rotationAngle.current % (2 * Math.PI);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (finalAngle - startAngle) * ease;

      rotationAngle.current = currentAngle;
      drawWheel(currentAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setHasSpun(true);
        setCurrentIndex(targetIdx);
        setTimerSeconds(initialTime);
        gameAudio.playPop();
      }
    };

    requestAnimationFrame(animate);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerRevealed || winnerTeamId || !currentQ) return;

    const opt = idx >= 0 ? currentQ.options[idx] : null;
    const isCorrect = Boolean(opt?.isCorrect);

    setAnsweredOptionIdx(idx);
    setIsAnswerRevealed(true);

    setQuestionStatuses((prev) => ({
      ...prev,
      [currentIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      if (activeTeamId === 'team1') setTeam1Score((s) => s + 10);
      else setTeam2Score((s) => s + 10);
    } else {
      gameAudio.playIncorrect();
      setActiveTeamId(activeTeamId === 'team1' ? 'team2' : 'team1');
    }
  };

  const handleNextQuestion = () => {
    const solvedCount = Object.keys(questionStatuses).length;
    if (solvedCount >= questions.length) {
      setIsVictoryModalOpen(true);
      return;
    }

    // Auto spin or move to next
    spinWheel();
    setActiveTeamId(activeTeamId === 'team1' ? 'team2' : 'team1');
  };

  const handleSelectQuestionFromGrid = (index: number) => {
    setHasSpun(true);
    setCurrentIndex(index);
    setAnsweredOptionIdx(null);
    setIsAnswerRevealed(false);
    setTimerSeconds(initialTime);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setTeam1Score(0);
    setTeam2Score(0);
    setActiveTeamId('team1');
    setAnsweredOptionIdx(null);
    setIsAnswerRevealed(false);
    setWinnerTeamId(null);
    setIsVictoryModalOpen(false);
    setQuestionStatuses({});
    setTimerSeconds(initialTime);
    gameAudio.playWhistle();
  };

  const teams: ClassroomTeam[] = [
    {
      id: 'team1',
      name: team1Name,
      score: team1Score,
      color: 'bg-purple-600',
      borderColor: 'border-purple-400',
      bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-amber-600',
      borderColor: 'border-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    },
  ];

  return (
    <div className="w-full bg-[#f4f7fb] dark:bg-[#151618] rounded-3xl shadow-xl border border-slate-200/90 dark:border-white/10 overflow-hidden flex flex-col transition-all">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Vòng quay may mắn"
        teams={teams}
        activeTeamId={activeTeamId}
        onSelectActiveTeam={(id) => setActiveTeamId(id as 'team1' | 'team2')}
        onAdjustScore={handleAdjustScore}
        timerSeconds={timerSeconds}
        isTimerPaused={isTimerPaused}
        onTogglePauseTimer={() => setIsTimerPaused(!isTimerPaused)}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onOpenQuestionGrid={() => setIsGridOpen(true)}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onBack={onBack}
        onRestart={handleRestart}
        onOpenSettings={onOpenSettings}
      />

      {/* 2. VISUAL SPINNING WHEEL STAGE */}
      <div className="p-3.5 sm:p-6 flex flex-col items-center justify-center space-y-5">
        <div className="w-full max-w-4xl bg-gradient-to-b from-purple-100 via-indigo-100 to-purple-200 dark:from-purple-950/70 dark:via-indigo-950/50 dark:to-purple-950/70 rounded-3xl p-4 sm:p-6 border border-purple-300 dark:border-purple-800/50 shadow-lg flex flex-col items-center justify-center relative">
          <div className="relative mb-2">
            {/* Top pointer arrow with neon drop shadow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 z-10 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-500 filter drop-shadow-lg" />

            {/* Canvas Wheel */}
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              className="w-[250px] h-[250px] sm:w-[300px] sm:h-[300px] rounded-full cursor-pointer shadow-2xl active:scale-98 transition-transform border-4 border-white dark:border-zinc-800"
              onClick={spinWheel}
            />
          </div>

          {/* Spin Button */}
          <button
            type="button"
            disabled={isSpinning}
            onClick={spinWheel}
            className={`mt-2 px-8 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer shadow-lg active:scale-95 ${
              isSpinning
                ? 'bg-slate-300 dark:bg-zinc-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-purple-500/25 ring-2 ring-purple-400/40'
            }`}
          >
            <RotateCw size={17} className={isSpinning ? 'animate-spin' : ''} />
            <span>{isSpinning ? 'Đang quay số...' : 'Bắt đầu quay chọn câu 🎡'}</span>
          </button>
        </div>

        {/* 3. CLASSROOM QUESTION BOARD */}
        {hasSpun || Object.keys(questionStatuses).length > 0 ? (
          currentQ ? (
            <div className="w-full max-w-4xl">
              <ClassroomQuestionCard
                question={currentQ}
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
                activeTeamName={activeTeamId === 'team1' ? team1Name : team2Name}
                activeTeamColor={activeTeamId === 'team1' ? 'bg-purple-600' : 'bg-amber-600'}
                answeredOptionIdx={answeredOptionIdx}
                isRevealed={isAnswerRevealed}
                fontSize={fontSize}
                onSelectOption={handleSelectOption}
                onNextQuestion={handleNextQuestion}
                onOpenQuestionGrid={() => setIsGridOpen(true)}
                isLastQuestion={Object.keys(questionStatuses).length >= questions.length}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">Chưa có câu hỏi.</div>
          )
        ) : (
          <div className="w-full max-w-4xl p-6 sm:p-8 bg-white dark:bg-[#1e1f20] rounded-2xl border border-slate-200/80 dark:border-white/10 text-center shadow-xs flex flex-col items-center justify-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl mb-1 shadow-inner">
              🎡
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Sẵn sàng cho vòng quay may mắn!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Bấm nút &quot;Bắt đầu quay chọn câu&quot; ở trên hoặc chọn số câu hỏi từ thanh công cụ để bắt đầu vòng thi đấu cho cả lớp.
            </p>
          </div>
        )}
      </div>

      {/* QUESTION GRID MODAL */}
      <QuestionGridModal
        isOpen={isGridOpen}
        onClose={() => setIsGridOpen(false)}
        questionsCount={questions.length}
        currentIndex={currentIndex}
        statuses={questionStatuses}
        onSelectQuestion={handleSelectQuestionFromGrid}
      />

      {/* VICTORY CELEBRATION MODAL */}
      <ClassroomVictoryModal
        isOpen={isVictoryModalOpen}
        teams={teams}
        winnerTeamId={winnerTeamId}
        onRestart={handleRestart}
        onBack={onBack}
      />
    </div>
  );
};
