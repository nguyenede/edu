'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ListChecks,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldAlert,
  Users,
  Play,
  Type,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  MousePointer,
  Keyboard,
  Layers,
} from 'lucide-react';

export interface GameQuestionOption {
  content: string;
  isCorrect: boolean;
}

export interface GameQuestion {
  id: string;
  content: string;
  options: GameQuestionOption[];
  explanation?: string;
  selected?: boolean;
}

export interface GameSettingsConfig {
  title: string;
  team1Name: string;
  team2Name: string;
  timeLimit: number; // 0 = unlimited, 30, 60, 90, 120
  winDifference: number; // 3, 5, 10
  freezeTime: number; // 0, 2, 3, 5
  controlMode: 'touch' | 'keyboard'; // touch vs keyboard
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  soundEnabled: boolean;
}

export const DEFAULT_GAME_CONFIG: GameSettingsConfig = {
  title: '',
  team1Name: 'Đội Xanh',
  team2Name: 'Đội Đỏ',
  timeLimit: 60,
  winDifference: 3,
  freezeTime: 3,
  controlMode: 'touch',
  shuffleQuestions: true,
  shuffleOptions: false,
  fontSize: 'normal',
  soundEnabled: true,
};

interface GameConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  gameId: string;
  config: GameSettingsConfig;
  onChangeConfig: (newConfig: GameSettingsConfig) => void;
  questions: GameQuestion[];
  onChangeQuestions: (newQuestions: GameQuestion[]) => void;
  availableExams: { id: string; title: string; questions: any[] }[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  onStartGame: () => void;
  onSaveGame?: () => void;
  initialStep?: 1 | 2 | 3;
}

