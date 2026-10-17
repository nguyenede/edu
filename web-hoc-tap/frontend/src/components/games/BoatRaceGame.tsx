'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { QuestionGridModal } from './QuestionGridModal';
import { RandomStudentModal } from './RandomStudentModal';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';
import { Flag, Waves, Sparkles, Navigation } from 'lucide-react';

interface Question {
  id: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

interface BoatRaceGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

export const BoatRaceGame: React.FC<BoatRaceGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [team1Progress, setTeam1Progress] = useState(0); // 0 to 100
  const [team2Progress, setTeam2Progress] = useState(0); // 0 to 100
  const [activeTeamId, setActiveTeamId] = useState<'team1' | 'team2'>('team1');
  const [answeredOptionIdx, setAnsweredOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'normal');
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, 'unopened' | 'correct' | 'incorrect'>>({});
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Thuyền Xanh';
  const team2Name = config.team2Name || 'Thuyền Đỏ';

  const currentQ = questions[currentIndex];
  const stepPerCorrect = Math.max(15, Math.min(35, Math.round(100 / Math.max(questions.length / 2, 3))));

  // Timer countdown
  useEffect(() => {
    if (timerSeconds === null || isTimerPaused || isAnswerRevealed || winnerTeamId) return;

    if (timerSeconds <= 0) {
      handleSelectOption(-1);
      return;
    }

    if (timerSeconds <= 5 && timerSeconds > 0) {
      gameAudio.playTick();
    }

    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timerSeconds, isTimerPaused, isAnswerRevealed, winnerTeamId]);

  // Listen to fullscreen changes (e.g. user pressed Esc or F11)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

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
    if (teamId === 'team1') {
      setTeam1Score((s) => Math.max(0, s + delta));
      setTeam1Progress((p) => Math.min(100, Math.max(0, p + delta * stepPerCorrect)));
    } else {
      setTeam2Score((s) => Math.max(0, s + delta));
      setTeam2Progress((p) => Math.min(100, Math.max(0, p + delta * stepPerCorrect)));
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerRevealed) return;
    setAnsweredOptionIdx(idx);
    setIsAnswerRevealed(true);

