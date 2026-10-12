'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
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
    const solvedCount = Object.keys(questionStatuses).length;
    if (solvedCount >= questions.length || winnerTeamId) {
      setIsVictoryModalOpen(true);
      return;
    }

    let nextIdx = (currentIndex + 1) % questions.length;
    for (let i = 0; i < questions.length; i++) {
      const checkIdx = (currentIndex + 1 + i) % questions.length;
      if (!questionStatuses[checkIdx]) {
        nextIdx = checkIdx;
        break;
      }
    }

    setCurrentIndex(nextIdx);
    setAnsweredOptionIdx(null);
    setIsAnswerRevealed(false);
    setTimerSeconds(initialTime);
    setActiveTeamId(activeTeamId === 'team1' ? 'team2' : 'team1');
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
    <div className="w-full bg-[#f0f4f9] dark:bg-[#282a2c] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col">
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
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-4xl bg-gradient-to-b from-sky-200 via-cyan-100 to-sky-300 dark:from-sky-950/60 dark:via-cyan-950/40 dark:to-sky-900/50 rounded-2xl p-4 sm:p-5 border border-cyan-300 dark:border-cyan-800/60 shadow-inner flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200 px-2">
            <span>🚩 Vạch xuất phát</span>
            <span className="font-extrabold text-cyan-800 dark:text-cyan-300">
              Đua thuyền tranh tài về đích ({stepPerCorrect}% mỗi câu đúng)
            </span>
            <span>🏁 Vạch đích</span>
          </div>

          {/* Lane 1: Team 1 Boat */}
          <div className="relative w-full bg-cyan-600/10 dark:bg-cyan-400/5 p-3 rounded-xl border border-cyan-300/40 dark:border-cyan-700/30">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-800 dark:text-cyan-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600" />
                {team1Name}
              </span>
              <span>{team1Progress}%</span>
            </div>

            <div className="relative w-full h-8 bg-sky-300/40 dark:bg-sky-950/80 rounded-lg overflow-hidden border border-cyan-400/30">
              {/* Progress bar background water */}
              <div
                className="h-full bg-gradient-to-r from-cyan-500/20 to-cyan-400/40 transition-all duration-500 ease-out"
                style={{ width: `${team1Progress}%` }}
              />

              {/* Boat Icon on water */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out flex items-center z-10"
                style={{ left: `calc(${team1Progress * 0.82}% + 6px)` }}
              >
                <div className="text-2xl sm:text-3xl filter drop-shadow animate-pulse">
                  🛶
                </div>
                <span className="text-[10px] font-black bg-cyan-600 text-white px-1.5 py-0.5 rounded ml-0.5 shadow-xs">
                  {team1Name}
                </span>
              </div>

              {/* Finish line marker */}
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-yellow-400 to-amber-500 border-l border-white shadow-xs" />
            </div>
          </div>

          {/* Lane 2: Team 2 Boat */}
          <div className="relative w-full bg-rose-600/10 dark:bg-rose-400/5 p-3 rounded-xl border border-rose-300/40 dark:border-rose-700/30">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                {team2Name}
              </span>
              <span>{team2Progress}%</span>
            </div>

            <div className="relative w-full h-8 bg-sky-300/40 dark:bg-sky-950/80 rounded-lg overflow-hidden border border-rose-400/30">
              <div
                className="h-full bg-gradient-to-r from-rose-500/20 to-rose-400/40 transition-all duration-500 ease-out"
                style={{ width: `${team2Progress}%` }}
              />

              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out flex items-center z-10"
                style={{ left: `calc(${team2Progress * 0.82}% + 6px)` }}
              >
                <div className="text-2xl sm:text-3xl filter drop-shadow animate-pulse">
                  ⛵
                </div>
                <span className="text-[10px] font-black bg-rose-600 text-white px-1.5 py-0.5 rounded ml-0.5 shadow-xs">
                  {team2Name}
                </span>
              </div>

              <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-yellow-400 to-amber-500 border-l border-white shadow-xs" />
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
          <div className="p-8 text-center text-slate-500">Không có câu hỏi nào.</div>
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
