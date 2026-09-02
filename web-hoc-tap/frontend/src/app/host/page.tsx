'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { io, Socket } from 'socket.io-client';
import {
  Award,
  Play,
  Users,
  XCircle,
  LogOut,
  Copy,
  Check,
  Zap,
  Flame,
  ArrowLeft,
} from 'lucide-react';

function HostInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');
  const mode = searchParams.get('mode') || 'CHAOS';
  const { token, user } = useAuthStore();

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameStatus, setGameStatus] = useState<'LOBBY' | 'PLAYING' | 'ENDED'>('LOBBY');
  const [copied, setCopied] = useState(false);
  const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || user?.role !== 'TEACHER') {
      router.push('/login');
      return;
    }

    if (!quizId) {
      router.push('/quizzes');
      return;
    }

    // Connect to WebSocket gateway
    const socket = io('http://localhost:3005', {
      auth: { token },
    });
    socketRef.current = socket;

    // Create room
    socket.emit('room:create', { quizId, mode });

    socket.on('room:created', (data: { code: string }) => {
      setRoomCode(data.code);
    });

    socket.on('room:players', (updatedPlayers: any[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on('room:leaderboard', (data: any[]) => {
      setLeaderboard(data);
    });

    socket.on('game:started', () => {
      setGameStatus('PLAYING');
    });

    socket.on('game:ended', (data: { leaderboard: any[] }) => {
      setLeaderboard(data.leaderboard);
      setGameStatus('ENDED');
    });

    socket.on('error', (err: string) => {
      alert(err);
      router.push('/quizzes');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, quizId, mode]);

  const handleStartGame = () => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('room:start', { code: roomCode });
  };

  const handleConfirmEndGame = () => {
    if (!roomCode || !socketRef.current) return;
    socketRef.current.emit('room:end', { code: roomCode });
    setIsEndConfirmOpen(false);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex justify-between items-center select-none sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white dark:text-slate-950 font-extrabold text-lg">
            H
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-950 dark:text-slate-100 block">
              HocRealtime Host
            </span>
            <div className="flex items-center gap-1.5">
              <Badge variant={mode === 'CHAOS' ? 'warning' : 'primary'}>
                {mode === 'CHAOS' ? 'Chaos Quiz' : 'Classic Quiz'}
              </Badge>
              {roomCode && (
                <span className="text-[10px] text-slate-400 font-mono font-bold">
                  PIN: {roomCode}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/quizzes')}
            className="text-red-600 gap-1.5"
          >
            <LogOut size={16} /> Thoát
          </Button>
        </div>
      </header>

      {/* Main Host Screen */}
      <main className="flex-1 p-6 max-w-5xl w-full mx-auto flex flex-col justify-center items-center">
        {gameStatus === 'LOBBY' && (
          <div className="w-full max-w-xl text-center space-y-8">
            <div className="space-y-3 select-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                MÃ PIN THAM GIA PHÒNG ĐẤU
              </span>
              <div
                onClick={handleCopyCode}
                className="text-6xl sm:text-7xl font-extrabold tracking-widest text-blue-600 dark:text-blue-500 font-mono select-all cursor-pointer inline-flex items-center gap-3 justify-center"
                title="Click để sao chép mã"
              >
                {roomCode || '------'}
              </div>
              <p className="text-xs text-slate-500">
                Học sinh truy cập trang chủ và nhập mã PIN để tham gia
              </p>
            </div>

            {/* Players waiting list */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] text-left space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users size={15} /> Học sinh đã tham gia ({players.length})
                </span>
                <button
                  onClick={handleCopyCode}
                  className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Đã sao chép mã' : 'Sao chép mã PIN'}
                </button>
              </div>

              {players.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Đang chờ học sinh nhập mã PIN vào phòng...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {players.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-[4px] text-xs font-bold ring-1 ring-slate-200/20"
                    >
                      {p.nickname}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleStartGame}
              disabled={players.length === 0}
              size="lg"
              fullWidth
              className="gap-2 text-base font-bold py-3.5"
            >
              <Play size={20} /> Bắt đầu trận đấu ({players.length} người)
            </Button>
          </div>
        )}

        {gameStatus === 'PLAYING' && (
          <div className="w-full space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                    Trận đấu đang diễn ra...
                  </h2>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Mã PIN: {roomCode} | Chế độ: {mode === 'CHAOS' ? 'Chaos Quiz (Ma trận)' : 'Classic Quiz'}
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsEndConfirmOpen(true)}
                className="gap-1.5"
              >
                <XCircle size={16} /> Kết thúc trận đấu
              </Button>
            </div>

            {/* Live Leaderboard */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/40 dark:border-slate-800/40 pb-2 flex items-center justify-between">
                <span>Bảng xếp hạng thời gian thực</span>
                <span>{leaderboard.length} thí sinh</span>
              </h3>

              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Đang ghi nhận lượt làm bài đầu tiên...
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {leaderboard.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3.5 bg-white dark:bg-slate-950 rounded-[4px] text-xs font-semibold select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-mono font-bold w-6 ${
                            idx === 0
                              ? 'text-amber-500'
                              : idx === 1
                              ? 'text-slate-400'
                              : idx === 2
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {item.nickname}
                        </span>
                      </div>

                      <div className="flex gap-6 items-center text-slate-500">
                        <span>Đúng: {item.correctCount}</span>
                        <span>Sai: {item.wrongCount}</span>
                        <span>Độ chính xác: {Math.round(item.accuracy)}%</span>
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm w-20 text-right">
                          {item.score} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {gameStatus === 'ENDED' && (
          <div className="w-full max-w-xl text-center space-y-6">
            <Award className="text-amber-500 mx-auto" size={56} />
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100">
                Trận đấu đã kết thúc!
              </h2>
              <p className="text-xs text-slate-500">
                Tổng kết điểm số và xếp hạng chung cuộc của phòng đấu
              </p>
            </div>

            {/* Podium top 3 & list */}
            <div className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] text-left space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200/40 dark:border-slate-800/40 pb-2">
                Bảng vàng thành tích
              </span>
              <div className="space-y-2">
                {leaderboard.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-white dark:bg-slate-950 rounded-[4px] text-xs font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold w-6 ${
                          idx === 0
                            ? 'text-amber-500'
                            : idx === 1
                            ? 'text-slate-400'
                            : idx === 2
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.nickname}
                      </span>
                    </div>

                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {item.score} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => router.push('/quizzes')}
              fullWidth
              size="md"
              className="font-bold"
            >
              Quay lại quản lý đề thi
            </Button>
          </div>
        )}
      </main>

      {/* Confirm End Game */}
      <ConfirmDialog
        isOpen={isEndConfirmOpen}
        onClose={() => setIsEndConfirmOpen(false)}
        onConfirm={handleConfirmEndGame}
        title="Kết thúc trận đấu?"
        message="Hành động này sẽ dừng phiên làm bài của tất cả học sinh và hiển thị bảng xếp hạng chung cuộc."
        isDestructive
        confirmText="Kết thúc ngay"
      />
    </div>
  );
}

export default function HostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center items-center text-xs text-slate-400">
          Đang tải sảnh điều khiển...
        </div>
      }
    >
      <HostInner />
    </Suspense>
  );
}
