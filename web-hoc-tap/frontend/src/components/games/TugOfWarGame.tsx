'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';
import { QuestionGridModal } from './QuestionGridModal';
import { RandomStudentModal } from './RandomStudentModal';
import { Shield, Sparkles, Zap, Award, Flame, Users } from 'lucide-react';

interface Question {
  id: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
  imageUrl?: string;
}

interface TugOfWarGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
  onSwitchGame?: (gameType: string) => void;
  onBackToHub?: () => void;
}

export const TugOfWarGame: React.FC<TugOfWarGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
  onSwitchGame,
  onBackToHub,
}) => {
  const maxPullLimit = Math.min(Math.max(config.winDifference || 3, 2), 5);
  const [ropePosition, setRopePosition] = useState(0); // -maxPullLimit (Blue wins) to +maxPullLimit (Red wins)
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
  const [activeTeamId, setActiveTeamId] = useState<'team1' | 'team2'>('team1');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredOptionIdx, setAnsweredOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Controls & Modals
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'normal');
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, 'unopened' | 'correct' | 'incorrect'>>({});

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Xanh';
  const team2Name = config.team2Name || 'Đội Đỏ';

  const currentQ = questions[currentIndex];

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

  // Listen to fullscreen changes
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
      setRopePosition((prev) => Math.max(-maxPullLimit, prev - delta));
    } else {
      setTeam2Score((s) => Math.max(0, s + delta));
      setRopePosition((prev) => Math.min(maxPullLimit, prev + delta));
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
        setTeam1Score((s) => s + 1);
        const newPos = Math.max(-maxPullLimit, ropePosition - 1);
        setRopePosition(newPos);
        if (newPos <= -maxPullLimit) {
          setWinnerTeamId('team1');
          gameAudio.playVictory();
          setIsVictoryModalOpen(true);
        }
      } else {
        setTeam2Score((s) => s + 1);
        const newPos = Math.min(maxPullLimit, ropePosition + 1);
        setRopePosition(newPos);
        if (newPos >= maxPullLimit) {
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
        ropePosition < 0
          ? 'team1'
          : ropePosition > 0
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
    setRopePosition(0);
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

  // Calculate rope percentage position (-maxPullLimit to +maxPullLimit => 0% to 100%)
  const ropePercentage = 50 + (ropePosition / maxPullLimit) * 38;

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3 sm:space-y-4 transition-all min-h-0">
      {/* 1. TEACHER HEADER BAR */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Kéo co kiến thức"
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
        onSwitchGame={onSwitchGame}
        onBackToHub={onBackToHub}
      />

      {/* 2. RESPONSIVE WEB GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
        {/* LEFT COLUMN: TUG OF WAR ARENA (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 h-full min-h-0">
          {/* Minimalist Rope Arena */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 flex-1 border border-slate-100 dark:border-white/5 shadow-2xs">
            {/* Arena Header */}
            <div className="flex items-center justify-between text-xs font-bold pb-2">
              <span className="text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                {team1Name}
              </span>
              <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1.5">
                {team2Name}
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              </span>
            </div>

            {/* Visual Rope Track */}
            <div className="py-8 px-2 flex flex-col items-center justify-center relative">
              {/* Center Line Marker */}
              <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-0.5 bg-slate-300 dark:bg-zinc-700 dashed border-r border-dashed border-slate-400 z-0" />

              {/* Rope line */}
              <div className="w-full h-3 bg-amber-700/80 rounded-full relative shadow-inner flex items-center">
                {/* Grip marks */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#b45309,#b45309_8px,#92400e_8px,#92400e_16px)] rounded-full opacity-60" />

                {/* Center Red Ribbon / Flag */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10 flex flex-col items-center"
                  style={{ left: `${ropePercentage}%` }}
                >
                  <div className="w-4 h-7 bg-red-600 rounded-sm shadow-md flex items-center justify-center border border-white">
                    <span className="text-[9px] text-white font-black">🚩</span>
                  </div>
                </div>
              </div>

              {/* Character Avatars pulling */}
              <div className="w-full flex items-center justify-between mt-4 px-1 text-2xl sm:text-3xl select-none">
                <div className="flex items-center gap-1">
                  <span className={`transition-transform duration-300 ${ropePosition < 0 ? 'scale-125' : ''}`}>
                    🤼
                  </span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                    +{Math.max(0, -ropePosition)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                    +{Math.max(0, ropePosition)}
                  </span>
                  <span className={`transition-transform duration-300 ${ropePosition > 0 ? 'scale-125' : ''}`}>
                    🤼‍♂️
                  </span>
                </div>
              </div>
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
              onManualReveal={handleManualReveal}
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
