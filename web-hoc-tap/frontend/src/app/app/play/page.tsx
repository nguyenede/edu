'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Zap, Play, ArrowLeft, Gamepad2 } from 'lucide-react';

export default function PlayJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !nickname.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ mã PIN và biệt danh');
      return;
    }
    router.push(`/play/${code.trim()}?nick=${encodeURIComponent(nickname.trim())}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-6 bg-google-bg dark:bg-google-bg-dark font-sans">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="gap-2">
          <ArrowLeft size={16} /> Trang chủ
        </Button>
      </div>
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-google-blue text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-md">
          <Zap size={28} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Vào phòng chơi Game Realtime
        </h1>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Nhập mã PIN 6 số do giáo viên cung cấp để tham gia đấu trường Chaos Quiz
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="p-8 bg-white dark:bg-google-card-dark rounded-3xl space-y-5 shadow-sm border border-slate-100 dark:border-slate-800/80">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-2xl text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <Input
              label="Mã PIN phòng thi đấu"
              placeholder="VD: 849201"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center font-mono text-2xl font-bold tracking-widest uppercase"
              pill
              required
            />

            <Input
              label="Biệt danh hiển thị"
              placeholder="Nhập tên hoặc biệt danh"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="text-center font-semibold text-base"
              pill
              required
            />

            <Button type="submit" fullWidth size="lg" className="gap-2 font-bold shadow-md">
              <Play size={18} /> Tham gia phòng chờ
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
