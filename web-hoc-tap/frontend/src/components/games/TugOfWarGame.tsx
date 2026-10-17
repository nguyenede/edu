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
    <div className="w-full h-full flex-1 flex flex-col space-y-3 sm:space-y-4 min-h-0">
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
        <div className="lg:col-span-5 flex flex-col h-full min-h-0">
          {/* Main Rope Arena Card */}
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-6 flex flex-col justify-between space-y-4 flex-1 border border-slate-100 dark:border-white/5 shadow-2xs">
            {/* Arena Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-sm" />
                <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                  {team1Name}
                </span>
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                Đấu trường kéo co
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                  {team2Name}
                </span>
                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 shadow-sm" />
              </div>
            </div>

            {/* Central Battle Stage */}
            <div className="flex-1 flex flex-col justify-center items-center py-4 sm:py-6 space-y-6 sm:space-y-8 w-full">
              {/* Dynamic Status / Momentum Banner */}
              <div className="flex items-center justify-center">
                {ropePosition === 0 ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-sm font-bold shadow-2xs">
                    <span className="text-base">⚖️</span>
                    <span>Thế trận đang cân bằng</span>
                  </div>
                ) : ropePosition < 0 ? (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-sm font-bold shadow-2xs animate-pulse">
                    <span className="text-base">🔥</span>
                    <span>
                      {team1Name} đang dẫn trước {Math.abs(ropePosition)} điểm!
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold shadow-2xs animate-pulse">
                    <span className="text-base">🔥</span>
                    <span>
                      {team2Name} đang dẫn trước {ropePosition} điểm!
                    </span>
                  </div>
                )}
              </div>

              {/* Wrestlers & Scores Stage */}
              <div className="w-full flex items-end justify-between px-2 sm:px-4 select-none">
                {/* Team 1 (Blue) Puller & Score */}
                <div className="flex flex-col items-start gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white font-black text-base sm:text-xl shadow-md flex items-center gap-1.5">
                    <span>+{Math.max(0, -ropePosition)}</span>
                    <span className="text-xs font-semibold opacity-90">điểm</span>
                  </div>
                  <div
                    className={`text-5xl sm:text-6xl md:text-7xl transition-transform duration-300 ${
                      ropePosition < 0
                        ? 'scale-125 -translate-x-2'
                        : ropePosition > 0
                        ? 'scale-90 opacity-80'
                        : 'scale-100'
                    }`}
                  >
                    🤼
                  </div>
                </div>

                {/* Team 2 (Red) Puller & Score */}
                <div className="flex flex-col items-end gap-2">
                  <div className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-black text-base sm:text-xl shadow-md flex items-center gap-1.5">
                    <span className="text-xs font-semibold opacity-90">điểm</span>
                    <span>+{Math.max(0, ropePosition)}</span>
                  </div>
                  <div
                    className={`text-5xl sm:text-6xl md:text-7xl transition-transform duration-300 ${
                      ropePosition > 0
                        ? 'scale-125 translate-x-2'
                        : ropePosition < 0
                        ? 'scale-90 opacity-80'
                        : 'scale-100'
                    }`}
                  >
                    🤼‍♂️
                  </div>
                </div>
              </div>

              {/* Visual Rope Track */}
              <div className="w-full px-2 py-4 relative flex flex-col items-center">
                {/* Center Line Marker */}
                <div className="absolute top-0 bottom-6 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-zinc-600 z-0 flex flex-col justify-between items-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-white dark:bg-[#1a1b1e] px-1 -mt-2">
                    MỐC
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 bg-white dark:bg-[#1a1b1e] px-1 -mb-2">
                    GIỮA
                  </span>
                </div>

                {/* Rope line */}
                <div className="w-full h-8 sm:h-10 bg-amber-700 rounded-full relative shadow-inner flex items-center border-2 border-amber-900/30 overflow-visible">
                  {/* Grip marks */}
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#b45309,#b45309_12px,#92400e_12px,#92400e_24px)] rounded-full opacity-80" />

                  {/* Center Red Ribbon / Flag */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10 flex flex-col items-center pointer-events-none"
                    style={{ left: `${ropePercentage}%` }}
                  >
                    <div className="w-9 sm:w-11 h-12 sm:h-14 bg-gradient-to-b from-red-500 to-red-700 rounded-lg shadow-xl flex items-center justify-center border-2 border-white ring-2 ring-red-500/30">
                      <span className="text-lg sm:text-xl select-none">🚩</span>
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-700 -mt-0.5" />
                  </div>
                </div>

                {/* Step scale below rope */}
                <div className="w-full flex items-center justify-between mt-4 px-1">
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    🏆 THẮNG (-{maxPullLimit})
                  </span>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {Array.from({ length: maxPullLimit * 2 + 1 }).map((_, i) => {
                      const step = i - maxPullLimit;
                      const isCurrent = step === ropePosition;
                      return (
                        <div
                          key={step}
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                            isCurrent
                              ? 'bg-red-500 scale-125 ring-4 ring-red-500/30 shadow-xs'
                              : step === 0
                              ? 'bg-slate-400 dark:bg-zinc-500 scale-110'
                              : step < 0
                              ? 'bg-blue-300 dark:bg-blue-800'
                              : 'bg-rose-300 dark:bg-rose-800'
                          }`}
                          title={`Vị trí: ${step}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    (+{maxPullLimit}) THẮNG 🏆
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom info note */}
            <div className="text-center text-xs text-slate-500 dark:text-zinc-400 font-medium pt-3 border-t border-slate-100 dark:border-white/5">
              Đội đầu tiên kéo mốc cờ chạm mức{' '}
              <span className="font-bold text-slate-700 dark:text-zinc-200">
                {maxPullLimit} điểm
              </span>{' '}
              sẽ chiến thắng
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
