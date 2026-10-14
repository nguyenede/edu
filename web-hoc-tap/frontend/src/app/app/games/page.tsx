'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { idbSyncAndGetAll } from '@/lib/indexedDbStorage';
import { TugOfWarGame } from '@/components/games/TugOfWarGame';
import { LuckyWheelGame } from '@/components/games/LuckyWheelGame';
import { BoatRaceGame } from '@/components/games/BoatRaceGame';
import { ZombieDefenseGame } from '@/components/games/ZombieDefenseGame';
import { GoldMinerGame } from '@/components/games/GoldMinerGame';
import { FruitSlashGame } from '@/components/games/FruitSlashGame';
import { WhackAMoleGame } from '@/components/games/WhackAMoleGame';
import { BubblePopGame } from '@/components/games/BubblePopGame';
import { getGameCustomIcon } from '@/components/games/GameCustomIcons';
import {
  GameConfigModal,
  GameSettingsConfig,
  GameQuestion,
  DEFAULT_GAME_CONFIG,
} from '@/components/games/GameConfigModal';
import {
  normalizeGameQuestion,
  DEFAULT_CLASSROOM_TRIAL_QUESTIONS,
} from '@/lib/gameQuestionHelper';
import {
  Gamepad2,
  Trophy,
  Settings,
  Plus,
  Play,
  Trash2,
  Edit3,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface RealExamDocument {
  id: string;
  name: string;
  title: string;
  questionsCount: number;
  questions: any[];
}

export type ActiveGameMode =
  | 'tug_of_war'
  | 'lucky_wheel'
  | 'boat_race'
  | 'zombie'
  | 'gold_miner'
  | 'fruit_slash'
  | 'whack_a_mole'
  | 'bubble_pop'
  | null;

export interface CustomGameLesson {
  id: string;
  gameType: ActiveGameMode;
  title: string;
  isTrial?: boolean;
  examId: string;
  examTitle: string;
  config: GameSettingsConfig;
  questions: GameQuestion[];
  createdAt: number;
}

const STORAGE_KEY = 'app_custom_games_v2';

export default function GamesHubPage() {
  const router = useRouter();
  const [exams, setExams] = useState<RealExamDocument[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected game category workspace (e.g. 'tug_of_war' -> "Kéo co của tôi")
  const [activeCategory, setActiveCategory] = useState<ActiveGameMode>(null);

  // Currently playing game lesson
  const [playingLesson, setPlayingLesson] = useState<CustomGameLesson | null>(null);

  // Saved lessons by user
  const [savedLessons, setSavedLessons] = useState<CustomGameLesson[]>([]);

  // Setting / Creation modal state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [gameConfig, setGameConfig] = useState<GameSettingsConfig>(DEFAULT_GAME_CONFIG);
  const [customQuestions, setCustomQuestions] = useState<GameQuestion[]>([]);

  // Load saved lessons from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSavedLessons(parsed);
          }
        }
      } catch (err) {
        console.error('Error loading saved lessons:', err);
      }
    }
  }, []);

  const persistLessons = (lessons: CustomGameLesson[]) => {
    setSavedLessons(lessons);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
    }
  };

  // 100% load ONLY real documents from IndexedDB & localStorage (Zero mock data)
  useEffect(() => {
    let didCancel = false;

    const loadRealDocuments = async () => {
      try {
        const docMap = new Map<string, RealExamDocument>();

        // 1. From localStorage
        if (typeof window !== 'undefined') {
          const raw = localStorage.getItem('app_documents_files');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              for (const doc of parsed) {
                if (
                  doc &&
                  doc.id &&
                  doc.parsedQuiz &&
                  Array.isArray(doc.parsedQuiz.questions) &&
                  doc.parsedQuiz.questions.length > 0
                ) {
                  const normalizedQs = doc.parsedQuiz.questions.map((q: any, qIdx: number) =>
                    normalizeGameQuestion(q, qIdx)
                  );
                  docMap.set(doc.id, {
                    id: doc.id,
                    name: doc.name || doc.parsedQuiz.title || 'Đề thi trắc nghiệm',
                    title: doc.parsedQuiz.title || doc.name?.replace(/\.[^/.]+$/, '') || 'Đề thi',
                    questionsCount: normalizedQs.length,
                    questions: normalizedQs,
                  });
                }
              }
            }
          }
        }

        // 2. From IndexedDB
        const { documents: idbDocs } = await idbSyncAndGetAll();
        if (didCancel) return;

        for (const doc of idbDocs) {
          if (
            doc &&
            doc.id &&
            doc.parsedQuiz &&
            Array.isArray(doc.parsedQuiz.questions) &&
            doc.parsedQuiz.questions.length > 0
          ) {
            const normalizedQs = doc.parsedQuiz.questions.map((q: any, qIdx: number) =>
              normalizeGameQuestion(q, qIdx)
            );
            docMap.set(doc.id, {
              id: doc.id,
              name: doc.name || doc.parsedQuiz.title || 'Đề thi trắc nghiệm',
              title: doc.parsedQuiz.title || doc.name?.replace(/\.[^/.]+$/, '') || 'Đề thi',
              questionsCount: normalizedQs.length,
              questions: normalizedQs,
            });
          }
        }

        const validExams = Array.from(docMap.values());
        setExams(validExams);
        if (validExams.length > 0) {
          setSelectedExamId(validExams[0].id);
        }
      } catch (err) {
        console.error('Error loading documents for games:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRealDocuments();
    return () => {
      didCancel = true;
    };
  }, []);

  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  const GAME_LIST = [
    {
      id: 'tug_of_war' as const,
      title: 'Kéo co kiến thức',
      shortName: 'Kéo co',
      subtitle: 'Đối kháng 2 đội (Đội Xanh vs Đội Đỏ)',
      description: 'Chia lớp làm 2 đội. Trả lời đúng và nhanh hơn sẽ giật sợi dây về phía mình để giành chiến thắng.',
      badge: 'Đối kháng',
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      iconEmoji: '🤼‍♂️',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'boat_race' as const,
      title: 'Đua thuyền kiến thức',
      shortName: 'Đua thuyền',
      subtitle: 'Đua tốc độ 3 thuyền trên dòng sông',
      description: 'Mỗi câu trả lời đúng từ đề thi giúp thuyền bơi nhanh về đích. Thuyền nào cán đích trước sẽ đoạt cúp.',
      badge: 'Tốc độ',
      badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
      iconEmoji: '🛶',
      iconBg: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    },
    {
      id: 'lucky_wheel' as const,
      title: 'Vòng quay may mắn',
      shortName: 'Vòng quay',
      subtitle: 'Quay ngẫu nhiên câu hỏi & gọi tên',
      description: 'Vòng quay nhiều màu sắc quay đều với âm thanh hồi hộp. Dừng ở ô nào học sinh sẽ cùng giải đố câu đó.',
      badge: 'Vui nhộn',
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
      iconEmoji: '🎡',
      iconBg: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'zombie' as const,
      title: 'Chặn Zombie bảo vệ thành',
      shortName: 'Chặn Zombie',
      subtitle: 'Chiến thuật bắn hạ quái vật',
      description: 'Lũ zombie đang tiến về cổng thành. Trả lời đúng để khai hỏa đại bác bắn hạ quái vật bảo vệ thành trì.',
      badge: 'Phòng thủ',
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      iconEmoji: '🧟‍♂️',
      iconBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    },
    {
      id: 'gold_miner' as const,
      title: 'Đào vàng kiến thức',
      shortName: 'Đào vàng',
      subtitle: 'Thả móc kéo vàng và kim cương',
      description: 'Móc quay liên tục qua lại. Canh chuẩn hướng thả móc gắp thỏi vàng và giải đố câu hỏi để thu thập điểm.',
      badge: 'Khéo léo',
      badgeColor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-300',
      iconEmoji: '⛏️',
      iconBg: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
    },
    {
      id: 'fruit_slash' as const,
      title: 'Chém hoa quả trắc nghiệm',
      shortName: 'Chém hoa quả',
      subtitle: 'Chém quả mang đáp án đúng bay lên',
      description: 'Hoa quả bay lên mang các phương án A, B, C, D. Lướt chuột chém chính xác quả mang đáp án đúng.',
      badge: 'Phản xạ',
      badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      iconEmoji: '🍉',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'whack_a_mole' as const,
      title: 'Đập chuột chũi kiến thức',
      shortName: 'Đập chuột chũi',
      subtitle: 'Đập chú chuột mang đáp án chính xác',
      description: 'Chuột chũi nhô lên từ các lỗ hang cầm theo bảng đáp án. Nhanh tay đập trúng chú chuột đúng trước khi thụt xuống.',
      badge: 'Nhanh tay',
      badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
      iconEmoji: '🔨',
      iconBg: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    },
    {
      id: 'bubble_pop' as const,
      title: 'Bắt bong bóng đại dương',
      shortName: 'Bắt bong bóng',
      subtitle: 'Làm vỡ bong bóng chứa đáp án đúng',
      description: 'Các chùm bong bóng nhiều màu sắc bay bồng bềnh dưới đáy biển. Chạm nổ bong bóng đúng để tích lũy điểm số.',
      badge: 'Khám phá',
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      iconEmoji: '🫧',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
  ];

  const getCategoryMeta = (mode: ActiveGameMode) => {
    return GAME_LIST.find((g) => g.id === mode) || GAME_LIST[0];
  };

  // Filter lessons belonging to the currently active category
  const currentCategoryLessons = React.useMemo(() => {
    if (!activeCategory) return [];
    return savedLessons.filter((l) => l.gameType === activeCategory);
  }, [savedLessons, activeCategory]);

  // Generate trial run card (only when real exam is available)
  const trialLesson: CustomGameLesson | null = React.useMemo(() => {
    if (!activeCategory) return null;
    const meta = getCategoryMeta(activeCategory);
    const hasRealExam =
      selectedExam &&
      Array.isArray(selectedExam.questions) &&
      selectedExam.questions.length > 0;

    if (!hasRealExam) return null;

    const examQuestions = selectedExam.questions.map((q, idx) => normalizeGameQuestion(q, idx));
    const examTitle = selectedExam.title;
    const examId = selectedExam.id;

    return {
      id: `lesson_${activeCategory}_live`,
      gameType: activeCategory,
      title: `${meta.shortName} - Giảng dạy trên lớp`,
      isTrial: false,
      examId,
      examTitle,
      config: {
        ...DEFAULT_GAME_CONFIG,
        title: `${meta.shortName} - Giảng dạy trên lớp`,
      },
      questions: examQuestions,
      createdAt: Date.now(),
    };
  }, [activeCategory, selectedExam]);

  // Quick 1-click play for teachers on classroom projector
  const handleQuickPlayTrial = (mode: ActiveGameMode) => {
    setActiveCategory(mode);
    const meta = getCategoryMeta(mode);
    const hasRealExam =
      selectedExam &&
      Array.isArray(selectedExam.questions) &&
      selectedExam.questions.length > 0;

    if (!hasRealExam) {
      alert('Vui lòng tạo hoặc tải lên đề thi trong mục "Kho tài liệu" trước khi bắt đầu trò chơi!');
      router.push('/app/documents');
      return;
    }

    const examQuestions = selectedExam.questions.map((q, idx) => normalizeGameQuestion(q, idx));
    const examTitle = selectedExam.title;
    const examId = selectedExam.id;

    const lesson: CustomGameLesson = {
      id: `lesson_${mode}_quick`,
      gameType: mode,
      title: `${meta.shortName} - Giảng dạy trên lớp`,
      isTrial: false,
      examId,
      examTitle,
      config: {
        ...DEFAULT_GAME_CONFIG,
        title: `${meta.shortName} - Giảng dạy trên lớp`,
      },
      questions: examQuestions,
      createdAt: Date.now(),
    };
    setPlayingLesson(lesson);
  };

  // Open step-by-step game creation wizard
  const handleStartGameCreation = (mode: ActiveGameMode) => {
    if (!mode) return;
    setActiveCategory(mode);
    const meta = getCategoryMeta(mode);
    setEditingLessonId(null);
    const defaultExam = exams.length > 0 ? exams[0] : null;
    if (!defaultExam || !Array.isArray(defaultExam.questions) || defaultExam.questions.length === 0) {
      alert('Vui lòng tải lên hoặc tạo đề thi trong mục "Kho tài liệu" để thiết lập bài tập trò chơi!');
      router.push('/app/documents');
      return;
    }
    const examId = defaultExam.id;
    setSelectedExamId(examId);
    setGameConfig({
      ...DEFAULT_GAME_CONFIG,
      title: `${meta.shortName} - ${defaultExam.title || 'Bài tập mới'}`,
    });
    setCustomQuestions(
      defaultExam.questions.map((q, idx) => normalizeGameQuestion(q, idx))
    );
    setIsConfigModalOpen(true);
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    if (!activeCategory) return;
    handleStartGameCreation(activeCategory);
  };

  // Open edit modal
  const handleOpenEditModal = (lesson: CustomGameLesson) => {
    setEditingLessonId(lesson.id);
    setGameConfig(lesson.config);
    setCustomQuestions(lesson.questions);
    setSelectedExamId(lesson.examId);
    setIsConfigModalOpen(true);
  };

  // Save game configuration
  const handleSaveLesson = () => {
    if (!activeCategory) return;
    const meta = getCategoryMeta(activeCategory);

    if (editingLessonId) {
      // Update
      const updated = savedLessons.map((l) =>
        l.id === editingLessonId
          ? {
              ...l,
              title: gameConfig.title || meta.shortName,
              examId: selectedExamId,
              examTitle: selectedExam?.title || 'Đề thi',
              config: gameConfig,
              questions: customQuestions,
            }
          : l
      );
      persistLessons(updated);
    } else {
      // Create new
      const newLesson: CustomGameLesson = {
        id: `lesson_${Date.now()}`,
        gameType: activeCategory,
        title: gameConfig.title || `${meta.shortName} - ${selectedExam?.title || 'Bài tập mới'}`,
        examId: selectedExamId,
        examTitle: selectedExam?.title || 'Đề thi',
        config: gameConfig,
        questions: customQuestions,
        createdAt: Date.now(),
      };
      persistLessons([newLesson, ...savedLessons]);
    }
  };

  // Delete a lesson
  const handleDeleteLesson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedLessons.filter((l) => l.id !== id);
    persistLessons(updated);
  };

  // When selected exam in modal changes
  const handleSelectExamInModal = (examId: string) => {
    setSelectedExamId(examId);
    const target = exams.find((e) => e.id === examId);
    if (target) {
      setCustomQuestions(
        target.questions.map((q, idx) => normalizeGameQuestion(q, idx))
      );
    }
  };

  // Questions for currently playing lesson
  const activeQuestions = React.useMemo(() => {
    if (!playingLesson) return [];
    let list = playingLesson.questions.filter((q) => q.selected !== false);
    if (list.length === 0) list = playingLesson.questions;

    list = list.map((q, idx) => normalizeGameQuestion(q, idx));

    if (playingLesson.config.shuffleQuestions) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    if (playingLesson.config.shuffleOptions) {
      list = list.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    }
    return list;
  }, [playingLesson]);

  return (
    <AppShell
      title={
        playingLesson ? (
          <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
            <button
              type="button"
              onClick={() => {
                setPlayingLesson(null);
                setActiveCategory(null);
              }}
              className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              Trò chơi lớp học
            </button>
            <BreadcrumbChevron
              menuTitle="Danh sách trò chơi"
              items={GAME_LIST.map((g) => ({
                label: g.title,
                icon: getGameCustomIcon(g.id, 18),
                onClick: () => {
                  setPlayingLesson(null);
                  setActiveCategory(g.id);
                },
              }))}
            />
            <button
              type="button"
              onClick={() => setPlayingLesson(null)}
              className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal"
            >
              {getCategoryMeta(activeCategory).title}
            </button>
            <BreadcrumbChevron fallbackToStaticChevron={true} />
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal truncate max-w-xs sm:max-w-md">
              {playingLesson.title}
            </span>
          </div>
        ) : activeCategory ? (
          <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
            >
              Trò chơi lớp học
            </button>
            <BreadcrumbChevron
              menuTitle="Danh sách trò chơi"
              items={GAME_LIST.map((g) => ({
                label: g.title,
                icon: getGameCustomIcon(g.id, 18),
                onClick: () => setActiveCategory(g.id),
              }))}
            />
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
              {getCategoryMeta(activeCategory).title}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
            <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-semibold">
              Trò chơi lớp học
            </span>
          </div>
        )
      }
      action={
        activeCategory && !playingLesson ? (
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="rounded-xl text-xs gap-1.5"
          >
            <Plus size={15} />
            <span>Tạo Trò chơi mới</span>
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* LEVEL 3: ACTIVE PLAYING GAME */}
        {playingLesson ? (
          <div>
            {playingLesson.gameType === 'tug_of_war' && (
              <TugOfWarGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'lucky_wheel' && (
              <LuckyWheelGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'boat_race' && (
              <BoatRaceGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'zombie' && (
              <ZombieDefenseGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'gold_miner' && (
              <GoldMinerGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'fruit_slash' && (
              <FruitSlashGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'whack_a_mole' && (
              <WhackAMoleGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
            {playingLesson.gameType === 'bubble_pop' && (
              <BubblePopGame
                examTitle={playingLesson.title}
                questions={activeQuestions}
                onBack={() => setPlayingLesson(null)}
                config={playingLesson.config}
                onOpenSettings={() => handleOpenEditModal(playingLesson)}
              />
            )}
          </div>
        ) : activeCategory ? (
          /* LEVEL 2: "[TÊN GAME] CỦA TÔI ({N})" WORKSPACE VIEW (Đồng bộ chuẩn giao diện KiyoEdu) */
          <div className="space-y-4">
            {/* Header info bar */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 px-1">
              <div className="flex items-center gap-2">
                <span>
                  Danh sách bài chơi cho <b>{getCategoryMeta(activeCategory).title}</b>
                </span>
                <span>•</span>
                <span>{currentCategoryLessons.length} bài đã lưu</span>
              </div>
            </div>

            {/* Cards Grid: Trial Run + Saved Custom Lessons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Trial Run Card (Bản chạy thử có sẵn) */}
              {trialLesson && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-md">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
                      {trialLesson.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        Bản chạy thử
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                        {trialLesson.questions.length} câu hỏi
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Chơi thử trực tiếp cùng học sinh để trải nghiệm câu hỏi và luật chơi ngay trên lớp.
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      Từ: {trialLesson.examTitle}
                    </span>
                    <button
                      onClick={() => setPlayingLesson(trialLesson)}
                      className="px-5 py-2 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <Play size={13} className="fill-white" />
                      <span>Dạy ngay</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. User's Saved Lessons */}
              {currentCategoryLessons.map((lesson) => {
                const count = lesson.questions.filter((q) => q.selected !== false).length;
                return (
                  <div
                    key={lesson.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#1a1b1e] border border-slate-200/80 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50 transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-md"
                  >
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                          Đã lưu
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                          {count} câu hỏi
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-1">
                        Đề thi: {lesson.examTitle}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(lesson)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer"
                          title="Sửa cấu hình & câu hỏi"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteLesson(lesson.id, e)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Xóa bài này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => setPlayingLesson(lesson)}
                        className="px-5 py-2 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Play size={13} className="fill-white" />
                        <span>Dạy ngay</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prominent Center Button when no custom lessons created yet */}
            {currentCategoryLessons.length === 0 && (
              <div className="py-12 text-center select-none flex flex-col items-center justify-center">
                <Button
                  onClick={handleOpenCreateModal}
                  className="rounded-xl gap-2"
                >
                  <Plus size={16} />
                  <span>Tạo Trò chơi đầu tiên</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* LEVEL 1: OVERALL 8 GAMES CATALOG HUB */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 px-1">
              <span>
                Chọn trò chơi để bắt đầu dạy trực tiếp trên máy chiếu hoặc tạo bài giảng tương tác theo đề thi.
              </span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300">{GAME_LIST.length} trò chơi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {GAME_LIST.map((game) => {
                const savedCount = savedLessons.filter((l) => l.gameType === game.id).length;

                return (
                  <div
                    key={game.id}
                    onClick={() => handleStartGameCreation(game.id)}
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

                    {/* Action Buttons: Primary "Tạo bài chơi" (wizard) + Secondary "Chơi thử" */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartGameCreation(game.id);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Plus size={14} />
                        <span>Tạo bài chơi</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickPlayTrial(game.id);
                        }}
                        title="Chơi thử nhanh bằng câu hỏi mẫu"
                        className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Play size={12} className="fill-current" />
                        <span>Chơi thử</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Game Settings & Questions Modal */}
      {activeCategory && (
        <GameConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          gameTitle={getCategoryMeta(activeCategory).title}
          gameId={activeCategory}
          config={gameConfig}
          onChangeConfig={setGameConfig}
          questions={customQuestions}
          onChangeQuestions={setCustomQuestions}
          availableExams={exams}
          selectedExamId={selectedExamId}
          onSelectExam={handleSelectExamInModal}
          onSaveGame={handleSaveLesson}
          initialStep={editingLessonId ? 3 : 1}
          onStartGame={() => {
            const meta = getCategoryMeta(activeCategory);
            const newLesson: CustomGameLesson = {
              id: editingLessonId || `lesson_${Date.now()}`,
              gameType: activeCategory,
              title: gameConfig.title || meta.shortName,
              examId: selectedExamId,
              examTitle: selectedExam?.title || 'Đề thi',
              config: gameConfig,
              questions: customQuestions,
              createdAt: Date.now(),
            };
            const updated = editingLessonId
              ? savedLessons.map((l) => (l.id === editingLessonId ? newLesson : l))
              : [newLesson, ...savedLessons];
            persistLessons(updated);
            setPlayingLesson(newLesson);
          }}
        />
      )}
    </AppShell>
  );
}