export const GameConfigModal: React.FC<GameConfigModalProps> = ({
  isOpen,
  onClose,
  gameTitle,
  gameId,
  config,
  onChangeConfig,
  questions,
  onChangeQuestions,
  availableExams,
  selectedExamId,
  onSelectExam,
  onStartGame,
  onSaveGame,
  initialStep = 1,
}) => {
  // Wizard steps: 1 = Chọn đề thi, 2 = Chọn lọc câu hỏi, 3 = Luật chơi & Bắt đầu
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(initialStep);

  // Sync initialStep when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Question editing state
  const [editingQuestion, setEditingQuestion] = useState<GameQuestion | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<GameQuestionOption[]>([
    { content: '', isCorrect: true },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
    { content: '', isCorrect: false },
  ]);

  if (!isOpen) return null;

  const updateConfig = <K extends keyof GameSettingsConfig>(
    key: K,
    val: GameSettingsConfig[K]
  ) => {
    onChangeConfig({
      ...config,
      [key]: val,
    });
  };

  const handleToggleSelectQuestion = (id: string) => {
    onChangeQuestions(
      questions.map((q) => (q.id === id ? { ...q, selected: q.selected === false } : q))
    );
  };

  const handleSelectAll = (select: boolean) => {
    onChangeQuestions(questions.map((q) => ({ ...q, selected: select })));
  };

  const handleDeleteQuestion = (id: string) => {
    onChangeQuestions(questions.filter((q) => q.id !== id));
  };

  const handleOpenAddQuestion = () => {
    setNewQuestionText('');
    setNewOptions([
      { content: '', isCorrect: true },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
      { content: '', isCorrect: false },
    ]);
    setIsAddingNew(true);
  };

  const handleSaveNewQuestion = () => {
    if (!newQuestionText.trim()) return;
    const validOptions = newOptions.filter((opt) => opt.content.trim().length > 0);
    if (validOptions.length < 2) return;

    const hasCorrect = validOptions.some((opt) => opt.isCorrect);
    if (!hasCorrect) validOptions[0].isCorrect = true;

    const newQ: GameQuestion = {
      id: `custom_q_${Date.now()}`,
      content: newQuestionText.trim(),
      options: validOptions,
      selected: true,
    };

    onChangeQuestions([newQ, ...questions]);
    setIsAddingNew(false);
  };

  const handleSaveEditQuestion = () => {
    if (!editingQuestion || !editingQuestion.content.trim()) return;
    onChangeQuestions(
      questions.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
    );
    setEditingQuestion(null);
  };

  const selectedCount = questions.filter((q) => q.selected !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fadeIn select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#1e1f20]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-google-blue dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                  Tạo Trò chơi: {gameTitle}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                  Bước {currentStep}/3
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Quy trình từng bước thiết lập nguồn đề thi, câu hỏi và luật chơi lớp học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X size={16} />
          </button>
        </div>

        {/* STEPPER PROGRESS BAR (TỪNG BƯỚC) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-[#18191a]/80 border-b border-slate-200/60 dark:border-white/5 shrink-0">
          <div className="flex items-center justify-between gap-1 sm:gap-3 max-w-xl mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStep === 1
                  ? 'bg-google-blue text-white shadow-xs'
                  : currentStep > 1
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 1
                    ? 'bg-white text-google-blue'
                    : currentStep > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}
              >
                {currentStep > 1 ? <Check size={12} strokeWidth={3} /> : '1'}
              </span>
              <span className="hidden sm:inline">1. Chọn đề thi</span>
              <span className="sm:hidden">1. Đề thi</span>
            </button>

            {/* Line 1 -> 2 */}
            <div
              className={`flex-1 h-0.5 rounded-full transition-colors ${
                currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
              }`}
            />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStep === 2
                  ? 'bg-google-blue text-white shadow-xs'
                  : currentStep > 2
                  ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 2
                    ? 'bg-white text-google-blue'
                    : currentStep > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}
              >
                {currentStep > 2 ? <Check size={12} strokeWidth={3} /> : '2'}
              </span>
              <span className="hidden sm:inline">2. Chọn câu hỏi</span>
              <span className="sm:hidden">2. Câu hỏi</span>
            </button>

            {/* Line 2 -> 3 */}
            <div
              className={`flex-1 h-0.5 rounded-full transition-colors ${
                currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'
              }`}
            />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentStep === 3
                  ? 'bg-google-blue text-white shadow-xs'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  currentStep === 3
                    ? 'bg-white text-google-blue'
                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                }`}
              >
                3
              </span>
              <span className="hidden sm:inline">3. Luật chơi</span>
              <span className="sm:hidden">3. Luật</span>
            </button>
          </div>
        </div>

        {/* STEP CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ============================================================ */}
          {/* BƯỚC 1: CHỌN ĐỀ THI TỪ THƯ VIỆN                              */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-blue-50/70 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <BookOpen size={17} className="text-google-blue" />
                  <span>Bước 1: Chọn nguồn đề thi cho trò chơi</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Hệ thống hỗ trợ tự động tải câu hỏi từ các tài liệu bạn đã tạo trong kho đề thi, hoặc sử dụng ngay bộ câu hỏi mẫu để bắt đầu.
                </p>
              </div>

              {/* Danh sách đề thi */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Chọn đề thi từ kho tài liệu ({availableExams.length} đề thi sẵn có):
                </label>

                {availableExams.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {availableExams.map((ex) => {
                      const isSelected = selectedExamId === ex.id;
                      return (
                        <div
                          key={ex.id}
                          onClick={() => onSelectExam(ex.id)}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-google-blue bg-blue-500/5 dark:bg-blue-950/40 shadow-xs'
                              : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#18191a]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isSelected
                                  ? 'bg-google-blue text-white'
                                  : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-zinc-400'
                              }`}
                            >
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                                {ex.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                                  {ex.questions.length} câu hỏi
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {isSelected ? 'Đang chọn' : 'Bấm để chọn'}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isSelected
                                  ? 'bg-google-blue text-white'
                                  : 'border border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-center space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Chưa tìm thấy đề thi trắc nghiệm nào trong thư viện tài liệu.
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Vui lòng tải lên hoặc tạo đề thi trắc nghiệm trong mục &quot;Kho tài liệu&quot; trước khi tổ chức trò chơi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BƯỚC 2: CHỌN LỌC & TÙY CHỈNH CÂU HỎI                         */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Header Action Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} className="text-google-blue" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Bước 2: Chọn lọc câu hỏi xuất hiện trong game
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    Đã chọn <b className="text-google-blue">{selectedCount}</b> trên tổng số{' '}
                    <b>{questions.length}</b> câu hỏi
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer border border-slate-200/80 dark:border-white/5 transition-colors"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-100 cursor-pointer border border-slate-200/80 dark:border-white/5 transition-colors"
                  >
                    Bỏ chọn hết
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="px-3 py-1.5 rounded-lg bg-google-blue text-white text-xs font-bold hover:bg-blue-600 flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus size={14} /> <span>Thêm câu hỏi</span>
                  </button>
                </div>
              </div>

              {/* Form thêm câu hỏi mới inline */}
              {isAddingNew && (
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border-2 border-google-blue/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-google-blue dark:text-blue-400">
                      Tạo câu hỏi mới cho trò chơi
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Nhập nội dung câu hỏi..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#18191a] text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">
                      Nhập các phương án và tích chọn ô tròn cho đáp án đúng:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newOptions.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191a] border border-slate-200/80 dark:border-white/10"
                        >
                          <input
                            type="radio"
                            name="new_correct_opt"
                            checked={opt.isCorrect}
                            onChange={() =>
                              setNewOptions(
                                newOptions.map((o, idx) => ({ ...o, isCorrect: idx === i }))
                              )
                            }
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-400 w-4">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <input
                            type="text"
                            value={opt.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewOptions(
                                newOptions.map((o, idx) =>
                                  idx === i ? { ...o, content: val } : o
                                )
                              );
                            }}
                            placeholder={`Phương án ${String.fromCharCode(65 + i)}`}
                            className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewQuestion}
                      className="px-4 py-1.5 rounded-lg bg-google-blue text-white text-xs font-semibold hover:bg-blue-600 cursor-pointer"
                    >
                      Lưu câu hỏi
                    </button>
                  </div>
                </div>
              )}

              {/* Form sửa câu hỏi inline */}
              {editingQuestion && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Chỉnh sửa câu hỏi
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(null)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={editingQuestion.content}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, content: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#18191a] text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">
                      Chọn ô tròn cho phương án đúng:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editingQuestion.options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191a] border border-slate-200/80 dark:border-white/10"
                        >
                          <input
                            type="radio"
                            name="edit_correct_opt"
                            checked={opt.isCorrect}
                            onChange={() =>
                              setEditingQuestion({
                                ...editingQuestion,
                                options: editingQuestion.options.map((o, idx) => ({
                                  ...o,
                                  isCorrect: idx === i,
                                })),
                              })
                            }
                            className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-400 w-4">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <input
                            type="text"
                            value={opt.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingQuestion({
                                ...editingQuestion,
                                options: editingQuestion.options.map((o, idx) =>
                                  idx === i ? { ...o, content: val } : o
                                ),
                              });
                            }}
                            className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditQuestion}
                      className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              )}

              {/* Danh sách câu hỏi có checkbox */}
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {questions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Chưa có câu hỏi nào. Vui lòng bấm &quot;Thêm câu hỏi&quot; hoặc chọn đề thi khác ở Bước 1.
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const isSelected = q.selected !== false;
                    return (
                      <div
                        key={q.id || idx}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-white dark:bg-[#18191a] border-slate-200/80 dark:border-white/10'
                            : 'bg-slate-100/50 dark:bg-white/5 border-transparent opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuestion(q.id)}
                          className="mt-1 w-4 h-4 rounded-md accent-blue-600 cursor-pointer shrink-0"
                          title={isSelected ? 'Bỏ chọn câu này' : 'Dùng câu này'}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-500">
                              Câu {idx + 1}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-100 leading-snug">
                            {q.content}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {q.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                                  opt.isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                                    : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-zinc-400'
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt.content}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingQuestion(q)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Sửa câu hỏi"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Xóa câu hỏi này"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BƯỚC 3: CẤU HÌNH LUẬT CHƠI & ĐỘI THI                         */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-purple-50/70 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-200/60 dark:border-purple-900/40">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                  <Settings size={17} className="text-purple-600 dark:text-purple-400" />
                  <span>Bước 3: Thiết lập luật chơi & thông số giảng dạy</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Tùy chỉnh thời gian trả lời, điều kiện giành chiến thắng và phân chia đội ngũ thi đấu trên lớp.
                </p>
              </div>

              {/* Tiêu đề trò chơi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tiêu đề trò chơi / Buổi học
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  placeholder={`Ví dụ: Trò chơi ${gameTitle} - Ôn tập kiến thức`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#18191a] text-xs sm:text-sm text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-google-blue/30 focus:border-google-blue transition-all"
                />
              </div>

              {/* Tên 2 Đội thi đấu */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <Users size={15} className="text-blue-500" />
                  <span>Tên các đội thi đấu trên lớp</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                      Đội 1 (Xanh / Nhóm 1)
                    </label>
                    <input
                      type="text"
                      value={config.team1Name}
                      onChange={(e) => updateConfig('team1Name', e.target.value)}
                      placeholder="Đội Xanh"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                      Đội 2 (Đỏ / Nhóm 2)
                    </label>
                    <input
                      type="text"
                      value={config.team2Name}
                      onChange={(e) => updateConfig('team2Name', e.target.value)}
                      placeholder="Đội Đỏ"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs font-medium text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Thời gian, điểm thắng, đóng băng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Thời gian thi đấu */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    <Clock size={14} className="text-amber-500" />
                    <span>Thời gian thi đấu</span>
                  </div>
                  <select
                    value={config.timeLimit}
                    onChange={(e) => updateConfig('timeLimit', Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value={30}>30 giây (Rất nhanh)</option>
                    <option value={60}>60 giây (Tiêu chuẩn)</option>
                    <option value={90}>90 giây</option>
                    <option value={120}>120 giây (2 phút)</option>
                    <option value={0}>Không giới hạn thời gian</option>
                  </select>
                </div>

                {/* Điểm chênh lệch thắng */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    <Sparkles size={14} className="text-emerald-500" />
                    <span>Mốc điểm thắng</span>
                  </div>
                  <select
                    value={config.winDifference}
                    onChange={(e) => updateConfig('winDifference', Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value={3}>Chênh lệch 3 câu</option>
                    <option value={5}>Chênh lệch 5 câu</option>
                    <option value={10}>Chênh lệch 10 câu</option>
                    <option value={999}>Chơi hết bộ câu hỏi</option>
                  </select>
                </div>

                {/* Thời gian đóng băng khi sai */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
                    <ShieldAlert size={14} className="text-rose-500" />
                    <span>Đóng băng khi sai</span>
                  </div>
                  <select
                    value={config.freezeTime}
                    onChange={(e) => updateConfig('freezeTime', Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value={0}>Không đóng băng (0s)</option>
                    <option value={2}>2 giây</option>
                    <option value={3}>3 giây (Tiêu chuẩn)</option>
                    <option value={5}>5 giây (Phạt nặng)</option>
                  </select>
                </div>
              </div>

              {/* Phương thức điều khiển */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Phương thức điều khiển
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => updateConfig('controlMode', 'touch')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      config.controlMode === 'touch'
                        ? 'border-google-blue bg-blue-500/10 dark:bg-blue-950/40 text-google-blue dark:text-blue-400'
                        : 'border-transparent bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#323437]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <MousePointer size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Màn tương tác / Chuột</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Chạm bảng thông minh hoặc click chuột chọn đáp án trực tiếp trên màn hình.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => updateConfig('controlMode', 'keyboard')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      config.controlMode === 'keyboard'
                        ? 'border-google-blue bg-blue-500/10 dark:bg-blue-950/40 text-google-blue dark:text-blue-400'
                        : 'border-transparent bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#323437]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center shrink-0">
                      <Keyboard size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Bàn phím chia đôi (2 Đội)</div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Đội 1 dùng phím <b>Q, W, A, S</b> — Đội 2 dùng phím <b>O, P, K, L</b> trên cùng 1 máy tính.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tùy chọn đảo câu hỏi & Cỡ chữ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Đảo ngẫu nhiên câu hỏi
                    </div>
                    <div className="text-[11px] text-slate-400">Xáo trộn thứ tự xuất hiện</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.shuffleQuestions}
                    onChange={(e) => updateConfig('shuffleQuestions', e.target.checked)}
                    className="w-4 h-4 rounded-md accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      Đảo vị trí đáp án
                    </div>
                    <div className="text-[11px] text-slate-400">Xáo trộn các vị trí A, B, C, D</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.shuffleOptions}
                    onChange={(e) => updateConfig('shuffleOptions', e.target.checked)}
                    className="w-4 h-4 rounded-md accent-blue-600 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <Type size={14} className="text-indigo-500" />
                    <span>Cỡ chữ màn chiếu</span>
                  </div>
                  <select
                    value={config.fontSize}
                    onChange={(e) =>
                      updateConfig('fontSize', e.target.value as 'normal' | 'large' | 'xlarge')
                    }
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs text-slate-800 dark:text-zinc-200 cursor-pointer"
                  >
                    <option value="normal">Chuẩn (Màn hình máy tính)</option>
                    <option value="large">Lớn (Màn chiếu TV / Lớp học)</option>
                    <option value="xlarge">Rất lớn (Hội trường xa)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER WITH STEP-BY-STEP ACTIONS */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-slate-50/80 dark:bg-[#18191a]/80">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            {currentStep === 1 && (
              <span>
                Đang nạp <b>{questions.length}</b> câu hỏi từ nguồn được chọn
              </span>
            )}
            {currentStep === 2 && (
              <span>
                Đã chọn <b>{selectedCount}</b>/{questions.length} câu hỏi
              </span>
            )}
            {currentStep === 3 && (
              <span>
                Sẵn sàng thi đấu với <b>{selectedCount}</b> câu hỏi
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Quay lại */}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#282a2c] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10 flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Quay lại</span>
              </button>
            )}

            {/* Bước 1: Sang Bước 2 */}
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl bg-google-blue hover:bg-blue-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Tiếp tục: Chọn câu hỏi</span>
                <ArrowRight size={14} />
              </button>
            )}

            {/* Bước 2: Sang Bước 3 */}
            {currentStep === 2 && (
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 rounded-xl bg-google-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>Tiếp tục: Cấu hình luật</span>
                <ArrowRight size={14} />
              </button>
            )}

            {/* Bước 3: Lưu bài hoặc Bắt đầu ngay */}
            {currentStep === 3 && (
              <>
                {onSaveGame && (
                  <button
                    type="button"
                    disabled={selectedCount === 0}
                    onClick={() => {
                      onSaveGame();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Check size={14} />
                    <span>Lưu bài chơi</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() => {
                    if (onSaveGame) onSaveGame();
                    onClose();
                    onStartGame();
                  }}
                  className="px-4 py-2 rounded-xl bg-google-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <Play size={14} className="fill-white" />
                  <span>Bắt đầu dạy ngay</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
