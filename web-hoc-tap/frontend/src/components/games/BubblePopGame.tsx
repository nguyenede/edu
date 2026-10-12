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

interface BubblePopGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

interface BubbleItem {
  id: number;
  questionIndex: number;
  emoji: string;
  label: string;
  points: number;
}

export const BubblePopGame: React.FC<BubblePopGameProps> = ({
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
  const [isPopped, setIsPopped] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Cá Heo';
  const team2Name = config.team2Name || 'Đội Rùa Biển';

  const currentQ = questions[currentIndex];

  const bubbleItems: BubbleItem[] = questions.map((_, idx) => {
    const seaCreatures = ['🐬', '🐢', '🐙', '🐠', '🐳', '🦀', '⭐'];
    return {
      id: idx,
      questionIndex: idx,
      emoji: seaCreatures[idx % seaCreatures.length],
      label: `Bóng ${idx + 1}`,
      points: 10 + (idx % 2) * 5,
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
      setIsPopped(true);
      gameAudio.playCorrect();
      gameAudio.playPop();
      const pts = bubbleItems[currentIndex]?.points || 10;
      if (activeTeamId === 'team1') setTeam1Score((s) => s + pts);
      else setTeam2Score((s) => s + pts);

      setTimeout(() => setIsPopped(false), 800);
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
      color: 'bg-sky-600',
      borderColor: 'border-sky-400',
      bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-teal-600',
      borderColor: 'border-teal-400',
      bgLight: 'bg-teal-50 dark:bg-teal-950/40',
    },
  ];

  return (
    <div className="w-full bg-[#f0f4f9] dark:bg-[#282a2c] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Bắt bong bóng đại dương"
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

      {/* 2. VISUAL OCEAN REEF BUBBLE ARENA */}
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-4xl bg-gradient-to-b from-sky-300 via-teal-200 to-blue-400 dark:from-sky-950/60 dark:via-teal-950/40 dark:to-blue-950/50 rounded-2xl p-4 sm:p-6 border border-sky-300 dark:border-sky-800/40 shadow-inner flex flex-col justify-between min-h-[220px]">
          {/* Top Banner */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-sky-950 dark:text-sky-200">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🫧</span>
              <div>
                <span>Thủy cung tri thức đại dương</span>
                <p className="text-[10px] text-sky-800 dark:text-sky-400">
                  Bấm nổ bong bóng để giải cứu sinh vật biển
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/50 border border-sky-300 dark:border-sky-700 text-xs font-bold text-sky-900 dark:text-sky-300 shadow-xs">
              <span className={`text-2xl transition-transform ${isPopped ? 'scale-125' : ''}`}>
                {isPopped ? '✨' : bubbleItems[currentIndex]?.emoji || '🐬'}
              </span>
              <span>Đang mở: Câu {currentIndex + 1}</span>
            </div>
          </div>

          {/* Bubbles Floating Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3.5 pt-4">
            {bubbleItems.map((item) => {
              const status = questionStatuses[item.questionIndex];
              const isCurrent = currentIndex === item.questionIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectQuestionFromGrid(item.questionIndex)}
                  className={`flex flex-col items-center justify-center p-3 rounded-full aspect-square border transition-all cursor-pointer shadow-xs ${
                    isCurrent
                      ? 'bg-sky-400/40 border-sky-500 ring-4 ring-sky-300 scale-108 font-bold'
                      : status === 'correct'
                      ? 'bg-emerald-500/25 border-emerald-500 text-emerald-800 dark:text-emerald-300 opacity-60'
                      : status === 'incorrect'
                      ? 'bg-rose-500/25 border-rose-500 text-rose-800 dark:text-rose-300 opacity-60'
                      : 'bg-white/60 dark:bg-white/10 border-sky-200/80 dark:border-white/10 hover:scale-105'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl mb-0.5">{item.emoji}</span>
                  <span className="text-[10px] font-bold text-sky-950 dark:text-sky-100">
                    Câu {item.questionIndex + 1}
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
              activeTeamColor={activeTeamId === 'team1' ? 'bg-sky-600' : 'bg-teal-600'}
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
