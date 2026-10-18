'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  RandomPickerGame,
  DEFAULT_STUDENTS,
  RANDOM_MODES,
  RandomPickerSubMode,
} from '@/components/games/RandomPickerGame';
import { RosterConfigModal } from '@/components/games/RosterConfigModal';
import { getGameCustomIcon } from '@/components/games/GameCustomIcons';
import { Users, ChevronRight, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

const GAME_LIST = [
  {
    id: 'random_picker' as const,
    title: 'Gọi tên ngẫu nhiên',
    subtitle: 'Vòng quay, đua vịt, đua bi, bắt vịt...',
    description:
      'Vòng quay, đua vịt, đua bi, bắt vịt 3D, ghép cặp bằng ảnh và ống kính may mắn.',
    badge: 'Nổi bật',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  },
];

function GamesHubContent() {
  // Roster state for Random Picker / Duck Race games
  const [rosterStudents, setRosterStudents] = useState<string[]>(DEFAULT_STUDENTS);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isPlayingRandomPicker, setIsPlayingRandomPicker] = useState(false);
  const [activeSubMode, setActiveSubMode] = useState<RandomPickerSubMode>('duck');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const handleOpenGame = () => {
    setIsFullscreen(true);
    setIsPlayingRandomPicker(true);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('random_picker_students');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRosterStudents(parsed);
            return;
          }
        }
      } catch (e) {}
    }
  }, []);

  const handleSaveRosterFromPage = (newList: string[]) => {
    const cleaned = newList.map((s) => s.trim()).filter(Boolean);
    const finalStudents = cleaned.length > 0 ? cleaned : DEFAULT_STUDENTS;
    setRosterStudents(finalStudents);
    setIsRosterModalOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('random_picker_students', JSON.stringify(finalStudents));
      } catch (e) {}
    }
  };

  // =========================================================================
  // GIAO DIỆN TRÒ CHƠI HOẠT NÁO (ĐỒNG BỘ 100% VỚI WEB, TRẮNG RA TRẮNG ĐEN RA ĐEN)
  // ĐÃ GÔM TẤT CẢ VÀO 1 HEADER DUY NHẤT CỦA APPSHELL - XÓA HOÀN TOÀN HEADER THỨ 2
  // =========================================================================
  if (isPlayingRandomPicker) {
    if (isFullscreen) {
      return (
        <div className="fixed inset-0 z-[100] w-screen h-screen flex flex-col bg-white dark:bg-[#1e1f20] select-none overflow-hidden">
          <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#1e1f20] border-0 z-10">
            {/* Left: Breadcrumb / Title & Sub-modes */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-full overflow-hidden">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsFullscreen(false);
                    setIsPlayingRandomPicker(false);
                  }}
                  className="cursor-pointer text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white font-medium shrink-0 whitespace-nowrap transition-colors text-xs sm:text-sm"
                >
                  Trò chơi lớp học
                </button>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                <span className="text-slate-900 dark:text-white font-bold shrink-0 whitespace-nowrap text-xs sm:text-sm">
                  Gọi tên ngẫu nhiên
                </span>
              </div>

              <div className="h-4 w-px bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />

              {/* Sub-mode switcher tabs (Pills) */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 min-w-0">
                {RANDOM_MODES.map((m) => {
                  const isActive = activeSubMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveSubMode(m.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-google-blue text-white shadow-xs'
                          : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                      title={m.desc}
                    >
                      <span>{m.icon}</span>
                      <span className="hidden md:inline">{m.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsRosterModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs h-9"
                title="Quản lý danh sách học sinh"
              >
                <Users size={15} className="text-google-blue shrink-0" />
                <span className="font-semibold hidden sm:inline">{rosterStudents.length} học sinh</span>
                <span className="font-semibold sm:hidden">{rosterStudents.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs"
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-500" />}
              </button>

              {/* Close/Minimize button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs"
                title="Thu nhỏ lại (Esc)"
              >
                <Minimize2 size={16} />
              </button>
            </div>
          </div>

          {/* Full-Window Game Arena */}
          <div className="flex-1 w-full h-[calc(100vh-56px)] overflow-hidden min-h-0 relative flex flex-col">
            <div className="w-full h-full flex-1 flex flex-col overflow-hidden min-h-0 relative">
              <RandomPickerGame
                title="Gọi tên ngẫu nhiên"
                initialMode="duck"
                activeModeProp={activeSubMode}
                onActiveModeChange={setActiveSubMode}
                hideHeader={true}
                studentsProp={rosterStudents}
                onStudentsChange={handleSaveRosterFromPage}
                soundEnabledProp={soundEnabled}
                onToggleSoundProp={() => setSoundEnabled((v) => !v)}
                onBack={() => {
                  setIsFullscreen(false);
                  setIsPlayingRandomPicker(false);
                }}
                onBackToHub={() => {
                  setIsFullscreen(false);
                  setIsPlayingRandomPicker(false);
                }}
              />
            </div>
          </div>

          {/* Modal Cấu hình danh sách học sinh */}
          <RosterConfigModal
            isOpen={isRosterModalOpen}
            onClose={() => setIsRosterModalOpen(false)}
            students={rosterStudents}
            onSave={handleSaveRosterFromPage}
            title="Danh sách học sinh tham gia"
          />
        </div>
      );
    }

    return (
      <AppShell
        fullBleed={true}
        title={
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-full overflow-hidden">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPlayingRandomPicker(false)}
                className="cursor-pointer text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white font-medium shrink-0 whitespace-nowrap transition-colors text-xs sm:text-sm"
              >
                Trò chơi lớp học
              </button>
              <ChevronRight size={14} className="text-slate-400 shrink-0" />
              <span className="text-slate-900 dark:text-white font-bold shrink-0 whitespace-nowrap text-xs sm:text-sm">
                Gọi tên ngẫu nhiên
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-slate-200 dark:bg-white/10 shrink-0 hidden sm:block" />

            {/* Sub-mode switcher tabs (Pills) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 min-w-0">
              {RANDOM_MODES.map((m) => {
                const isActive = activeSubMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveSubMode(m.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-google-blue text-white shadow-xs'
                        : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                    title={m.desc}
                  >
                    <span>{m.icon}</span>
                    <span className="hidden md:inline">{m.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
        action={
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Student list configuration button */}
            <button
              type="button"
              onClick={() => setIsRosterModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-2xs h-9"
              title="Quản lý danh sách học sinh (Nhập file Excel / Tạo danh sách số)"
            >
              <Users size={15} className="text-google-blue shrink-0" />
              <span className="font-semibold hidden sm:inline">{rosterStudents.length} học sinh</span>
              <span className="font-semibold sm:hidden">{rosterStudents.length}</span>
            </button>

            {/* Sound toggle button */}
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-red-500" />}
            </button>

            {/* Full-window maximize button */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 shadow-2xs"
              title="Phóng to toàn cửa sổ (Không dùng F11)"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        }
      >
        <div className="w-full flex-1 flex flex-col h-full overflow-hidden min-h-0">
          <div className="w-full h-full flex-1 flex flex-col overflow-hidden min-h-0 relative">
            <RandomPickerGame
              title="Gọi tên ngẫu nhiên"
              initialMode="duck"
              activeModeProp={activeSubMode}
              onActiveModeChange={setActiveSubMode}
              hideHeader={true}
              studentsProp={rosterStudents}
              onStudentsChange={handleSaveRosterFromPage}
              soundEnabledProp={soundEnabled}
              onToggleSoundProp={() => setSoundEnabled((v) => !v)}
              onBack={() => setIsPlayingRandomPicker(false)}
              onBackToHub={() => setIsPlayingRandomPicker(false)}
            />
          </div>
        </div>

        {/* Modal Cấu hình danh sách học sinh (File Excel & Số thứ tự) */}
        <RosterConfigModal
          isOpen={isRosterModalOpen}
          onClose={() => setIsRosterModalOpen(false)}
          students={rosterStudents}
          onSave={handleSaveRosterFromPage}
          title="Danh sách học sinh tham gia"
        />
      </AppShell>
    );
  }

  // =========================================================================
  // TRANG CHỦ DANH MỤC TRÒ CHƠI LỚP HỌC (GÔM GỌN TRÒ CHƠI VÀO 1 CARD DUY NHẤT)
  // =========================================================================
  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <span className="text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap">
            Trò chơi lớp học
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Lưới trò chơi - Gôm gọn tất cả các chế độ vào card duy nhất */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GAME_LIST.map((game) => (
            <div
              key={game.id}
              onClick={handleOpenGame}
              className="group rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-white/10 hover:border-google-blue/50 dark:hover:border-google-blue/50 transition-all duration-150 select-none flex flex-col justify-between shadow-2xs hover:shadow-md cursor-pointer active:scale-[0.99]"
            >
              <div>
                {/* Top Icon & Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${game.iconBg}`}>
                    {getGameCustomIcon(game.id, 24)}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${game.badgeColor}`}>
                    {game.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 group-hover:text-google-blue transition-colors">
                  {game.title}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                  {game.subtitle}
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed line-clamp-2">
                  {game.description}
                </p>
              </div>

              {/* Single Full-width Clean Action Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGame();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-google-blue hover:text-white dark:hover:bg-google-blue text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs group-hover:bg-google-blue group-hover:text-white"
                >
                  <span>Mở trò chơi</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roster Management Modal (Hỗ trợ nhập File Excel/CSV/TXT và Đánh số thứ tự) */}
      <RosterConfigModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        students={rosterStudents}
        onSave={handleSaveRosterFromPage}
        title="Danh sách học sinh tham gia"
      />
    </AppShell>
  );
}

export default function GamesHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-google-bg dark:bg-[#131314]" />}>
      <GamesHubContent />
    </Suspense>
  );
}
