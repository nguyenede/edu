'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { QuestionGridModal } from './QuestionGridModal';
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
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'large');
  const [isGridOpen, setIsGridOpen] = useState(false);
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

    // Update question status
    setQuestionStatuses((prev) => ({
      ...prev,
      [currentIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      gameAudio.playPull();

      if (activeTeamId === 'team1') {
        const nextProg = Math.min(100, team1Progress + stepPerCorrect);
        setTeam1Progress(nextProg);
        setTeam1Score((s) => s + 10);
        if (nextProg >= 100) {
          setWinnerTeamId('team1');
          setIsVictoryModalOpen(true);
        }
      } else {
        const nextProg = Math.min(100, team2Progress + stepPerCorrect);
        setTeam2Progress(nextProg);
        setTeam2Score((s) => s + 10);
        if (nextProg >= 100) {
          setWinnerTeamId('team2');
          setIsVictoryModalOpen(true);
        }
      }
    } else {
      gameAudio.playIncorrect();
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length && winnerTeamId === null) {
      setCurrentIndex((prev) => prev + 1);
      setAnsweredOptionIdx(null);
      setIsAnswerRevealed(false);
      setActiveTeamId((prev) => (prev === 'team1' ? 'team2' : 'team1'));
      setTimerSeconds(initialTime);
    } else {
      // Game ended
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
      color: 'bg-cyan-600',
      borderColor: 'border-cyan-400',
      bgLight: 'bg-cyan-50 dark:bg-cyan-950/40',
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
    <div className="w-full bg-[#f4f7fb] dark:bg-[#151618] rounded-3xl shadow-xl border border-slate-200/90 dark:border-white/10 overflow-hidden flex flex-col transition-all">
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

      {/* 2. VISUAL RIVER BOAT RACING STAGE */}
      <div className="p-3.5 sm:p-6 flex flex-col items-center justify-center space-y-5">
        <div className="w-full max-w-4xl bg-gradient-to-b from-sky-200 via-cyan-100 to-blue-200 dark:from-sky-950/80 dark:via-cyan-950/50 dark:to-blue-950/70 rounded-3xl p-4 sm:p-6 border border-cyan-300 dark:border-cyan-800/60 shadow-lg flex flex-col justify-between space-y-4 relative overflow-hidden">
          {/* Subtle River Wave Shimmer Background */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Top River Meta */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold text-slate-800 dark:text-zinc-100 px-2 relative z-10">
            <span className="flex items-center gap-1.5 bg-white/80 dark:bg-black/40 px-3 py-1 rounded-full border border-sky-300/60 shadow-2xs">
              <Flag size={14} className="text-emerald-500" />
              <span>Vạch xuất phát</span>
            </span>

            <span className="font-black text-cyan-900 dark:text-cyan-200 bg-cyan-400/20 px-3.5 py-1 rounded-full border border-cyan-400/40">
              Mỗi câu đúng tiến nhanh +{stepPerCorrect}%
            </span>

            <span className="flex items-center gap-1.5 bg-white/80 dark:bg-black/40 px-3 py-1 rounded-full border border-sky-300/60 shadow-2xs">
              <span>🏁 Vạch đích 100%</span>
            </span>
          </div>

          {/* Lane 1: Thuyền Xanh */}
          <div className="relative w-full bg-white/70 dark:bg-cyan-950/40 p-3 sm:p-4 rounded-2xl border-2 border-cyan-300/60 dark:border-cyan-700/40 shadow-xs relative z-10">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-cyan-900 dark:text-cyan-200 mb-2">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-600 shadow-xs" />
                {team1Name}
              </span>
              <span className="bg-cyan-600 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                {team1Progress}%
              </span>
            </div>

            {/* River water track */}
            <div className="relative w-full h-11 bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-300 dark:from-sky-950 dark:via-cyan-900 dark:to-sky-950 rounded-xl overflow-hidden border border-cyan-400/50 shadow-inner">
              {/* Animated water waves texture */}
              <div
                className="h-full bg-gradient-to-r from-cyan-500/40 to-cyan-400/60 transition-all duration-700 ease-out"
                style={{ width: `${team1Progress}%` }}
              />

              {/* Mile markers */}
              <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/30 border-r border-dashed border-cyan-300/50" />
              <div className="absolute top-0 bottom-0 left-2/4 w-px bg-white/30 border-r border-dashed border-cyan-300/50" />
              <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/30 border-r border-dashed border-cyan-300/50" />

              {/* Boat Graphic on water with wake */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center z-10"
                style={{ left: `calc(${team1Progress * 0.82}% + 6px)` }}
              >
                {/* Boat Wake Splash */}
                <div className="w-4 h-2 bg-white/60 rounded-full blur-[1px] -mr-1 animate-pulse" />
                <div className="text-3xl filter drop-shadow-md transition-transform duration-300 hover:scale-110">
                  🛶
                </div>
                <span className="text-[10px] font-black bg-cyan-700 text-white px-2 py-0.5 rounded-full ml-1 shadow-md">
                  {team1Name}
                </span>
              </div>

              {/* Finish Checkered Gate */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-b from-amber-400 to-yellow-500 border-l border-white shadow-md flex items-center justify-center">
                <span className="text-[9px] font-black text-black">🏁</span>
              </div>
            </div>
          </div>

          {/* Lane 2: Thuyền Đỏ */}
          <div className="relative w-full bg-white/70 dark:bg-rose-950/40 p-3 sm:p-4 rounded-2xl border-2 border-rose-300/60 dark:border-rose-700/40 shadow-xs relative z-10">
            <div className="flex items-center justify-between text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200 mb-2">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 shadow-xs" />
                {team2Name}
              </span>
              <span className="bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs">
                {team2Progress}%
              </span>
            </div>

            {/* River water track */}
            <div className="relative w-full h-11 bg-gradient-to-r from-sky-200 via-rose-100 to-sky-300 dark:from-sky-950 dark:via-rose-950 dark:to-sky-950 rounded-xl overflow-hidden border border-rose-400/50 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-rose-500/40 to-rose-400/60 transition-all duration-700 ease-out"
                style={{ width: `${team2Progress}%` }}
              />

              {/* Mile markers */}
              <div className="absolute top-0 bottom-0 left-1/4 w-px bg-white/30 border-r border-dashed border-rose-300/50" />
              <div className="absolute top-0 bottom-0 left-2/4 w-px bg-white/30 border-r border-dashed border-rose-300/50" />
              <div className="absolute top-0 bottom-0 left-3/4 w-px bg-white/30 border-r border-dashed border-rose-300/50" />

              {/* Boat Graphic on water with wake */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center z-10"
                style={{ left: `calc(${team2Progress * 0.82}% + 6px)` }}
              >
                <div className="w-4 h-2 bg-white/60 rounded-full blur-[1px] -mr-1 animate-pulse" />
                <div className="text-3xl filter drop-shadow-md transition-transform duration-300 hover:scale-110">
                  ⛵
                </div>
                <span className="text-[10px] font-black bg-rose-700 text-white px-2 py-0.5 rounded-full ml-1 shadow-md">
                  {team2Name}
                </span>
              </div>

              {/* Finish Checkered Gate */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-b from-amber-400 to-yellow-500 border-l border-white shadow-md flex items-center justify-center">
                <span className="text-[9px] font-black text-black">🏁</span>
              </div>
            </div>
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
              activeTeamColor={activeTeamId === 'team1' ? 'bg-cyan-600' : 'bg-rose-600'}
              answeredOptionIdx={answeredOptionIdx}
              isRevealed={isAnswerRevealed}
              fontSize={fontSize}
              onSelectOption={handleSelectOption}
              onNextQuestion={handleNextQuestion}
              onOpenQuestionGrid={() => setIsGridOpen(true)}
              isLastQuestion={Object.keys(questionStatuses).length >= questions.length || winnerTeamId !== null}
            />
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-medium">Không có câu hỏi nào.</div>
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
