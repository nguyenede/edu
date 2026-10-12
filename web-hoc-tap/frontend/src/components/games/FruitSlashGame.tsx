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

interface FruitSlashGameProps {
  examTitle: string;
  questions: Question[];
  onBack: () => void;
  config?: GameSettingsConfig;
  onOpenSettings?: () => void;
}

interface FruitItem {
  id: number;
  questionIndex: number;
  emoji: string;
  name: string;
  points: number;
}

export const FruitSlashGame: React.FC<FruitSlashGameProps> = ({
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
  const [isHarvested, setIsHarvested] = useState(false);

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const team1Name = config.team1Name || 'Đội Cam Vàng';
  const team2Name = config.team2Name || 'Đội Dâu Đỏ';

  const currentQ = questions[currentIndex];

  const fruitItems: FruitItem[] = questions.map((_, idx) => {
    const list = [
      { emoji: '🍉', name: 'Dưa hấu' },
      { emoji: '🍎', name: 'Táo đỏ' },
      { emoji: '🍊', name: 'Cam vàng' },
      { emoji: '🍓', name: 'Dâu tây' },
      { emoji: '🍍', name: 'Dứa chín' },
      { emoji: '🍇', name: 'Nho tím' },
    ];
    const item = list[idx % list.length];
    return {
      id: idx,
      questionIndex: idx,
      emoji: item.emoji,
      name: item.name,
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
      setIsHarvested(true);
      gameAudio.playCorrect();
      gameAudio.playSlash();
      const pts = fruitItems[currentIndex]?.points || 10;
      if (activeTeamId === 'team1') setTeam1Score((s) => s + pts);
      else setTeam2Score((s) => s + pts);

      setTimeout(() => setIsHarvested(false), 800);
    } else {
      gameAudio.playIncorrect();
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
      color: 'bg-amber-500',
      borderColor: 'border-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      id: 'team2',
      name: team2Name,
      score: team2Score,
      color: 'bg-rose-500',
      borderColor: 'border-rose-400',
      bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="w-full bg-[#f4f7fb] dark:bg-[#151618] rounded-3xl shadow-xl border border-slate-200/90 dark:border-white/10 overflow-hidden flex flex-col transition-all">
      {/* 1. TEACHER CLASSROOM HEADER */}
      <ClassroomTeacherHeader
        title={examTitle}
        gameShortName="Vườn hoa quả tri thức"
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

      {/* 2. VISUAL ORCHARD HARVEST STAGE */}
      <div className="p-3.5 sm:p-6 flex flex-col items-center justify-center space-y-5">
        <div className="w-full max-w-4xl bg-gradient-to-b from-emerald-100 via-lime-100 to-emerald-200 dark:from-emerald-950/60 dark:via-lime-950/40 dark:to-emerald-900/50 rounded-3xl p-5 sm:p-7 border border-emerald-300 dark:border-emerald-800/40 shadow-xl flex flex-col justify-between min-h-[230px] relative overflow-hidden">
          {/* Top Orchard Banner */}
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="text-3xl sm:text-4xl">🌳</span>
              <div>
                <span>Vườn trái cây tri thức</span>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Chọn quả chín để thử thách cùng cả lớp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-black/50 border border-emerald-300 dark:border-emerald-700 text-xs font-bold text-emerald-800 dark:text-emerald-300 shadow-xs">
              <span className={`text-2xl transition-transform ${isHarvested ? 'scale-125' : ''}`}>
                {fruitItems[currentIndex]?.emoji || '🍉'}
              </span>
              <span>Đang thu hoạch: Câu {currentIndex + 1}</span>
            </div>
          </div>

          {/* Fruit Tree Hanging Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 sm:gap-3.5 pt-4">
            {fruitItems.map((item) => {
              const status = questionStatuses[item.questionIndex];
              const isCurrent = currentIndex === item.questionIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectQuestionFromGrid(item.questionIndex)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-400/30 border-emerald-500 ring-2 ring-emerald-400 scale-105 shadow-md font-bold'
                      : status === 'correct'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-800 dark:text-emerald-300 opacity-60'
                      : status === 'incorrect'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-800 dark:text-rose-300 opacity-60'
                      : 'bg-white/70 dark:bg-white/10 border-emerald-300/60 dark:border-white/10 hover:scale-103'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl mb-1">{item.emoji}</span>
                  <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-100">
                    Câu {item.questionIndex + 1}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    +{item.points}đ
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
              activeTeamColor={activeTeamId === 'team1' ? 'bg-amber-500' : 'bg-rose-500'}
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
