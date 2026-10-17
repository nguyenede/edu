'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '@/components/Select';
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
  shuffleQuestions: false,
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
  isFullPage?: boolean;
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
  isFullPage = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const modalContent = (
    <div
      className={
        isFullPage
          ? 'w-full max-w-4xl mx-auto space-y-6 pb-20 select-none animate-fadeIn'
          : 'fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-fadeIn select-none'
      }
    >
      <div
        className={
          isFullPage
            ? 'w-full space-y-6'
            : 'w-full max-w-3xl bg-white dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden'
        }
      >
        {/* HEADER */}
        {isFullPage ? (
          <div className="flex items-center gap-3 pb-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-google-blue dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                  {currentStep === 1
                    ? 'Chọn nguồn đề thi'
                    : currentStep === 2
                    ? 'Chọn lọc câu hỏi'
                    : 'Thiết lập luật chơi'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                  Bước {currentStep}/3
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#1a1b1e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-google-blue dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-zinc-100">
                    {`Thiết lập: ${gameTitle}`}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                    Bước {currentStep}/3
                  </span>
                </div>
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
        )}

        {/* STEPPER PROGRESS BAR (TỪNG BƯỚC) */}
        <div
          className={
            isFullPage
              ? 'py-1'
              : 'px-4 sm:px-6 py-3 bg-slate-50/80 dark:bg-[#18191a]/80 shrink-0'
          }
        >
          <div className="flex items-center justify-between gap-1 sm:gap-3 max-w-lg mx-auto">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
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
        <div className={`space-y-4 ${isFullPage ? '' : 'flex-1 p-4 sm:p-6 overflow-y-auto'}`}>
          {/* ============================================================ */}
          {/* BƯỚC 1: CHỌN ĐỀ THI TỪ THƯ VIỆN                              */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-3 animate-fadeIn">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Chọn đề thi từ kho tài liệu: {availableExams.length} đề thi sẵn có
              </label>

              {availableExams.length > 0 ? (
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    isFullPage ? 'lg:grid-cols-3' : ''
                  } gap-3 ${isFullPage ? '' : 'max-h-[380px] overflow-y-auto pr-1'}`}
                >
                  {availableExams.map((ex) => {
                    const isSelected = selectedExamId === ex.id;
                    return (
                      <div
                        key={ex.id}
                        onClick={() => onSelectExam(ex.id)}
                        className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-blue-500/10 dark:bg-blue-950/40 ring-2 ring-google-blue text-slate-900 dark:text-zinc-100'
                            : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-google-blue text-white'
                                : 'bg-white dark:bg-white/10 text-slate-600 dark:text-zinc-300 shadow-2xs'
                            }`}
                          >
                            <FileText size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">
                              {ex.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                              {ex.questions.length} câu hỏi trắc nghiệm
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-google-blue text-white'
                              : 'border border-slate-300 dark:border-zinc-600'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 text-center space-y-2">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Chưa tìm thấy đề thi trắc nghiệm nào trong thư viện tài liệu.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Vui lòng tải lên hoặc tạo đề thi trắc nghiệm trong mục &quot;Kho tài liệu&quot; trước khi tổ chức trò chơi.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* BƯỚC 2: CHỌN LỌC & TÙY CHỈNH CÂU HỎI                         */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-3 animate-fadeIn">
              {/* Header Action Bar (Không dùng khung hộp nặng nề) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
                <div>
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} className="text-google-blue" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                      Danh sách câu hỏi
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Bỏ chọn hết
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddQuestion}
                    className="px-3.5 py-1.5 rounded-xl bg-google-blue text-white text-xs font-bold hover:bg-blue-600 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus size={14} /> <span>Thêm câu hỏi</span>
                  </button>
                </div>
              </div>

              {/* Form thêm câu hỏi mới inline */}
              {isAddingNew && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-3 animate-fadeIn">
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
                    placeholder="Nhập nội dung câu hỏi"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18191a] text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">
                      Nhập các phương án và tích chọn ô tròn cho đáp án đúng:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newOptions.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191a]"
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
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 space-y-3 animate-fadeIn">
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
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#18191a] text-xs text-slate-800 dark:text-zinc-100 focus:outline-hidden"
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] font-medium text-slate-500">
                      Chọn ô tròn cho phương án đúng:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {editingQuestion.options.map((opt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#18191a]"
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
              <div className={`space-y-2 ${isFullPage ? '' : 'max-h-[420px] overflow-y-auto pr-1'}`}>
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
                        className={`p-3 rounded-xl transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-slate-50/80 hover:bg-slate-100/70 dark:bg-white/5 dark:hover:bg-white/[0.08]'
                            : 'bg-slate-50/30 dark:bg-white/[0.02] opacity-50'
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
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-100 leading-snug">
                            <strong className="font-bold text-google-blue dark:text-blue-400 mr-1.5 whitespace-nowrap">
                              Câu {idx + 1}:
                            </strong>
                            <span>{(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')}</span>
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {q.options.map((opt, oIdx) => (
                              <span
                                key={oIdx}
                                className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${
                                  opt.isCorrect
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                                    : 'bg-white dark:bg-white/10 text-slate-600 dark:text-zinc-400'
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
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
            <div className="space-y-5 animate-fadeIn">
              {/* Tiêu đề trò chơi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Tiêu đề trò chơi
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => updateConfig('title', e.target.value)}
                  placeholder={`Ví dụ: Trò chơi ${gameTitle} - Ôn tập kiến thức`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border-0 text-xs sm:text-sm text-slate-800 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-google-blue/30 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Thời gian, điểm thắng, đóng băng */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Thời gian thi đấu */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <Clock size={14} className="text-amber-500" />
                    <span>Thời gian thi đấu</span>
                  </div>
                  <CustomSelect
                    value={config.timeLimit}
                    onChange={(val) => updateConfig('timeLimit', Number(val))}
                    options={[
                      { value: 30, label: '30 giây (Rất nhanh)' },
                      { value: 60, label: '60 giây (Tiêu chuẩn)' },
                      { value: 90, label: '90 giây' },
                      { value: 120, label: '120 giây (2 phút)' },
                      { value: 0, label: 'Không giới hạn thời gian' },
                    ]}
                    size="sm"
                  />
                </div>

                {/* Điểm chênh lệch thắng */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <Sparkles size={14} className="text-emerald-500" />
                    <span>Mốc điểm thắng</span>
                  </div>
                  <CustomSelect
                    value={config.winDifference}
                    onChange={(val) => updateConfig('winDifference', Number(val))}
                    options={[
                      { value: 3, label: 'Chênh lệch 3 câu' },
                      { value: 5, label: 'Chênh lệch 5 câu' },
                      { value: 10, label: 'Chênh lệch 10 câu' },
                      { value: 999, label: 'Chơi hết bộ câu hỏi' },
                    ]}
                    size="sm"
                  />
                </div>

                {/* Thời gian đóng băng khi sai */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    <ShieldAlert size={14} className="text-rose-500" />
                    <span>Đóng băng khi sai</span>
                  </div>
                  <CustomSelect
                    value={config.freezeTime}
                    onChange={(val) => updateConfig('freezeTime', Number(val))}
                    options={[
                      { value: 0, label: 'Không đóng băng (0s)' },
                      { value: 2, label: '2 giây' },
                      { value: 3, label: '3 giây (Tiêu chuẩn)' },
                      { value: 5, label: '5 giây (Phạt nặng)' },
                    ]}
                    size="sm"
                  />
                </div>
              </div>

              {/* Phương thức điều khiển */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Phương thức điều khiển
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => updateConfig('controlMode', 'touch')}
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                      config.controlMode === 'touch'
                        ? 'bg-blue-500/10 dark:bg-blue-950/40 ring-2 ring-google-blue text-google-blue dark:text-blue-400'
                        : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300'
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
                    className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 ${
                      config.controlMode === 'keyboard'
                        ? 'bg-blue-500/10 dark:bg-blue-950/40 ring-2 ring-google-blue text-google-blue dark:text-blue-400'
                        : 'bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300'
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

              {/* Tùy chọn đảo câu hỏi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between">
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

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between">
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
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div
          className={
            isFullPage
              ? 'pt-4 flex items-center justify-end gap-2'
              : 'p-4 sm:p-5 flex items-center justify-end gap-2 shrink-0 bg-slate-50/80 dark:bg-[#18191a]/80'
          }
        >
          <div className="flex items-center gap-2">
            {/* Nút Quay lại */}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
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
                <span>Tiếp tục</span>
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
                <span>Tiếp tục</span>
                <ArrowRight size={14} />
              </button>
            )}

            {/* Bước 3: Lưu bài chơi */}
            {currentStep === 3 && (
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => {
                  if (onSaveGame) {
                    onSaveGame();
                  } else {
                    onStartGame();
                  }
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Check size={14} />
                <span>Lưu bài chơi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isFullPage && mounted && typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

