'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ClassroomTeacherHeader } from './ClassroomTeacherHeader';
import { DuckRaceGame } from './DuckRaceGame';
import { MarbleRaceGame } from './MarbleRaceGame';
import { LuckyWheelView } from './LuckyWheelView';
import { BlindDuckPondGame } from './BlindDuckPondGame';
import { PhotoPairGame } from './PhotoPairGame';
import { LuckyLensGame } from './LuckyLensGame';
import { RosterConfigModal } from './RosterConfigModal';
import {
  DuckRaceIcon,
  MarbleRaceIcon,
  LuckyWheelIcon,
  BlindDuckIcon,
  PhotoPairIcon,
  LuckyLensIcon,
} from './GameCustomIcons';

export type RandomPickerSubMode =
  | 'duck'
  | 'wheel'
  | 'marble'
  | 'blind_duck'
  | 'photo_pair'
  | 'lucky_lens';

export interface RandomPickerGameProps {
  title?: string;
  initialMode?: RandomPickerSubMode;
  activeModeProp?: RandomPickerSubMode;
  onActiveModeChange?: (mode: RandomPickerSubMode) => void;
  hideHeader?: boolean;
  studentsProp?: string[];
  onStudentsChange?: (students: string[]) => void;
  soundEnabledProp?: boolean;
  onToggleSoundProp?: () => void;
  onBack: () => void;
  onSwitchGame?: (gameType: string) => void;
  onBackToHub?: () => void;
}

export const RANDOM_MODES: {
  id: RandomPickerSubMode;
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  desc: string;
  badge: string;
  color: string;
}[] = [
  {
    id: 'duck',
    title: 'Đua vịt tốc độ',
    icon: <DuckRaceIcon size={18} />,
    subtitle: 'Đàn vịt bơi đua tốc độ trên sông',
    desc: 'Đàn vịt bơi đua tốc độ trên dòng sông với đồ họa sống động, âm thanh quạc quạc và bục vinh danh Top 3 Quán quân.',
    badge: 'Nổi bật nhất',
    color: '#0891b2',
  },
  {
    id: 'marble',
    title: 'Đua bi tốc độ',
    icon: <MarbleRaceIcon size={18} />,
    subtitle: 'Đường đua bi vượt chướng ngại',
    desc: 'Các viên bi 3D nhiều màu sắc lăn qua chướng ngại vật, rơi xuống vạch đích và vinh danh Top 3 Quán quân.',
    badge: 'Vật lý 3D vui nhộn',
    color: '#7c3aed',
  },
  {
    id: 'wheel',
    title: 'Vòng quay nhiều màu',
    icon: <LuckyWheelIcon size={18} />,
    subtitle: 'Vòng quay may mắn gọi tên',
    desc: 'Vòng quay nhiều màu sắc phong cách sòng bạc với đèn viền nhấp nháy, âm thanh lách cách kịch tính.',
    badge: 'Kinh điển',
    color: '#3b82f6',
  },
  {
    id: 'blind_duck',
    title: 'Bắt vịt 3D',
    icon: <BlindDuckIcon size={18} />,
    subtitle: 'Bắt chú vịt bồng bềnh',
    desc: 'Bắt chú vịt đang bơi lội dưới hồ nước trong veo với hoa súng để khám phá học sinh được gọi tên bất ngờ.',
    badge: 'Hồ nước 3D',
    color: '#0284c7',
  },
  {
    id: 'photo_pair',
    title: 'Ghép cặp bằng ảnh',
    icon: <PhotoPairIcon size={18} />,
    subtitle: 'Tự động ghép đôi & chia nhóm',
    desc: 'Tự động chia cả lớp thành các cặp đôi hoặc nhóm 3, 4, 5 bạn với tên biệt đội siêu ngầu.',
    badge: 'Hoạt động nhóm',
    color: '#ea580c',
  },
  {
    id: 'lucky_lens',
    title: 'Ống kính may mắn',
    icon: <LuckyLensIcon size={18} />,
    subtitle: 'Radar quét mục tiêu',
    desc: 'Kính ngắm camera công nghệ cao quét qua ma trận lớp học và khóa mục tiêu bạn học sinh may mắn.',
    badge: 'Radar công nghệ',
    color: '#0284c7',
  },
];

export const DEFAULT_STUDENTS: string[] = [
  'Nguyễn Văn An',
  'Trần Thị Bích',
  'Lê Hoàng Cường',
  'Phạm Minh Đức',
  'Vũ Ngọc Hân',
  'Đỗ Hoàng Long',
  'Mai Thảo Linh',
  'Bùi Quốc Nam',
  'Hoàng Khánh Vy',
  'Đặng Gia Huy',
  'Ngô Phương Thảo',
  'Dương Anh Tuấn',
  'Phan Thanh Trúc',
  'Hà Minh Khôi',
  'Lý Cẩm Tú',
  'Trịnh Bảo Ngọc',
];

