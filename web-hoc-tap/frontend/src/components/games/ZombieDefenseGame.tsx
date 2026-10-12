'use client';

import React, { useState, useEffect } from 'react';
import { gameAudio } from '@/lib/gameSound';
import { Shield, Flame } from 'lucide-react';
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

interface ZombieDefenseGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

export const ZombieDefenseGame: React.FC<ZombieDefenseGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [castleHp, setCastleHp] = useState(100);
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
  const [isBlasting, setIsBlasting] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Pháo Thủ 1';
  const team2Name = config.team2Name || 'Đội Pháo Thủ 2';

  const currentQ = questions[currentIndex];

  // Timer countdown
  useEffect(() => {
    if (timerSeconds === null || isTimerPaused || isAnswerRevealed || winnerTeamId) return;

    if (timerSeconds <= 0) {
      handleSelectOption(-1);
      return;
    }

    const timer = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev !== null && prev > 0) {
          if (prev <= 6 && prev > 1) {
            gameAudio.playTick();
          }
          return prev - 1;
        }
        return 0;
      });
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
      setIsBlasting(true);
      gameAudio.playCorrect();
      gameAudio.playHit();
      if (activeTeamId === 'team1') setTeam1Score((s) => s + 15);
      else setTeam2Score((s) => s + 15);

      setTimeout(() => setIsBlasting(false), 800);
    } else {
      gameAudio.playIncorrect();
      setCastleHp((hp) => Math.max(0, hp - 15));
    }
  };

  const handleNextQuestion = () => {
    const nextUnopenedIndex = questions.findIndex(
      (_, idx) => !questionStatuses[idx] && idx !== currentIndex
    );
    const hasUnopened = nextUnopenedIndex !== -1;

    if (hasUnopened) {
      let targetIndex = (currentIndex + 1) % questions.length;
      for (let i = 0; i < questions.length; i++) {
        const candidate = (currentIndex + 1 + i) % questions.length;
        if (!questionStatuses[candidate]) {
          targetIndex = candidate;
          break;
        }
      }
      setCurrentIndex(targetIndex);
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

  const handleSelectQuestionFromGrid = (index: number) => {
    setCurrentIndex(index);
    setAnsweredOptionIdx(null);
    setIsAnswerRevealed(false);
    setTimerSeconds(initialTime);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCastleHp(100);
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
      color: 'bg-emerald-600',
      borderColor: 'border-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
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
        gameShortName="Chặn Zombie bảo vệ trường"
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

      {/* 2. VISUAL CASTLE DEFENSE STAGE */}
      <div className="p-4 sm:p-6 flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-4xl bg-gradient-to-b from-slate-800 via-zinc-900 to-stone-900 rounded-2xl p-4 sm:p-6 border border-zinc-700 shadow-inner flex flex-col justify-between min-h-[220px] text-white">
          {/* Top Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="text-emerald-400" size={18} />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-300">Độ bền cổng trường: {castleHp}%</span>
                <div className="w-32 h-2.5 bg-black/60 rounded-full overflow-hidden border border-emerald-500/30">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${castleHp}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="px-3 py-1 rounded-xl bg-black/60 border border-white/10 text-xs font-bold text-amber-300">
              Đợt quái {currentIndex + 1} / {questions.length}
            </div>
          </div>

          {/* Defense Arena Battlefield */}
          <div className="relative w-full py-8 flex items-center justify-between">
            {/* Castle Cannon */}
            <div className="flex items-center gap-2">
              <span className="text-4xl sm:text-5xl">🏰</span>
              <div className={`text-3xl transition-transform ${isBlasting ? 'scale-130 rotate-12 text-yellow-400' : ''}`}>
                {isBlasting ? '💥' : '💣'}
              </div>
            </div>

            {/* Energy Blast Beam */}
            {isBlasting && (
              <div className="flex-1 mx-4 h-2 bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.8)]" />
            )}

            {/* Zombie horde */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`text-4xl sm:text-5xl transition-all duration-300 ${isBlasting ? 'opacity-40 translate-x-4 blur-xs' : 'animate-bounce'}`}>
                🧟‍♂️
              </div>
              <span className="text-3xl sm:text-4xl">🧟‍♀️</span>
              <span className="text-3xl sm:text-4xl">👻</span>
            </div>
          </div>

          <div className="text-center text-[11px] text-zinc-400">
            Trả lời đúng để khai hỏa đại bác đẩy lùi quái vật bảo vệ thành công trường học
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
              activeTeamColor={activeTeamId === 'team1' ? 'bg-emerald-600' : 'bg-rose-600'}
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
