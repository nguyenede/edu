'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { Sparkles, Trophy } from 'lucide-react';
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

interface GoldMinerGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

interface MineItem {
  id: number;
  questionIndex: number;
  emoji: string;
  label: string;
  points: number;
}

export const GoldMinerGame: React.FC<GoldMinerGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
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
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Xanh';
  const team2Name = config.team2Name || 'Đội Đỏ';

  const currentQ = questions[currentIndex];

  // Mine Items
  const mineItems: MineItem[] = questions.map((_, idx) => {
    const emojis = ['🪙', '💎', '💰', '👑', '⭐', '📦'];
    return {
      id: idx,
      questionIndex: idx,
      emoji: emojis[idx % emojis.length],
      label: `Câu ${idx + 1}`,
      points: 10 + (idx % 3) * 5,
    };
  });

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
      setIsPulling(true);
      gameAudio.playCorrect();
      gameAudio.playCoin();
      const pts = mineItems[currentIndex]?.points || 10;
      if (activeTeamId === 'team1') setTeam1Score((s) => s + pts);
      else setTeam2Score((s) => s + pts);

      setTimeout(() => setIsPulling(false), 800);
    } else {
      gameAudio.playIncorrect();
      setActiveTeamId(activeTeamId === 'team1' ? 'team2' : 'team1');
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setAnsweredOptionIdx(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(initialTime);
      setActiveTeamId(activeTeamId === 'team1' ? 'team2' : 'team1');
    } else {
      setIsVictoryModalOpen(true);
    }
  };

  const handleSelectQuestionFromGrid = (index: number) => {
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
      color: 'bg-amber-600',
      borderColor: 'border-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-indigo-600',
      borderColor: 'border-indigo-400',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
  ];

  return (
    <div className="w-full bg-[#f0f4f9] dark:bg-[#282a2c] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Đào vàng kiến thức"
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

      {/* 2. VISUAL GOLD MINE STAGE */}
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-4xl bg-gradient-to-b from-amber-200 via-amber-100 to-amber-300 dark:from-amber-950/50 dark:via-stone-900 dark:to-stone-950 rounded-2xl p-4 sm:p-6 border border-amber-300 dark:border-amber-800/40 shadow-inner flex flex-col justify-between min-h-[220px]">
          {/* Top Crane & Miner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">👴🏻</span>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                <span>Bác thợ đào vàng</span>
                <p className="text-[10px] text-amber-700 dark:text-amber-400">Chọn kho báu để giải đố</p>
              </div>
            </div>

            {/* Hook Wire */}
            <div className="flex flex-col items-center">
              <div className={`w-1 bg-stone-700 transition-all duration-500 ${isPulling ? 'h-14' : 'h-6'}`} />
              <span className={`text-xl transition-transform ${isPulling ? 'scale-125' : ''}`}>🪝</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/50 border border-amber-300 dark:border-amber-700 text-xs font-bold text-amber-800 dark:text-amber-300 shadow-xs">
              💰 Kho báu đang mở: Câu {currentIndex + 1} (+{mineItems[currentIndex]?.points || 10}đ)
            </div>
          </div>

          {/* Underground Mine Items Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3.5 pt-4">
            {mineItems.map((item) => {
              const status = questionStatuses[item.questionIndex];
              const isCurrent = currentIndex === item.questionIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectQuestionFromGrid(item.questionIndex)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-400/30 border-amber-500 ring-2 ring-amber-400 scale-105 shadow-md font-bold'
                      : status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 opacity-60'
                      : status === 'incorrect'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-300 opacity-60'
                      : 'bg-white/60 dark:bg-white/10 border-amber-300/60 dark:border-white/10 hover:scale-103'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl mb-1">{item.emoji}</span>
                  <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                    +{item.points}đ
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. CLASSROOM QUESTION BOARD */}
        {currentQ ? (
          <div className="w-full max-w-4xl">
            <ClassroomQuestionCard
              question={currentQ}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              activeTeamName={activeTeamId === 'team1' ? team1Name : team2Name}
              activeTeamColor={activeTeamId === 'team1' ? 'bg-amber-600' : 'bg-indigo-600'}
              answeredOptionIdx={answeredOptionIdx}
              isRevealed={isAnswerRevealed}
              fontSize={fontSize}
              onSelectOption={handleSelectOption}
              onNextQuestion={handleNextQuestion}
              onOpenQuestionGrid={() => setIsGridOpen(true)}
              isLastQuestion={currentIndex + 1 >= questions.length}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">Chưa có câu hỏi.</div>
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
