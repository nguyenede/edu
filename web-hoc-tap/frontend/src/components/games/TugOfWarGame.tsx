'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';
import { QuestionGridModal } from './QuestionGridModal';

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
}

export const TugOfWarGame: React.FC<TugOfWarGameProps> = ({
  examTitle,
  questions,
  onBack,
  config = DEFAULT_GAME_CONFIG,
  onOpenSettings,
}) => {
  const maxPullLimit = Math.min(Math.max(config.winDifference || 3, 2), 6);
  const [ropePosition, setRopePosition] = useState(0); // -maxPullLimit (Blue wins) to +maxPullLimit (Red wins)
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [activeTeamId, setActiveTeamId] = useState<'blue' | 'red'>('blue');

  // Independent question indices for each team
  const [blueIndex, setBlueIndex] = useState(0);
  const [redIndex, setRedIndex] = useState(questions.length > 1 ? 1 : 0);

  // Answer states
  const [blueAnsweredIdx, setBlueAnsweredIdx] = useState<number | null>(null);
  const [blueIsRevealed, setBlueIsRevealed] = useState(false);
  const [redAnsweredIdx, setRedAnsweredIdx] = useState<number | null>(null);
  const [redIsRevealed, setRedIsRevealed] = useState(false);

  // Controls & Display Settings
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(config.fontSize || 'large');
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isGridOpen, setIsGridOpen] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState<Record<number, 'unopened' | 'correct' | 'incorrect'>>({});

  // Classroom Timer State
  const initialTime = config.timeLimit > 0 ? config.timeLimit : null;
  const [timerSeconds, setTimerSeconds] = useState<number | null>(initialTime);
  const [isTimerPaused, setIsTimerPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const team1Name = config.team1Name || 'Đội Xanh';
  const team2Name = config.team2Name || 'Đội Đỏ';

  const blueQuestion = questions[blueIndex] || questions[0];
  const redQuestion = questions[redIndex] || questions[0];

  // Timer countdown
  useEffect(() => {
    if (timerSeconds === null || isTimerPaused || winnerTeamId) return;

    if (timerSeconds <= 0) {
      handleTimeUp();
      return;
    }

    if (timerSeconds <= 5 && timerSeconds > 0) {
      gameAudio.playTick();
    }

    const timer = setInterval(() => {
      setTimerSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timerSeconds, isTimerPaused, winnerTeamId]);

  const handleTimeUp = () => {
    const winner = blueScore > redScore ? 'blue' : redScore > blueScore ? 'red' : null;
    setWinnerTeamId(winner);
    gameAudio.playVictory();
    setIsVictoryModalOpen(true);
  };

  const toggleSound = () => {
    gameAudio.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {
        document.documentElement.requestFullscreen().catch(() => null);
      });
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

  // BLUE TEAM SELECTION
  const handleBlueSelect = (optIdx: number) => {
    if (blueIsRevealed || winnerTeamId || !blueQuestion) return;

    const opt = blueQuestion.options[optIdx];
    const isCorrect = Boolean(opt?.isCorrect);

    setBlueAnsweredIdx(optIdx);
    setBlueIsRevealed(true);
    setActiveTeamId('blue');

    setQuestionStatuses((prev) => ({
      ...prev,
      [blueIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      gameAudio.playPull();
      setBlueScore((s) => s + 10);
      const nextPos = ropePosition - 1;
      setRopePosition(nextPos);

      if (nextPos <= -maxPullLimit) {
        setWinnerTeamId('blue');
        setTimeout(() => {
          gameAudio.playVictory();
          setIsVictoryModalOpen(true);
        }, 600);
        return;
      }
    } else {
      gameAudio.playIncorrect();
      setRopePosition((pos) => Math.min(maxPullLimit, pos + 0.5));
    }

    setTimeout(() => {
      setBlueAnsweredIdx(null);
      setBlueIsRevealed(false);
      setBlueIndex((prev) => (prev + 2 < questions.length ? prev + 2 : (prev + 1) % questions.length));
    }, 1300);
  };

  // RED TEAM SELECTION
  const handleRedSelect = (optIdx: number) => {
    if (redIsRevealed || winnerTeamId || !redQuestion) return;

    const opt = redQuestion.options[optIdx];
    const isCorrect = Boolean(opt?.isCorrect);

    setRedAnsweredIdx(optIdx);
    setRedIsRevealed(true);
    setActiveTeamId('red');

    setQuestionStatuses((prev) => ({
      ...prev,
      [redIndex]: isCorrect ? 'correct' : 'incorrect',
    }));

    if (isCorrect) {
      gameAudio.playCorrect();
      gameAudio.playPull();
      setRedScore((s) => s + 10);
      const nextPos = ropePosition + 1;
      setRopePosition(nextPos);

      if (nextPos >= maxPullLimit) {
        setWinnerTeamId('red');
        setTimeout(() => {
          gameAudio.playVictory();
          setIsVictoryModalOpen(true);
        }, 600);
        return;
      }
    } else {
      gameAudio.playIncorrect();
      setRopePosition((pos) => Math.max(-maxPullLimit, pos - 0.5));
    }

    setTimeout(() => {
      setRedAnsweredIdx(null);
      setRedIsRevealed(false);
      setRedIndex((prev) => (prev + 2 < questions.length ? prev + 2 : (prev + 1) % questions.length));
    }, 1300);
  };

  const handleRestart = () => {
    setRopePosition(0);
    setBlueScore(0);
    setRedScore(0);
    setBlueIndex(0);
    setRedIndex(questions.length > 1 ? 1 : 0);
    setBlueAnsweredIdx(null);
    setBlueIsRevealed(false);
    setRedAnsweredIdx(null);
    setRedIsRevealed(false);
    setWinnerTeamId(null);
    setIsVictoryModalOpen(false);
    setQuestionStatuses({});
    setTimerSeconds(initialTime);
    setIsTimerPaused(false);
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

  const fontSizeClass =
    fontSize === 'normal'
      ? 'text-base sm:text-lg'
      : fontSize === 'large'
      ? 'text-lg sm:text-xl md:text-2xl'
      : 'text-xl sm:text-2xl md:text-3xl';

  const isGeometryBlue =
    blueQuestion?.content?.toLowerCase().includes('hình dạng') ||
    blueQuestion?.content?.toLowerCase().includes('hình thang') ||
    blueQuestion?.options?.some((o) => o.content.toLowerCase().includes('hình thang'));

  const isGeometryRed =
    redQuestion?.content?.toLowerCase().includes('hình dạng') ||
    redQuestion?.content?.toLowerCase().includes('hình thang');

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#f0f4f9] dark:bg-[#282a2c] rounded-2xl shadow-sm border border-slate-200/80 dark:border-white/10 overflow-hidden flex flex-col select-none"
    >
      {/* 1. TEACHER CLASSROOM CONTROL HEADER */}
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
        currentIndex={blueIndex}
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

      {/* 2. DUAL-TEAM BATTLE ARENA (3 COLUMNS REFERENCED FROM USER DESIGN) */}
      <div className="p-3 sm:p-5 flex flex-col lg:flex-row items-stretch gap-4">
        {/* COLUMN 1: ĐỘI XANH (BLUE TEAM) */}
        <div className="flex-1 bg-white dark:bg-[#1e1f20] border-2 border-blue-200/90 dark:border-blue-900/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          {/* Team Tag */}
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-bold text-sm sm:text-base text-blue-700 dark:text-blue-300">
                {team1Name}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 text-xs font-bold">
              Câu {(blueIndex % questions.length) + 1}/{questions.length}
            </span>
          </div>

          {/* Question Box */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center flex-1 min-h-[170px]">
            {isGeometryBlue && (
              <div className="mb-3">
                <svg
                  className="w-40 sm:w-48 h-20 sm:h-24 mx-auto"
                  viewBox="0 0 200 100"
                  fill="none"
                >
                  <polygon
                    points="55,20 145,20 175,80 25,80"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    fill="rgba(239, 68, 68, 0.08)"
                  />
                  <line
                    x1="55"
                    y1="20"
                    x2="55"
                    y2="80"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <circle cx="55" cy="20" r="3.5" fill="#3b82f6" />
                  <circle cx="145" cy="20" r="3.5" fill="#3b82f6" />
                  <circle cx="175" cy="80" r="3.5" fill="#3b82f6" />
                  <circle cx="25" cy="80" r="3.5" fill="#3b82f6" />
                  <circle cx="55" cy="80" r="2.5" fill="#ef4444" />
                </svg>
              </div>
            )}

            <h3 className={`font-bold text-slate-800 dark:text-zinc-100 text-center leading-relaxed ${fontSizeClass}`}>
              {blueQuestion?.content || 'Đang tải câu hỏi...'}
            </h3>

            {blueIsRevealed && (
              <div className="mt-3">
                {blueAnsweredIdx !== null && blueQuestion?.options[blueAnsweredIdx]?.isCorrect ? (
                  <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm animate-bounce inline-block">
                    ✓ Chính xác! (+10 điểm)
                  </span>
                ) : (
                  <span className="px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-xs sm:text-sm inline-block">
                    ✕ Chưa chính xác!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2x2 Options Grid for Blue */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
            {blueQuestion?.options.map((opt, idx) => {
              const isSelected = blueAnsweredIdx === idx;
              let btnStyle =
                'bg-white dark:bg-[#282a2c] hover:bg-blue-50/70 dark:hover:bg-blue-950/40 border-slate-200/90 dark:border-white/10 hover:border-blue-400 text-slate-800 dark:text-zinc-100';

              if (blueIsRevealed) {
                if (opt.isCorrect) {
                  btnStyle =
                    'bg-emerald-500 text-white border-emerald-500 shadow-md font-bold scale-[1.01]';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500 text-white border-rose-500 font-bold';
                } else {
                  btnStyle = 'opacity-40 bg-slate-100 dark:bg-white/5 border-transparent';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={blueIsRevealed || winnerTeamId !== null}
                  onClick={() => handleBlueSelect(idx)}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-center text-center cursor-pointer active:scale-97 min-h-[75px] sm:min-h-[85px] shadow-2xs font-semibold ${btnStyle}`}
                >
                  <span className="leading-snug line-clamp-2">{opt.content}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER TUG-OF-WAR ARENA (SÂN KÉO CO) */}
        <div className="w-full lg:w-[240px] xl:w-[280px] bg-white dark:bg-[#1e1f20] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between shadow-2xs relative overflow-hidden shrink-0 min-h-[220px]">
          {/* Vertical Green Dashed Center Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-emerald-500/80 z-10" />

          {/* Arena Top Status Pill */}
          <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-200 text-xs font-bold z-20 shadow-2xs">
            {ropePosition === 0
              ? '⚖️ Cân bằng'
              : ropePosition < 0
              ? `⬅️ ${team1Name} (+${Math.abs(ropePosition)})`
              : `➡️ ${team2Name} (+${ropePosition})`}
          </div>

          {/* Animated Cartoon Students Graphic */}
          <div
            className="relative w-full max-w-[220px] aspect-square flex items-center justify-center transition-transform duration-500 ease-out z-20 my-2"
            style={{
              transform: `translateX(${ropePosition * 20}px)`,
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src="/games/tug-of-war-kids.jpg"
                alt="Kéo co học sinh"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Arena Bottom Threshold Indicator */}
          <div className="text-center z-20">
            <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-white/10">
              Kéo qua mốc {maxPullLimit} để thắng
            </span>
          </div>
        </div>

        {/* COLUMN 3: ĐỘI ĐỎ (RED TEAM) */}
        <div className="flex-1 bg-white dark:bg-[#1e1f20] border-2 border-rose-200/90 dark:border-rose-900/60 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
          {/* Team Tag */}
          <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-900/40 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
              <span className="font-bold text-sm sm:text-base text-rose-700 dark:text-rose-300">
                {team2Name}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-xs font-bold">
              Câu {(redIndex % questions.length) + 1}/{questions.length}
            </span>
          </div>

          {/* Question Box */}
          <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl p-4 sm:p-6 flex flex-col items-center justify-center text-center flex-1 min-h-[170px]">
            {isGeometryRed && (
              <div className="mb-3">
                <svg
                  className="w-40 sm:w-48 h-20 sm:h-24 mx-auto"
                  viewBox="0 0 200 100"
                  fill="none"
                >
                  <polygon
                    points="55,20 145,20 175,80 25,80"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    fill="rgba(239, 68, 68, 0.08)"
                  />
                  <line
                    x1="55"
                    y1="20"
                    x2="55"
                    y2="80"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4,3"
                  />
                  <circle cx="55" cy="20" r="3.5" fill="#3b82f6" />
                  <circle cx="145" cy="20" r="3.5" fill="#3b82f6" />
                  <circle cx="175" cy="80" r="3.5" fill="#3b82f6" />
                  <circle cx="25" cy="80" r="3.5" fill="#3b82f6" />
                </svg>
              </div>
            )}

            <h3 className={`font-bold text-slate-800 dark:text-zinc-100 text-center leading-relaxed ${fontSizeClass}`}>
              {redQuestion?.content || 'Đang tải câu hỏi...'}
            </h3>

            {redIsRevealed && (
              <div className="mt-3">
                {redAnsweredIdx !== null && redQuestion?.options[redAnsweredIdx]?.isCorrect ? (
                  <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm animate-bounce inline-block">
                    ✓ Chính xác! (+10 điểm)
                  </span>
                ) : (
                  <span className="px-3.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-xs sm:text-sm inline-block">
                    ✕ Chưa chính xác!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2x2 Options Grid for Red */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
            {redQuestion?.options.map((opt, idx) => {
              const isSelected = redAnsweredIdx === idx;
              let btnStyle =
                'bg-white dark:bg-[#282a2c] hover:bg-rose-50/70 dark:hover:bg-rose-950/40 border-slate-200/90 dark:border-white/10 hover:border-rose-400 text-slate-800 dark:text-zinc-100';

              if (redIsRevealed) {
                if (opt.isCorrect) {
                  btnStyle =
                    'bg-emerald-500 text-white border-emerald-500 shadow-md font-bold scale-[1.01]';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500 text-white border-rose-500 font-bold';
                } else {
                  btnStyle = 'opacity-40 bg-slate-100 dark:bg-white/5 border-transparent';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={redIsRevealed || winnerTeamId !== null}
                  onClick={() => handleRedSelect(idx)}
                  className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-center text-center cursor-pointer active:scale-97 min-h-[75px] sm:min-h-[85px] shadow-2xs font-semibold ${btnStyle}`}
                >
                  <span className="leading-snug line-clamp-2">{opt.content}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUESTION MATRIX MODAL */}
      <QuestionGridModal
        isOpen={isGridOpen}
        onClose={() => setIsGridOpen(false)}
        questionsCount={questions.length}
        currentIndex={blueIndex}
        statuses={questionStatuses}
        onSelectQuestion={(idx) => {
          setBlueIndex(idx);
          setBlueAnsweredIdx(null);
          setBlueIsRevealed(false);
          setIsGridOpen(false);
        }}
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
