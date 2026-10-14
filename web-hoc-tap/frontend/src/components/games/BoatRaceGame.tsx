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
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'large');
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
    <div className="w-full min-h-screen flex-1 bg-[#f8fafc] dark:bg-[#131416] flex flex-col transition-all">
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

      {/* 2. FULL VIEWPORT QUESTION BOARD (100% TOÀN MÀN HÌNH) */}
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto flex-1 flex flex-col h-full">
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
          <div className="p-12 text-center text-slate-500 font-medium text-lg">Không có câu hỏi nào.</div>
        )}
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