export const RandomPickerGame: React.FC<RandomPickerGameProps> = ({
  title,
  initialMode = 'duck',
  activeModeProp,
  onActiveModeChange,
  hideHeader = false,
  studentsProp,
  onStudentsChange,
  soundEnabledProp,
  onToggleSoundProp,
  onBack,
  onSwitchGame,
  onBackToHub,
}) => {
  const [internalActiveMode, setInternalActiveMode] = useState<RandomPickerSubMode>(initialMode);
  const activeMode = activeModeProp !== undefined ? activeModeProp : internalActiveMode;

  const setActiveMode = (mode: RandomPickerSubMode) => {
    setInternalActiveMode(mode);
    onActiveModeChange?.(mode);
  };

  const [internalStudents, setInternalStudents] = useState<string[]>(DEFAULT_STUDENTS);
  const students = studentsProp !== undefined ? studentsProp : internalStudents;
  const setStudents = (val: string[] | ((prev: string[]) => string[])) => {
    if (typeof val === 'function') {
      const next = val(students);
      if (onStudentsChange) onStudentsChange(next);
      else setInternalStudents(next);
    } else {
      if (onStudentsChange) onStudentsChange(val);
      else setInternalStudents(val);
    }
  };

  const [internalSoundEnabled, setInternalSoundEnabled] = useState(true);
  const soundEnabled = soundEnabledProp !== undefined ? soundEnabledProp : internalSoundEnabled;
  const setSoundEnabled = (val: boolean | ((prev: boolean) => boolean)) => {
    if (onToggleSoundProp) {
      onToggleSoundProp();
    } else {
      if (typeof val === 'function') {
        setInternalSoundEnabled((prev) => val(prev));
      } else {
        setInternalSoundEnabled(val);
      }
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  // Load students from storage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('random_picker_students');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStudents(parsed);
            return;
          }
        }
        // Fallback to active classroom
        const rawClass =
          sessionStorage.getItem('current_active_class') ||
          localStorage.getItem('current_active_class');
        if (rawClass) {
          const c = JSON.parse(rawClass);
          if (Array.isArray(c.students) && c.students.length > 0) {
            const names = c.students.map((s: any) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
            if (names.length > 0) {
              setStudents(names);
              return;
            }
          }
        }
      } catch (e) {}
    }
  }, []);

  // Save updated students
  const handleSaveRoster = (newList: string[]) => {
    const cleaned = newList.map((s) => s.trim()).filter(Boolean);
    const finalStudents = cleaned.length > 0 ? cleaned : DEFAULT_STUDENTS;
    setStudents(finalStudents);
    setIsRosterModalOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('random_picker_students', JSON.stringify(finalStudents));
      } catch (e) {}
    }
  };

  // Remove student from roster
  const handleRemoveStudent = (studentName: string) => {
    setStudents((prev) => {
      const next = prev.filter((s) => s !== studentName);
      try {
        localStorage.setItem('random_picker_students', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const currentModeMeta = RANDOM_MODES.find((m) => m.id === activeMode) || RANDOM_MODES[0];

  return (
    <div className={`w-full h-full flex-1 flex flex-col min-h-0 select-none ${hideHeader ? 'space-y-0' : 'space-y-3 sm:space-y-4'}`}>
      {/* SYNCHRONIZED CLASSROOM TEACHER HEADER (Only shown when not embedded in AppShell with custom header) */}
      {!hideHeader && (
        <ClassroomTeacherHeader
          title={currentModeMeta.title}
          gameShortName="Gọi tên ngẫu nhiên"
          subModeItems={RANDOM_MODES.map((m) => ({
            id: m.id,
            label: m.title,
            icon: m.icon,
            isActive: activeMode === m.id,
            onClick: () => setActiveMode(m.id),
          }))}
          onSwitchGame={onSwitchGame}
          onBackToHub={onBackToHub}
          teams={[]}
          activeTeamId={null}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          onBack={onBack}
          onRestart={() => {}}
          customToolbarRight={
            <button
              type="button"
              onClick={() => setIsRosterModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-zinc-100 border border-slate-200/80 dark:border-white/10 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-2xs"
              title="Quản lý danh sách học sinh"
            >
              <Users size={15} className="text-google-blue" />
              <span className="font-semibold">{students.length} học sinh</span>
            </button>
          }
        />
      )}

      {/* MAIN GAME ARENA (Fills 100% of space, exactly like Duck Race) */}
      <div className="flex-1 w-full flex flex-col overflow-hidden min-h-0 relative">
        {/* MODE: DUCK RACE (Đua vịt tốc độ) */}
        {activeMode === 'duck' && (
          <DuckRaceGame
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onRemoveStudent={handleRemoveStudent}
          />
        )}

        {/* MODE: MARBLE RACE (Đua bi tốc độ 3D) */}
        {activeMode === 'marble' && (
          <MarbleRaceGame
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onRemoveStudent={handleRemoveStudent}
          />
        )}

        {/* MODE: WHEEL OF FORTUNE (Vòng quay nhiều màu) */}
        {activeMode === 'wheel' && (
          <LuckyWheelView
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onRemoveStudent={handleRemoveStudent}
          />
        )}

        {/* MODE: BLIND DUCK POND (Bắt vịt 3D ao nước) */}
        {activeMode === 'blind_duck' && (
          <BlindDuckPondGame
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onRemoveStudent={handleRemoveStudent}
          />
        )}

        {/* MODE: PHOTO PAIR (Ghép cặp đôi & Chia nhóm) */}
        {activeMode === 'photo_pair' && (
          <PhotoPairGame
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
          />
        )}

        {/* MODE: LUCKY LENS (Ống kính may mắn Radar) */}
        {activeMode === 'lucky_lens' && (
          <LuckyLensGame
            students={students}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled((v) => !v)}
            onRemoveStudent={handleRemoveStudent}
          />
        )}
      </div>

      {/* ROSTER MANAGEMENT MODAL */}
      {!hideHeader && (
        <RosterConfigModal
          isOpen={isRosterModalOpen}
          onClose={() => setIsRosterModalOpen(false)}
          students={students}
          onSave={handleSaveRoster}
          title="Danh sách học sinh"
        />
      )}
    </div>
  );
};