    const isCorrect = idx >= 0 && Boolean(currentQ?.options[idx]?.isCorrect);
    setQuestionStatuses((prev) => ({
      ...prev,
      [currentIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      if (activeTeamId === 'team1') {
        const nextScore = team1Score + 1;
        const nextProgress = Math.min(100, team1Progress + stepPerCorrect);
        setTeam1Score(nextScore);
        setTeam1Progress(nextProgress);
        if (nextProgress >= 100) {
          setWinnerTeamId('team1');
          gameAudio.playVictory();
          setIsVictoryModalOpen(true);
        }
      } else {
        const nextScore = team2Score + 1;
        const nextProgress = Math.min(100, team2Progress + stepPerCorrect);
        setTeam2Score(nextScore);
        setTeam2Progress(nextProgress);
        if (nextProgress >= 100) {
          setWinnerTeamId('team2');
          gameAudio.playVictory();
          setIsVictoryModalOpen(true);
        }
      }
    } else {
      gameAudio.playIncorrect();
    }
  };

  const handleManualReveal = () => {
    if (isAnswerRevealed) return;
    setIsAnswerRevealed(true);
    setAnsweredOptionIdx(null);
  };

  const handleAwardTeamPoint = (teamId: 'team1' | 'team2') => {
    handleAdjustScore(teamId, 1);
    gameAudio.playCorrect();
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setAnsweredOptionIdx(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(initialTime);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setAnsweredOptionIdx(null);
      setIsAnswerRevealed(false);
      setTimerSeconds(initialTime);
      setActiveTeamId((curr) => (curr === 'team1' ? 'team2' : 'team1'));
    } else {
      const winner =
        team1Progress > team2Progress
          ? 'team1'
          : team2Progress > team1Progress
          ? 'team2'
          : team1Score > team2Score
          ? 'team1'
          : team2Score > team1Score
          ? 'team2'
          : null;
      setWinnerTeamId(winner);
      gameAudio.playVictory();
      setIsVictoryModalOpen(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setTeam1Score(0);
    setTeam2Score(0);
    setTeam1Progress(0);
    setTeam2Progress(0);
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
      color: 'bg-blue-600',
      borderColor: 'border-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-rose-600',
      borderColor: 'border-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3 sm:space-y-4 transition-all min-h-0">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Đua thuyền kiến thức"
        teams={teams}
        activeTeamId={activeTeamId}
        onSelectActiveTeam={(id) => setActiveTeamId(id as 'team1' | 'team2')}
        onAdjustScore={handleAdjustScore}
        timerSeconds={timerSeconds}
        isTimerPaused={isTimerPaused}
        onTogglePauseTimer={() => setIsTimerPaused(!isTimerPaused)}
        onAddSeconds={(delta) => setTimerSeconds((prev) => (prev !== null ? prev + delta : delta))}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        onOpenQuestionGrid={() => setIsGridOpen(true)}
        onOpenStudentPicker={() => setIsStudentModalOpen(true)}
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

      {/* 2. RESPONSIVE WEB GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
        {/* LEFT COLUMN: BOAT RACE STAGE (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-white/5 shadow-2xs h-full min-h-0">
          {/* Header info */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Flag size={16} />
              <span>Vạch xuất phát</span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
              Mỗi câu đúng +{stepPerCorrect}%
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span>Vạch đích</span>
            </span>
          </div>

          {/* Lane 1: Thuyền Xanh */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-slate-700 dark:text-zinc-200">
              <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-sm" />
                {team1Name}
              </span>
              <span className="font-mono text-base sm:text-xl font-black text-blue-600 dark:text-blue-400">
                {team1Progress}%
              </span>
            </div>
            <div className="relative w-full h-18 sm:h-22 lg:h-24 bg-gradient-to-r from-blue-100/60 via-sky-50 to-indigo-100/70 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-indigo-950/40 rounded-2xl overflow-hidden flex items-center shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-400/25 via-sky-400/35 to-blue-500/45 dark:from-blue-600/30 dark:to-cyan-500/40 transition-all duration-700 ease-out"
                style={{ width: `${team1Progress}%` }}
              />
              <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-around text-lg select-none">
                <span>〰️</span>
                <span>〰️</span>
                <span>〰️</span>
                <span>〰️</span>
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center z-10 select-none"
                style={{ left: `calc(${team1Progress * 0.82}% + 6px)` }}
              >
                <span className="text-3xl sm:text-4xl lg:text-5xl filter drop-shadow-md">🛶</span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-4 sm:w-5 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_6px,#fbbf24_6px,#fbbf24_12px)]" />
            </div>
          </div>

          {/* Lane 2: Thuyền Đỏ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm sm:text-base font-extrabold text-slate-700 dark:text-zinc-200">
              <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 shadow-sm" />
                {team2Name}
              </span>
              <span className="font-mono text-base sm:text-xl font-black text-rose-600 dark:text-rose-400">
                {team2Progress}%
              </span>
            </div>
            <div className="relative w-full h-18 sm:h-22 lg:h-24 bg-gradient-to-r from-rose-100/60 via-pink-50 to-orange-100/70 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-orange-950/40 rounded-2xl overflow-hidden flex items-center shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-rose-400/25 via-pink-400/35 to-rose-500/45 dark:from-rose-600/30 dark:to-pink-500/40 transition-all duration-700 ease-out"
                style={{ width: `${team2Progress}%` }}
              />
              <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-around text-lg select-none">
                <span>〰️</span>
                <span>〰️</span>
                <span>〰️</span>
                <span>〰️</span>
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center z-10 select-none"
                style={{ left: `calc(${team2Progress * 0.82}% + 6px)` }}
              >
                <span className="text-3xl sm:text-4xl lg:text-5xl filter drop-shadow-md">⛵</span>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-4 sm:w-5 bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_6px,#fbbf24_6px,#fbbf24_12px)]" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CLASSROOM QUESTION & TEACHING BOARD (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-0">
          {currentQ ? (
            <ClassroomQuestionCard
              question={currentQ}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              activeTeamName={activeTeamId === 'team1' ? team1Name : team2Name}
              activeTeamColor={activeTeamId === 'team1' ? 'bg-blue-600' : 'bg-rose-600'}
              answeredOptionIdx={answeredOptionIdx}
              isRevealed={isAnswerRevealed}
              fontSize={fontSize}
              onSelectOption={handleSelectOption}
              onAwardTeamPoint={handleAwardTeamPoint}
              team1Name={team1Name}
              team2Name={team2Name}
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
              onOpenQuestionGrid={() => setIsGridOpen(true)}
              isFirstQuestion={currentIndex === 0}
              isLastQuestion={currentIndex === questions.length - 1}
            />
          ) : (
            <div className="p-8 text-center text-slate-500 font-medium">Không có câu hỏi nào.</div>
          )}
        </div>
      </div>

      {/* QUESTION GRID MODAL */}
      <QuestionGridModal
        isOpen={isGridOpen}
        onClose={() => setIsGridOpen(false)}
        questionsCount={questions.length}
        currentIndex={currentIndex}
        statuses={questionStatuses}
        onSelectQuestion={(idx) => {
          setCurrentIndex(idx);
          setAnsweredOptionIdx(null);
          setIsAnswerRevealed(false);
          setTimerSeconds(initialTime);
        }}
      />

      {/* RANDOM STUDENT CALLER MODAL */}
      <RandomStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
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
