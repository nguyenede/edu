'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gameAudio } from '@/lib/gameSound';
import { GameSettingsConfig, DEFAULT_GAME_CONFIG } from './GameConfigModal';
import { ClassroomTeacherHeader, ClassroomTeam } from './ClassroomTeacherHeader';
import { ClassroomVictoryModal } from './ClassroomVictoryModal';
import { QuestionGridModal } from './QuestionGridModal';
import { Shield, Flame, CheckCircle2, XCircle, Sparkles, Zap, Award } from 'lucide-react';

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

const formatContent = (str?: string) => {
  if (!str) return '';
  return str.replace(/^\$+|\$+$/g, '').trim();
};

const OPTION_THEMES = [
  {
    label: 'A',
    badge: 'bg-rose-500 text-white shadow-xs',
    style:
      'bg-rose-50/70 hover:bg-rose-100/90 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-200/90 dark:border-rose-900/60 border-b-4 border-b-rose-300 dark:border-b-rose-800 hover:border-b-rose-400 text-slate-900 dark:text-zinc-100',
  },
  {
    label: 'B',
    badge: 'bg-blue-600 text-white shadow-xs',
    style:
      'bg-blue-50/70 hover:bg-blue-100/90 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 border-blue-200/90 dark:border-blue-900/60 border-b-4 border-b-blue-300 dark:border-b-blue-800 hover:border-b-blue-400 text-slate-900 dark:text-zinc-100',
  },
  {
    label: 'C',
    badge: 'bg-amber-500 text-white shadow-xs',
    style:
      'bg-amber-50/70 hover:bg-amber-100/90 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-200/90 dark:border-amber-900/60 border-b-4 border-b-amber-300 dark:border-b-amber-800 hover:border-b-amber-400 text-slate-900 dark:text-zinc-100',
  },
  {
    label: 'D',
    badge: 'bg-emerald-600 text-white shadow-xs',
    style:
      'bg-emerald-50/70 hover:bg-emerald-100/90 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-900/60 border-b-4 border-b-emerald-300 dark:border-b-emerald-800 hover:border-b-emerald-400 text-slate-900 dark:text-zinc-100',
  },
];

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

  // Tug percentage: from -100% (blue leads) to +100% (red leads)
  const pullPercentage = (ropePosition / maxPullLimit) * 100;

  return (
    <div
      ref={containerRef}
      className="w-full bg-[#f4f7fb] dark:bg-[#151618] rounded-3xl shadow-xl border border-slate-200/90 dark:border-white/10 overflow-hidden flex flex-col select-none transition-all"
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

      {/* 2. DUAL-TEAM BATTLE ARENA (3 COLUMNS) */}
      <div className="p-3 sm:p-5 flex flex-col md:flex-row items-stretch gap-3.5 sm:gap-4">
        {/* COLUMN 1: ĐỘI XANH (BLUE TEAM BATTLE BOX) */}
        <div className="flex-1 bg-white dark:bg-[#1e1f23] border-2 border-blue-300/80 dark:border-blue-900/60 rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-md relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

          {/* Team Tag & Status */}
          <div className="flex items-center justify-between pb-3.5 border-b border-blue-100 dark:border-blue-900/40 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Shield size={16} />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-blue-700 dark:text-blue-300 block leading-tight">
                  {team1Name}
                </span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400 font-semibold">
                  Điểm: {blueScore}đ
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 text-xs font-black shadow-2xs">
              Câu {(blueIndex % questions.length) + 1}/{questions.length}
            </span>
          </div>

          {/* Question Box */}
          <div className="bg-gradient-to-b from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center flex-1 min-h-[170px] shadow-inner">
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

            <h3 className={`font-extrabold text-slate-900 dark:text-zinc-100 text-center leading-relaxed tracking-tight ${fontSizeClass}`}>
              {formatContent(blueQuestion?.content) || 'Đang tải câu hỏi...'}
            </h3>

            {blueIsRevealed && (
              <div className="mt-3.5 animate-in zoom-in-95 duration-150">
                {blueAnsweredIdx !== null && blueQuestion?.options[blueAnsweredIdx]?.isCorrect ? (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md animate-bounce">
                    <CheckCircle2 size={16} /> Chính xác! (+10đ, Kéo +1)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md">
                    <XCircle size={16} /> Chưa chính xác!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2x2 Options Grid for Blue with 4 Distinctive Kahoot Colors */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mt-4">
            {blueQuestion?.options.map((opt, idx) => {
              const isSelected = blueAnsweredIdx === idx;
              const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];

              let btnStyle = theme.style;
              let badgeStyle = theme.badge;

              if (blueIsRevealed) {
                if (opt.isCorrect) {
                  btnStyle =
                    'bg-emerald-500 text-white border-emerald-600 border-b-4 border-b-emerald-700 shadow-md font-bold scale-[1.01]';
                  badgeStyle = 'bg-white text-emerald-700 font-black';
                } else if (isSelected) {
                  btnStyle =
                    'bg-rose-500 text-white border-rose-600 border-b-4 border-b-rose-700 font-bold';
                  badgeStyle = 'bg-white text-rose-700 font-black';
                } else {
                  btnStyle = 'opacity-35 bg-slate-100 dark:bg-white/5 border-transparent border-b-2';
                  badgeStyle = 'bg-slate-200 dark:bg-zinc-800 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={blueIsRevealed || winnerTeamId !== null}
                  onClick={() => handleBlueSelect(idx)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[72px] sm:min-h-[82px] shadow-2xs font-bold active:translate-y-1 active:border-b-0 ${btnStyle}`}
                >
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${badgeStyle}`}
                  >
                    {theme.label}
                  </span>
                  <span className="leading-snug line-clamp-2 text-xs sm:text-sm">{formatContent(opt.content)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER TUG-OF-WAR ARENA (SÂN KÉO CO CHIẾN THUẬT) */}
        <div className="w-full md:w-[220px] lg:w-[250px] xl:w-[280px] bg-white dark:bg-[#1e1f23] border border-slate-200/90 dark:border-white/10 rounded-3xl p-3.5 sm:p-4 flex flex-col items-center justify-between shadow-md relative overflow-hidden shrink-0 min-h-[250px]">
          {/* Vertical Arena Center Dash Line */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 border-r-2 border-dashed border-amber-400/80 z-10" />

          {/* Arena Top Status Pill */}
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-zinc-100 text-[11px] sm:text-xs font-black z-20 shadow-xs flex items-center gap-1.5 text-center">
            <Zap size={13} className="text-amber-500 fill-amber-500 shrink-0" />
            <span className="truncate">
              {ropePosition === 0
                ? '⚖️ Đang cân bằng!'
                : ropePosition < 0
                ? `⬅️ ${team1Name} +${Math.abs(ropePosition)}`
                : `➡️ ${team2Name} +${ropePosition}`}
            </span>
          </div>

          {/* Visual Dynamic Tug Tension Bar */}
          <div className="w-full z-20 px-2 my-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1">
              <span className="text-blue-600">Thắng</span>
              <span className="text-slate-400">Giữa</span>
              <span className="text-rose-600">Thắng</span>
            </div>
            <div className="w-full h-3 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden relative border border-slate-300/80 dark:border-white/10">
              {/* Center marker line */}
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-slate-400 z-10" />
              {/* Tug indicator point */}
              <div
                className="absolute top-0 bottom-0 w-5 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full shadow-md transition-all duration-500 ease-out z-20"
                style={{
                  left: `${50 + (pullPercentage / 2)}%`,
                }}
              />
            </div>
          </div>

          {/* Animated Cartoon Students Tug Graphic */}
          <div
            className="relative w-full max-w-[210px] aspect-square flex items-center justify-center transition-transform duration-500 ease-out z-20 my-1"
            style={{
              transform: `translateX(${ropePosition * 20}px) rotate(${ropePosition * 1.5}deg)`,
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center filter drop-shadow-md">
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
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 shadow-2xs">
              Kéo qua mốc {maxPullLimit} để đoạt cúp 🏆
            </span>
          </div>
        </div>

        {/* COLUMN 3: ĐỘI ĐỎ (RED TEAM BATTLE BOX) */}
        <div className="flex-1 bg-white dark:bg-[#1e1f23] border-2 border-rose-300/80 dark:border-rose-900/60 rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-md relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-red-500 to-amber-400" />

          {/* Team Tag & Status */}
          <div className="flex items-center justify-between pb-3.5 border-b border-rose-100 dark:border-rose-900/40 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <Flame size={16} />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-rose-700 dark:text-rose-300 block leading-tight">
                  {team2Name}
                </span>
                <span className="text-[10px] text-rose-500 dark:text-rose-400 font-semibold">
                  Điểm: {redScore}đ
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-xs font-black shadow-2xs">
              Câu {(redIndex % questions.length) + 1}/{questions.length}
            </span>
          </div>

          {/* Question Box */}
          <div className="bg-gradient-to-b from-rose-50/80 to-red-50/40 dark:from-rose-950/30 dark:to-red-950/20 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center text-center flex-1 min-h-[170px] shadow-inner">
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
                  <circle cx="55" cy="80" r="2.5" fill="#ef4444" />
                </svg>
              </div>
            )}

            <h3 className={`font-extrabold text-slate-900 dark:text-zinc-100 text-center leading-relaxed tracking-tight ${fontSizeClass}`}>
              {formatContent(redQuestion?.content) || 'Đang tải câu hỏi...'}
            </h3>

            {redIsRevealed && (
              <div className="mt-3.5 animate-in zoom-in-95 duration-150">
                {redAnsweredIdx !== null && redQuestion?.options[redAnsweredIdx]?.isCorrect ? (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md animate-bounce">
                    <CheckCircle2 size={16} /> Chính xác! (+10đ, Kéo +1)
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-500 text-white font-black text-xs sm:text-sm shadow-md">
                    <XCircle size={16} /> Chưa chính xác!
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 2x2 Options Grid for Red with 4 Distinctive Kahoot Colors */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 mt-4">
            {redQuestion?.options.map((opt, idx) => {
              const isSelected = redAnsweredIdx === idx;
              const theme = OPTION_THEMES[idx] || OPTION_THEMES[0];

              let btnStyle = theme.style;
              let badgeStyle = theme.badge;

              if (redIsRevealed) {
                if (opt.isCorrect) {
                  btnStyle =
                    'bg-emerald-500 text-white border-emerald-600 border-b-4 border-b-emerald-700 shadow-md font-bold scale-[1.01]';
                  badgeStyle = 'bg-white text-emerald-700 font-black';
                } else if (isSelected) {
                  btnStyle =
                    'bg-rose-500 text-white border-rose-600 border-b-4 border-b-rose-700 font-bold';
                  badgeStyle = 'bg-white text-rose-700 font-black';
                } else {
                  btnStyle = 'opacity-35 bg-slate-100 dark:bg-white/5 border-transparent border-b-2';
                  badgeStyle = 'bg-slate-200 dark:bg-zinc-800 text-slate-400';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={redIsRevealed || winnerTeamId !== null}
                  onClick={() => handleRedSelect(idx)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center gap-2.5 text-left cursor-pointer min-h-[72px] sm:min-h-[82px] shadow-2xs font-bold active:translate-y-1 active:border-b-0 ${btnStyle}`}
                >
                  <span
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${badgeStyle}`}
                  >
                    {theme.label}
                  </span>
                  <span className="leading-snug line-clamp-2 text-xs sm:text-sm">{formatContent(opt.content)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUESTION GRID MODAL */}
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
