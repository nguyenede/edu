'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { Sparkles, Trophy } from 'lucide-react';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomQuestionCard } from './ClassroomQuestionCard';
import { QuestionGridModal } from './QuestionGridModal';
import { RandomStudentModal } from './RandomStudentModal';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';

interface Question {
  id: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
}

interface WhackAMoleGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
  onSwitchGame?: (gameType: string) => void;
  onBackToHub?: () => void;
}

interface MoleHole {
  id: number;
  questionIndex: number;
  label: string;
}

export const WhackAMoleGame: React.FC<WhackAMoleGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
  onSwitchGame,
  onBackToHub,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [team1Score, setTeam1Score] = useState(0);
  const [team2Score, setTeam2Score] = useState(0);
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
  const [isHit, setIsHit] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Sóc Nhanh';
  const team2Name = config.team2Name || 'Đội Thỏ Khôn';

  const currentQ = questions[currentIndex];

  const moleHoles: MoleHole[] = questions.map((_, idx) => ({
    id: idx,
    questionIndex: idx,
    label: `Hang ${idx + 1}`,
  }));

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
      setIsHit(true);
      setTimeout(() => setIsHit(false), 900);
      if (activeTeamId === 'team1') setTeam1Score((s) => s + 1);
      else setTeam2Score((s) => s + 1);
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
    setIsHit(true);
    setTimeout(() => setIsHit(false), 900);
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
        team1Score > team2Score ? 'team1' : team2Score > team1Score ? 'team2' : null;
      setWinnerTeamId(winner);
      gameAudio.playVictory();
      setIsVictoryModalOpen(true);
    }
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
      color: 'bg-orange-500',
      borderColor: 'border-orange-400',
      bgLight: 'bg-orange-50 dark:bg-orange-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-blue-600',
      borderColor: 'border-blue-400',
      bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    },
  ];

  return (
    <div className="w-full h-full flex-1 flex flex-col space-y-3 sm:space-y-4 min-h-0">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Đập chuột chũi kiến thức"
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
        {/* LEFT COLUMN: MINIMALIST MOLE BURROWS STAGE (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3 h-full min-h-0">
          <div className="bg-white dark:bg-[#1a1b1e] rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 flex-1 border border-slate-100 dark:border-white/5 shadow-2xs">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs font-bold pb-2">
              <span className="text-orange-700 dark:text-orange-300 font-extrabold flex items-center gap-1.5">
                <span>🔨 Hang chuột tri thức</span>
              </span>
              <span className="text-slate-400 text-[11px] font-semibold">
                Đang mở: Câu {currentIndex + 1}
              </span>
            </div>

            {/* Current Active Mole Display */}
            <div className="py-4 px-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center min-h-[160px]">
              <div className={`text-5xl transition-transform duration-300 mb-2 ${isHit ? 'scale-125' : ''}`}>
                {isHit ? '💥' : '🐹'}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                Chú chuột số {currentIndex + 1}
              </span>

              {/* Burrows Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 w-full pt-3 mt-2">
                {moleHoles.map((hole) => {
                  const status = questionStatuses[hole.questionIndex];
                  const isCurrent = currentIndex === hole.questionIndex;

                  return (
                    <button
                      key={hole.id}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(hole.questionIndex);
                        setAnsweredOptionIdx(null);
                        setIsAnswerRevealed(false);
                        setTimerSeconds(initialTime);
                      }}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-orange-100 dark:bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/30 font-bold scale-105'
                          : status === 'correct'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 opacity-60'
                          : status === 'incorrect'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 opacity-60'
                          : 'bg-white dark:bg-white/5 border-slate-200/70 dark:border-white/10 hover:border-orange-400'
                      }`}
                    >
                      <span className="text-xl">🕳️</span>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {hole.questionIndex + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status Tips */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Đã hoàn thành: <b>{Object.keys(questionStatuses).length} / {questions.length}</b></span>
              <span>Dẫn điểm: <b>{team1Score > team2Score ? team1Name : team2Score > team1Score ? team2Name : 'Hòa nhau'}</b></span>
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
              activeTeamColor={activeTeamId === 'team1' ? 'bg-orange-500' : 'bg-blue-600'}
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
