'use client';

import React, { useState } from 'react';
import {
  Settings,
  ListChecks,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Volume2,
  VolumeX,
  Keyboard,
  MousePointer,
  Sparkles,
  Shuffle,
  Clock,
  ShieldAlert,
  Users,
  Play,
  Type,
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
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('settings');

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

    // Ensure at least one correct
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-fadeIn select-none">
      <div className="w-full max-w-3xl bg-white dark:bg-[#1e1f20] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-google-blue dark:text-blue-400 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-zinc-100">
                Thiết lập & Tùy chỉnh: {gameTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Cấu hình luật chơi, thời gian và bộ câu hỏi lớp học
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200/60 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-[#18191a]/50">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-google-blue text-google-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Settings size={15} />
            <span>Cấu hình luật chơi</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'questions'
                ? 'border-google-blue text-google-blue dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <ListChecks size={15} />
            <span>Bộ câu hỏi</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 font-bold">
              {selectedCount}/{questions.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {activeTab === 'settings' ? (
            /* TAB 1: GAME RULES & CONFIG */
            <div className="space-y-5">
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

              {/* Tên 2 Đội (Đối kháng / Thi đấu) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-zinc-300">
                  <Users size={15} className="text-blue-500" />
                  <span>Tên các đội thi đấu</span>
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

              {/* Tùy chọn đảo & cỡ chữ */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Đảo câu hỏi */}
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

                {/* Đảo đáp án */}
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

                {/* Cỡ chữ màn chiếu */}
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
          ) : (
            /* TAB 2: QUESTIONS MANAGER & EDITOR */
            <div className="space-y-4">
              {/* Exam Source Selector */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#18191a] border border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 mb-1">
                    Chọn đề thi từ kho tài liệu:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => onSelectExam(e.target.value)}
                    className="w-full sm:max-w-md px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#282a2c] text-xs font-semibold text-slate-800 dark:text-zinc-100 cursor-pointer"
                  >
                    {availableExams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.questions.length} câu)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 text-xs font-medium hover:bg-slate-100 cursor-pointer border border-slate-200/80 dark:border-white/5"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#282a2c] text-slate-600 dark:text-zinc-300 text-xs font-medium hover:bg-slate-100 cursor-pointer border border-slate-200/80 dark:border-white/5"
                  >
                    Bỏ chọn hết
                  </button>
                  <button
                    onClick={handleOpenAddQuestion}
                    className="px-3 py-1.5 rounded-lg bg-google-blue text-white text-xs font-semibold hover:bg-blue-600 flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus size={14} /> Thêm câu hỏi
                  </button>
                </div>
              </div>

              {/* Add New Question Modal / Inline Box */}
              {isAddingNew && (
                <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border-2 border-blue-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-google-blue dark:text-blue-400">
                      Tạo câu hỏi mới cho trò chơi
                    </h4>
                    <button
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
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveNewQuestion}
                      className="px-4 py-1.5 rounded-lg bg-google-blue text-white text-xs font-semibold hover:bg-blue-600 cursor-pointer"
                    >
                      Lưu câu hỏi
                    </button>
                  </div>
                </div>
              )}

              {/* Edit Question Modal */}
              {editingQuestion && (
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-500/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Chỉnh sửa câu hỏi
                    </h4>
                    <button
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
                      onClick={() => setEditingQuestion(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-medium cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleSaveEditQuestion}
                      className="px-4 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                    >
                      Cập nhật
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-2.5">
                {questions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có câu hỏi nào trong đề thi này.
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const isSelected = q.selected !== false;
                    return (
                      <div
                        key={q.id || idx}
                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-white dark:bg-[#18191a] border-slate-200/80 dark:border-white/10'
                            : 'bg-slate-100/50 dark:bg-white/5 border-transparent opacity-60'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuestion(q.id)}
                          className="mt-1 w-4 h-4 rounded-md accent-blue-600 cursor-pointer shrink-0"
                          title={isSelected ? 'Bỏ chọn câu này' : 'Dùng câu này'}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-500">
                              Câu {idx + 1}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-100 leading-snug">
                            {q.content}
                          </p>

                          {/* Options pills */}
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

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            title="Sửa câu hỏi"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
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
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-slate-50/70 dark:bg-[#18191a]/70">
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            {selectedCount > 0 ? (
              <span>
                Đã sẵn sàng với <b className="text-slate-800 dark:text-zinc-200">{selectedCount}</b> câu hỏi
              </span>
            ) : (
              <span className="text-rose-500 font-medium">Vui lòng chọn ít nhất 1 câu hỏi</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#282a2c] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-200/80 dark:border-white/10"
            >
              Hủy
            </button>
            {onSaveGame && (
              <button
                disabled={selectedCount === 0}
                onClick={() => {
                  onSaveGame();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>💾 Lưu cài đặt trò chơi</span>
              </button>
            )}
            <button
              disabled={selectedCount === 0}
              onClick={() => {
                if (onSaveGame) onSaveGame();
                onClose();
                onStartGame();
              }}
              className="px-4 py-2 rounded-xl bg-google-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Play size={14} className="fill-white" />
              <span>Lưu & Chơi ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
