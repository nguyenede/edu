'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  HelpCircle,
  Check,
  X,
  Award,
  Smile,
  Zap,
  Flame,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

function PlayRoomInner() {
  const { roomCode } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nickname = searchParams.get('nick');

  const [socketConnected, setSocketConnected] = useState(false);
  const [gameStatus, setGameStatus] = useState<'LOBBY' | 'PLAYING' | 'ENDED'>('LOBBY');
  const [gameMode, setGameMode] = useState<'CLASSIC' | 'CHAOS'>('CHAOS');
  const [players, setPlayers] = useState<any[]>([]);

  // Real-time Score Stats
  const [score, setScore] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Feedback Flash
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    scoreDelta: number;
  } | null>(null);

  // Classic Mode State
  const [classicQuestions, setClassicQuestions] = useState<any[]>([]);
  const [classicIdx, setClassicIdx] = useState(0);

  // Chaos Mode State: 20-30 active questions on screen
  const [chaosQuestions, setChaosQuestions] = useState<any[]>([]);

  // End game state
  const [finalLeaderboard, setFinalLeaderboard] = useState<any[]>([]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!nickname || !roomCode) {
      router.push('/play');
      return;
    }

    // Connect to Websocket
    const socket = io('http://localhost:3005');
    socketRef.current = socket;

    socket.emit('room:join', { code: roomCode, nickname });

    socket.on('room:joined', (data: { player: any; mode: 'CLASSIC' | 'CHAOS' }) => {
      setSocketConnected(true);
      setGameMode(data.mode);
    });

    socket.on('room:players', (updatedPlayers: any[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on('game:started', (data: { mode: 'CLASSIC' | 'CHAOS' }) => {
      setGameStatus('PLAYING');
      setGameMode(data.mode);
    });

    // Classic init
    socket.on('classic:init', (data: { questions: any[] }) => {
      setClassicQuestions(data.questions);
    });

    // Chaos init
    socket.on('chaos:init', (data: { activeQuestions: any[] }) => {
      const formatted = data.activeQuestions.map((q) => ({
        ...q,
        tint:
          Math.random() > 0.6
            ? 'bg-slate-100/70 dark:bg-slate-900/60'
            : 'bg-slate-50/90 dark:bg-slate-900/40',
      }));
      setChaosQuestions(formatted);
    });

    // Server Authoritative Answer Result
    socket.on('answer:result', (res: { isCorrect: boolean; score: number; scoreDelta: number }) => {
      setScore(res.score);
      if (res.isCorrect) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        setWrongCount((w) => w + 1);
        setStreak(0);
      }

      setFeedback({ isCorrect: res.isCorrect, scoreDelta: res.scoreDelta });
      setTimeout(() => setFeedback(null), 850);
    });

    // Chaos Question Replacement Event
    socket.on('chaos:replace', (data: { oldQuestionId: string; newQuestion: any }) => {
      setChaosQuestions((prev) => {
        return prev
          .map((q) => {
            if (q.id === data.oldQuestionId) {
              if (data.newQuestion) {
                return {
                  ...data.newQuestion,
                  tint:
                    Math.random() > 0.6
                      ? 'bg-slate-100/70 dark:bg-slate-900/60'
                      : 'bg-slate-50/90 dark:bg-slate-900/40',
                };
              }
              return null;
            }
            return q;
          })
          .filter((q) => q !== null);
      });
    });

    socket.on('game:ended', (data: { leaderboard: any[] }) => {
      setFinalLeaderboard(data.leaderboard);
      setGameStatus('ENDED');
    });

    socket.on('error', (err: string) => {
      alert(err);
      router.push('/play');
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, nickname]);

  const handleClassicAnswer = (optionId: string) => {
    if (!socketRef.current || feedback) return;
    const currentQ = classicQuestions[classicIdx];
    socketRef.current.emit('quiz:answer', {
      code: roomCode,
      questionId: currentQ.id,
      optionId,
    });

    setTimeout(() => {
      if (classicIdx < classicQuestions.length - 1) {
        setClassicIdx((idx) => idx + 1);
      }
    }, 850);
  };

  const handleChaosAnswer = (questionId: string, optionId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('chaos:answer', {
      code: roomCode,
      questionId,
      optionId,
    });
  };

  const totalAnswered = correctCount + wrongCount;
  const accuracyPct = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans">
      {/* Realtime Action Feedback Banner */}
      {feedback && (
        <div
          className={`fixed top-0 left-0 right-0 py-2.5 text-center text-xs font-extrabold z-50 select-none ${
            feedback.isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {feedback.isCorrect
            ? `Chính xác! +${feedback.scoreDelta} điểm ${streak > 1 ? `(Streak x${streak} 🔥)` : ''}`
            : `Sai rồi! ${feedback.scoreDelta} điểm`}
        </div>
      )}

      {/* Top Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center select-none sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white dark:text-slate-950 font-extrabold text-lg">
            H
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-950 dark:text-slate-100 block">
              {nickname}
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold">
              Phòng: {roomCode}
            </span>
          </div>
        </div>

        {gameStatus === 'PLAYING' && (
          <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold">
            <div className="hidden sm:flex items-center gap-4 text-slate-500">
              <span>Đúng: {correctCount}</span>
              <span>Sai: {wrongCount}</span>
              <span>Độ chính xác: {accuracyPct}%</span>
            </div>
            {streak > 1 && (
              <span className="text-amber-500 font-bold flex items-center gap-1">
                <Flame size={14} /> x{streak}
              </span>
            )}
            <div className="bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-[4px]">
              <span className="font-mono font-extrabold text-sm text-blue-600 dark:text-blue-400">
                {score} pts
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Play Area */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto flex flex-col justify-center items-center">
        {/* Lobby Waiting Room */}
        {gameStatus === 'LOBBY' && (
          <div className="w-full max-w-md text-center space-y-6">
            <Smile className="mx-auto text-blue-600 dark:text-blue-400" size={48} />
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                Đã vào phòng chờ!
              </h2>
              <p className="text-xs text-slate-500">
                Biệt danh: <strong className="text-slate-900 dark:text-slate-100">{nickname}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] text-left space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Học sinh khác trong phòng ({players.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {players.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[4px] text-xs font-medium"
                  >
                    {p.nickname}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 animate-pulse">
              Đang chờ giáo viên nhấn bắt đầu trận đấu...
            </p>
          </div>
        )}

        {/* Classic Quiz Playing Mode */}
        {gameStatus === 'PLAYING' && gameMode === 'CLASSIC' && (
          <div className="w-full max-w-xl space-y-6">
            {classicQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">Đang tải câu hỏi...</p>
            ) : classicIdx >= classicQuestions.length ? (
              <div className="text-center space-y-3 py-12">
                <Check className="mx-auto text-emerald-600" size={48} />
                <h3 className="text-xl font-bold text-slate-950 dark:text-slate-100">
                  Hoàn thành toàn bộ câu hỏi!
                </h3>
                <p className="text-xs text-slate-500">
                  Đang chờ giáo viên kết thúc trận đấu để xem xếp hạng...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2 text-center select-none">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Câu hỏi {classicIdx + 1} / {classicQuestions.length}
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-950 dark:text-slate-100">
                    {classicQuestions[classicIdx].content}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classicQuestions[classicIdx].options.map((opt: any) => (
                    <button
                      key={opt.id}
                      onClick={() => handleClassicAnswer(opt.id)}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-[6px] text-left text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-1 focus:ring-blue-500 select-none"
                    >
                      {opt.content}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHAOS QUIZ Playing Mode: 25-Question Interactive Blitz Matrix */}
        {gameStatus === 'PLAYING' && gameMode === 'CHAOS' && (
          <div className="w-full space-y-4">
            <div className="text-center select-none space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-[4px] text-xs font-bold">
                <Zap size={14} /> MA TRẬN CHAOS QUIZ (20-25 CÂU ĐỒNG THỜI)
              </div>
              <p className="text-xs text-slate-500">
                Nhanh tay click vào đáp án đúng để ghi điểm. Bấm sai sẽ bị trừ điểm và đổi câu mới ngay lập tức!
              </p>
            </div>

            {chaosQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                Đang tải ma trận câu hỏi...
              </p>
            ) : (
              /* The 25-Question Matrix Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {chaosQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3.5 rounded-[6px] flex flex-col justify-between space-y-3 ${q.tint} select-none`}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">
                        Câu {idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-950 dark:text-slate-100 line-clamp-3 leading-snug">
                        {q.content}
                      </p>
                    </div>

                    {/* Direct clickable choices */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      {q.options.map((opt: any) => (
                        <button
                          key={opt.id}
                          onClick={() => handleChaosAnswer(q.id, opt.id)}
                          className="w-full p-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs text-left font-medium rounded-[4px] hover:bg-blue-50 dark:hover:bg-blue-950/40 active:bg-blue-100 dark:active:bg-blue-900 truncate focus:ring-1 focus:ring-blue-500"
                          title={opt.content}
                        >
                          {opt.content}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ended State: Ranking & Summary */}
        {gameStatus === 'ENDED' && (
          <div className="w-full max-w-md text-center space-y-6">
            <Award className="text-amber-500 mx-auto" size={56} />
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100">
                Trận đấu kết thúc!
              </h2>
              <p className="text-xs text-slate-500">
                Tổng kết điểm số của bạn: <strong className="text-blue-600 dark:text-blue-400 font-mono text-sm">{score} pts</strong>
              </p>
            </div>

            <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] text-left space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                Bảng xếp hạng phòng đấu
              </span>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {finalLeaderboard.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-3 rounded-[4px] text-xs font-semibold ${
                      item.nickname === nickname
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <span className="font-mono">
                      #{idx + 1} {item.nickname} {item.nickname === nickname ? '(Bạn)' : ''}
                    </span>
                    <span className="font-mono">{item.score} pts</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => router.push('/dashboard')}
              fullWidth
              size="md"
              className="font-bold"
            >
              Về trang chủ Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlayRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center items-center text-xs text-slate-400">
          Đang tải phòng chơi...
        </div>
      }
    >
      <PlayRoomInner />
    </Suspense>
  );
}
