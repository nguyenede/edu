'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Badge } from '@/components/Badge';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  BookOpen,
  Plus,
  Trash2,
  Check,
  Search,
  Download,
  Upload,
  Layers,
  HelpCircle,
  Lock,
} from 'lucide-react';

export default function QuestionBankPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [banks, setBanks] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateBankOpen, setIsCreateBankOpen] = useState(false);
  const [isCreateQuestionOpen, setIsCreateQuestionOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // Bank Form
  const [bankName, setBankName] = useState('');
  const [bankDesc, setBankDesc] = useState('');

  // Question Form
  const [qContent, setQContent] = useState('');
  const [qType, setQType] = useState('MULTIPLE_CHOICE');
  const [qDifficulty, setQDifficulty] = useState('MEDIUM');
  const [qPoints, setQPoints] = useState(1);
  const [qTimeLimit, setQTimeLimit] = useState(30);
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState<any[]>([
    { content: 'Lựa chọn A', isCorrect: true },
    { content: 'Lựa chọn B', isCorrect: false },
    { content: 'Lựa chọn C', isCorrect: false },
    { content: 'Lựa chọn D', isCorrect: false },
  ]);

  // Import Text State
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const isTeacher = React.useMemo(() => {
    if (!user) return false;
    const r = (user.role || '').toUpperCase();
    return r === 'TEACHER' || r === 'ADMIN' || r === 'GIAOVIEN';
  }, [user]);

  // BẢO MẬT: Chuyển hướng học sinh về Lớp học nếu truy cập ngân hàng câu hỏi
  useEffect(() => {
    if (user && !isTeacher) {
      router.replace('/classes');
    }
  }, [user, isTeacher, router]);

  useEffect(() => {
    if (!token || !isTeacher) {
      return;
    }
    fetchBanks();
    fetchQuestions();
  }, [token, isTeacher, selectedBankId, difficultyFilter, typeFilter]);

  const fetchBanks = async () => {
    try {
      const res = await fetch('/api/questions/banks', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBanks(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let url = '/api/questions?';
      if (selectedBankId) url += `bankId=${selectedBankId}&`;
      if (difficultyFilter) url += `difficulty=${difficultyFilter}&`;
      if (typeFilter) url += `type=${typeFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setQuestions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) return;

    try {
      const res = await fetch('/api/questions/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: bankName, description: bankDesc || undefined }),
      });
      if (res.ok) {
        setBankName('');
        setBankDesc('');
        setIsCreateBankOpen(false);
        fetchBanks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qContent.trim()) return;

    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionBankId: selectedBankId || undefined,
          content: qContent,
          type: qType,
          difficulty: qDifficulty,
          points: Number(qPoints),
          timeLimit: Number(qTimeLimit),
          explanation: qExplanation || undefined,
          options: qOptions,
        }),
      });

      if (res.ok) {
        setQContent('');
        setQExplanation('');
        setIsCreateQuestionOpen(false);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      const res = await fetch(`/api/questions/${questionToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setQuestionToDelete(null);
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'question_bank_export.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) throw new Error('Dữ liệu JSON phải là một mảng câu hỏi');

      for (const item of parsed) {
        await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionBankId: selectedBankId || undefined,
            content: item.content,
            type: item.type || 'MULTIPLE_CHOICE',
            difficulty: item.difficulty || 'MEDIUM',
            points: Number(item.points || 1),
            timeLimit: Number(item.timeLimit || 30),
            explanation: item.explanation || undefined,
            options: Array.isArray(item.options) && item.options.length >= 2
              ? item.options
              : (() => {
                  throw new Error(`Câu hỏi "${item.content || ''}" không có danh sách đáp án hợp lệ. Tuyệt đối không dùng dữ liệu giả.`);
                })(),
          }),
        });
      }

      setImportJsonText('');
      setIsImportOpen(false);
      fetchQuestions();
    } catch (err: any) {
      setImportError(err.message || 'Lỗi định dạng JSON');
    }
  };

  const updateOptionText = (index: number, text: string) => {
    const updated = [...qOptions];
    updated[index].content = text;
    setQOptions(updated);
  };

  const setCorrectOption = (index: number) => {
    const updated = qOptions.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setQOptions(updated);
  };

  if (user && !isTeacher) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
            <Lock size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Quyền truy cập bị hạn chế</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md text-sm mb-4">
            Chỉ tài khoản giáo viên mới có quyền truy cập ngân hàng câu hỏi. Đang chuyển hướng bạn về danh sách lớp học...
          </p>
          <Button onClick={() => router.replace('/classes')} className="bg-primary hover:bg-primary/90 text-white text-sm">
            Về trang Lớp học
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Ngân hàng Câu hỏi"
      subtitle="Tổ chức kho câu hỏi theo danh mục, độ khó, dạng câu hỏi và Import/Export dữ liệu"
      action={
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExportJSON} className="gap-1.5">
            <Download size={14} /> Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/question-bank/import')} className="gap-1.5">
            <Upload size={14} /> Import JSON
          </Button>
          <Button size="sm" onClick={() => router.push('/question-bank/create')} className="gap-1.5">
            <Plus size={16} /> Tạo câu hỏi mới
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Col: Banks Sidebar */}
        <div className="md:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chủ đề & Danh mục
            </h3>
            <button
              onClick={() => setIsCreateBankOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1"
            >
              <Plus size={14} /> Thêm
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedBankId('')}
              className={`w-full text-left px-3 py-2 rounded-[6px] text-xs font-semibold ${
                selectedBankId === ''
                  ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              Tất cả câu hỏi ({questions.length})
            </button>

            {banks.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBankId(b.id)}
                className={`w-full text-left px-3 py-2 rounded-[6px] text-xs font-semibold ${
                  selectedBankId === b.id
                    ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                {b.name} ({b._count?.questions ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Right 3 Cols: Filter Bar and Questions List */}
        <div className="md:col-span-3 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap gap-2.5 items-center py-2">
            <div className="flex-1 min-w-[220px] relative">
              <input
                type="text"
                placeholder="Tìm nội dung câu hỏi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#282a2c] text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
              />
              <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
            </div>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-[#282a2c] text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">Độ khó (Tất cả)</option>
              <option value="EASY">Dễ</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HARD">Khó</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-[#282a2c] text-slate-900 dark:text-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="">Dạng câu hỏi (Tất cả)</option>
              <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
              <option value="TRUE_FALSE">Đúng / Sai</option>
            </select>

            <Button size="sm" variant="secondary" onClick={fetchQuestions}>
              Lọc
            </Button>
          </div>

          {/* Question List */}
          {loading ? (
            <p className="text-xs text-slate-400 py-12 text-center">Đang tải câu hỏi...</p>
          ) : questions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <HelpCircle size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Chưa có câu hỏi nào
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Nhấn Thêm câu hỏi hoặc Import JSON để bắt đầu xây dựng ngân hàng câu hỏi.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="py-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="font-bold text-sm text-slate-950 dark:text-slate-100 leading-relaxed">
                      <span className="text-google-blue dark:text-blue-400 mr-1.5 whitespace-nowrap">
                        Câu {idx + 1}:
                      </span>
                      <span>{(q.content || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '')}</span>
                    </span>
                    <button
                      onClick={() => setQuestionToDelete(q.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt: any) => (
                      <div
                        key={opt.id}
                        className={`p-2 rounded text-xs font-medium flex items-center gap-2 ${
                          opt.isCorrect
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                            : 'bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Check
                          size={14}
                          className={opt.isCorrect ? 'text-emerald-600 shrink-0' : 'invisible'}
                        />
                        <span>{opt.content}</span>
                      </div>
                    ))}
                  </div>

                  {/* Meta Tags */}
                  <div className="flex flex-wrap gap-3 items-center text-[10px] text-slate-400 pt-1">
                    <Badge variant={q.difficulty === 'EASY' ? 'success' : q.difficulty === 'HARD' ? 'danger' : 'warning'}>
                      {q.difficulty === 'EASY' ? 'Dễ' : q.difficulty === 'HARD' ? 'Khó' : 'Trung bình'}
                    </Badge>
                    <span>Thời gian: {q.timeLimit}s</span>
                    <span>Thang điểm: {q.points}</span>
                    {q.explanation && (
                      <span className="text-slate-500 italic">
                        Giải thích: {q.explanation}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Bank Modal */}
      <Modal
        isOpen={isCreateBankOpen}
        onClose={() => setIsCreateBankOpen(false)}
        title="Thêm danh mục câu hỏi"
      >
        <form onSubmit={handleCreateBank} className="space-y-4">
          <Input
            label="Tên danh mục"
            placeholder="Ví dụ: Hình học không gian, Lịch sử Việt Nam"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            required
          />
          <Input
            label="Mô tả danh mục"
            placeholder="Ghi chú chi tiết..."
            value={bankDesc}
            onChange={(e) => setBankDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateBankOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Tạo danh mục
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Question Modal */}
      <Modal
        isOpen={isCreateQuestionOpen}
        onClose={() => setIsCreateQuestionOpen(false)}
        title="Tạo câu hỏi trắc nghiệm mới"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Nội dung câu hỏi
            </label>
            <textarea
              placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
              className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500 min-h-[70px]"
              value={qContent}
              onChange={(e) => setQContent(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Độ khó
              </label>
              <select
                value={qDifficulty}
                onChange={(e) => setQDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </div>

            <Input
              label="Thời gian trả lời (giây)"
              type="number"
              value={qTimeLimit}
              onChange={(e) => setQTimeLimit(Number(e.target.value))}
              min={5}
            />
          </div>

          {/* Options Setup */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Các lựa chọn đáp án (Click nút xanh để đánh dấu đáp án đúng)
            </label>
            {qOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectOption(idx)}
                  className={`p-2 rounded-[4px] select-none ${
                    opt.isCorrect
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                  title={opt.isCorrect ? 'Đáp án đúng' : 'Click để chọn làm đáp án đúng'}
                >
                  <Check size={14} />
                </button>
                <Input
                  value={opt.content}
                  onChange={(e) => updateOptionText(idx, e.target.value)}
                  placeholder={`Lựa chọn ${idx + 1}`}
                  required
                />
              </div>
            ))}
          </div>

          <Input
            label="Giải thích đáp án"
            placeholder="Lời giải chi tiết hoặc căn cứ câu trả lời..."
            value={qExplanation}
            onChange={(e) => setQExplanation(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateQuestionOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Lưu câu hỏi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import JSON Modal */}
      <Modal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Import câu hỏi từ JSON"
        maxWidth="lg"
      >
        <form onSubmit={handleImportJSON} className="space-y-4">
          {importError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-[4px]">
              {importError}
            </div>
          )}

          <p className="text-xs text-slate-500">
            Dán dữ liệu JSON chứa mảng các câu hỏi gồm <code className="font-mono">content</code>, <code className="font-mono">options</code>.
          </p>

          <textarea
            placeholder={`[\n  {\n    "content": "Một năm có mấy quý?",\n    "difficulty": "EASY",\n    "options": [\n      { "content": "4 quý", "isCorrect": true },\n      { "content": "12 quý", "isCorrect": false }\n    ]\n  }\n]`}
            className="w-full px-3 py-2 font-mono bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500 min-h-[160px]"
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsImportOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Nhập câu hỏi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        onConfirm={handleDeleteQuestion}
        title="Xóa câu hỏi này?"
        message="Hành động này sẽ xóa vĩnh viễn câu hỏi khỏi ngân hàng."
        isDestructive
        confirmText="Xóa câu hỏi"
      />
    </AppShell>
  );
}
