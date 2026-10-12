'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { QuestionGridModal } from './QuestionGridModal';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';
import { Trophy, Sparkles } from 'lucide-react';

interface Question {
  id: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

interface TugOfWarGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

export const TugOfWarGame: React.FC<TugOfWarGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ropePosition, setRopePosition] = useState(0); // -maxPullLimit to +maxPullLimit
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [activeTeamId, setActiveTeamId] = useState<'blue' | 'red'>('blue');
  const [answeredOptionIdx, setAnsweredOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'large');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, 'unopened' | 'correct' | 'incorrect'>>({});
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Xanh';
  const team2Name = config.team2Name || 'Đội Đỏ';
  const maxPullLimit = Math.min(Math.max(config.winDifference || 3, 2), 6);

  const currentQ = questions[currentIndex];

  // Timer countdown
  useEffect(() => {
    if (timerSeconds === null || isTimerPaused || isAnswerRevealed || winnerTeamId) return;

    if (timerSeconds <= 0) {
      // Time up: reveal incorrect
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
    if (teamId === 'blue') setBlueScore((s) => Math.max(0, s + delta));
    else setRedScore((s) => Math.max(0, s + delta));
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerRevealed || winnerTeamId || !currentQ) return;

    const opt = idx >= 0 ? currentQ.options[idx] : null;
    const isCorrect = Boolean(opt?.isCorrect);

    setAnsweredOptionIdx(idx);
    setIsAnswerRevealed(true);

    // Update question status
    setQuestionStatuses((prev) => ({
      ...prev,
      [currentIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      gameAudio.playPull();

      if (activeTeamId === 'blue') {
        const nextPos = ropePosition - 1;
        setRopePosition(nextPos);
        setBlueScore((s) => s + 10);
        if (nextPos <= -maxPullLimit) {
          setWinnerTeamId('blue');
          setIsVictoryModalOpen(true);
        }
      } else {
        const nextPos = ropePosition + 1;
        setRopePosition(nextPos);
        setRedScore((s) => s + 10);
        if (nextPos >= maxPullLimit) {
          setWinnerTeamId('red');
          setIsVictoryModalOpen(true);
        }
      }
    } else {
      gameAudio.playIncorrect();
      // On incorrect, switch turn to opposing team for next chance
      setActiveTeamId(activeTeamId === 'blue' ? 'red' : 'blue');
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setAnsweredOptionIdx(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(initialTime);
      // Alternate team turns
      setActiveTeamId(activeTeamId === 'blue' ? 'red' : 'blue');
    } else {
      // Finished all questions
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
    setRopePosition(0);
    setBlueScore(0);
    setRedScore(0);
    setActiveTeamId('blue');
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
      id: 'blue',
      name: team1Name,
      score: blueScore,
      color: 'bg-blue-600',
      borderColor: 'border-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      id: 'red',
      name: team2Name,
      score: redScore,
      color: 'bg-rose-600',
      borderColor: 'border-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  const ropePercent = ((ropePosition + maxPullLimit) / (maxPullLimit * 2)) * 100;

  return (
    <div className="w-full bg-[#f0f4f9] dark:bg-[#282a2c] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Kéo co kiến thức"
        teams={teams}
        activeTeamId={activeTeamId}
        onSelectActiveTeam={(id) => setActiveTeamId(id as 'blue' | 'red')}
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

      {/* 2. VISUAL TUG OF WAR ARENA */}
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-4xl bg-gradient-to-b from-emerald-100 to-emerald-200 dark:from-emerald-950/50 dark:to-emerald-900/30 rounded-2xl p-4 sm:p-6 border border-emerald-300 dark:border-emerald-800/50 shadow-inner flex flex-col justify-between min-h-[190px] sm:min-h-[220px]">
          {/* Arena Top Indicators */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-black px-2">
            <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <span>{team1Name}</span>
              <span className="text-[11px] font-normal">(-{maxPullLimit} mốc thắng)</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-white/80 dark:bg-black/50 text-xs font-bold text-slate-700 dark:text-zinc-200 shadow-xs border border-emerald-300 dark:border-emerald-800">
              {ropePosition === 0
                ? '⚖️ Cân bằng'
                : ropePosition < 0
                ? `⬅️ ${team1Name} dẫn trước ${Math.abs(ropePosition)} nấc`
                : `➡️ ${team2Name} dẫn trước ${ropePosition} nấc`}
            </div>

            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
              <span>{team2Name}</span>
              <span className="text-[11px] font-normal">(+{maxPullLimit} mốc thắng)</span>
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
            </div>
          </div>

          {/* Interactive Rope and Characters Stage */}
          <div className="relative w-full my-auto py-6">
            {/* Ground line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-emerald-600/30 dark:bg-emerald-400/20 -translate-y-1/2 rounded" />

            {/* Center winning boundary lines */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-16 border-l-2 border-dashed border-red-500/60 z-0" />
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-0.5 h-10 border-l border-blue-500/40" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-0.5 h-10 border-r border-rose-500/40" />

            {/* Rope */}
            <div className="relative w-full h-3.5 bg-amber-700 rounded-full shadow-md overflow-visible">
              {/* Center Red Ribbon */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-rose-600 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all duration-300 ease-out z-10"
                style={{ left: `${ropePercent}%` }}
              >
                <div className="w-1.5 h-6 bg-yellow-300 rotate-45 rounded-xs" />
              </div>
            </div>

            {/* Team 1 Character Row (Left) */}
            <div
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 transition-transform duration-300"
              style={{ transform: `translateX(${ropePosition * 14}px) translateY(-50%)` }}
            >
              <span className="text-2xl sm:text-4xl animate-bounce">👦</span>
              <span className="text-2xl sm:text-4xl">🧒</span>
              <span className="text-2xl sm:text-4xl">🧑</span>
            </div>

            {/* Team 2 Character Row (Right) */}
            <div
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2 transition-transform duration-300"
              style={{ transform: `translateX(${ropePosition * 14}px) translateY(-50%)` }}
            >
              <span className="text-2xl sm:text-4xl">👧</span>
              <span className="text-2xl sm:text-4xl">🧒</span>
              <span className="text-2xl sm:text-4xl animate-bounce">👦</span>
            </div>
          </div>

          {/* Scale steps indicators */}
          <div className="flex items-center justify-between px-4 text-[10px] sm:text-xs font-mono font-bold text-slate-500">
            <span>🏁 Mốc thắng Xanh</span>
            <div className="flex gap-2 sm:gap-4">
              {Array.from({ length: maxPullLimit * 2 + 1 }).map((_, i) => {
                const val = i - maxPullLimit;
                return (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      ropePosition === val
                        ? 'bg-rose-600 text-white shadow-xs font-black'
                        : 'bg-emerald-300/80 dark:bg-emerald-950 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    {val === 0 ? '•' : ''}
                  </span>
                );
              })}
            </div>
            <span>Mốc thắng Đỏ 🏁</span>
          </div>
        </div>

        {/* 3. CLASSROOM QUESTION BOARD */}
        {currentQ ? (
          <div className="w-full max-w-4xl">
            <ClassroomQuestionCard
              question={currentQ}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              activeTeamName={activeTeamId === 'blue' ? team1Name : team2Name}
              activeTeamColor={activeTeamId === 'blue' ? 'bg-blue-600' : 'bg-rose-600'}
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
          <div className="p-8 text-center text-slate-500">Không có câu hỏi nào trong đề thi này.</div>
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
