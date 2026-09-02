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
import { Play, Plus, Trash2, Check, Clock, HelpCircle, Zap } from 'lucide-react';

export default function QuizzesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [hostQuizModalId, setHostQuizModalId] = useState<string | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  // Quiz Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [classId, setClassId] = useState('');
  const [showAnswers, setShowAnswers] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Host Mode Selection
  const [selectedMode, setSelectedMode] = useState<'CLASSIC' | 'CHAOS'>('CHAOS');

  useEffect(() => {
    if (!token || user?.role !== 'TEACHER') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Quizzes
      const quizRes = await fetch('/api/quizzes/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (quizRes.ok) setQuizzes(await quizRes.json());

      // 2. Questions
      const qRes = await fetch('/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (qRes.ok) setQuestions(await qRes.json());

      // 3. Classes
      const cRes = await fetch('/api/classes/teacher', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cRes.ok) setClasses(await cRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || selectedQuestionIds.length === 0) {
      setFormError('Vui lòng nhập tiêu đề và chọn ít nhất 1 câu hỏi.');
      return;
    }
    setFormError(null);

    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          timeLimit: Number(timeLimit),
          maxAttempts: Number(maxAttempts),
          classId: classId || undefined,
          showAnswers,
          questionIds: selectedQuestionIds,
        }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setSelectedQuestionIds([]);
        setIsCreateQuizOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        setFormError(err.message || 'Lỗi tạo đề thi');
      }
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    try {
      const res = await fetch(`/api/quizzes/${quizToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setQuizToDelete(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQuestionSelect = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter((id) => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  const startHosting = () => {
    if (!hostQuizModalId) return;
    router.push(`/host?quizId=${hostQuizModalId}&mode=${selectedMode}`);
  };

  return (
    <AppShell
      title="Đề trắc nghiệm & Game Multiplayer"
      subtitle="Thiết lập bộ đề thi, quản lý ngân hàng câu hỏi và mở phòng chơi game Classic / Chaos Quiz"
      action={
        <Button size="sm" onClick={() => router.push('/quizzes/create')} className="gap-1.5">
          <Plus size={16} /> Tạo bộ đề mới
        </Button>
      }
    >
      <div className="space-y-6">
        {loading ? (
          <p className="text-xs text-slate-400 py-12 text-center">Đang tải danh sách đề thi...</p>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Play size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Chưa có bộ đề trắc nghiệm nào
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nhấn nút Tạo bộ đề mới để chọn các câu hỏi từ ngân hàng và mở phòng chơi cho học sinh.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="p-5 bg-slate-50/80 dark:bg-slate-900/40 rounded-[6px] flex flex-col justify-between space-y-4 select-none"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100 text-base">
                      {quiz.title}
                    </h3>
                    <button
                      onClick={() => setQuizToDelete(quiz.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-[4px]"
                      title="Xóa đề thi"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {quiz.description || 'Không có mô tả chi tiết'}
                  </p>

                  <div className="flex flex-wrap gap-2 items-center text-[10px] text-slate-400">
                    <Badge variant="primary">
                      {quiz._count?.questions ?? 0} câu hỏi
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {quiz.timeLimit} phút
                    </span>
                    {quiz.class && (
                      <span className="text-slate-500">Khóa lớp: {quiz.class.name}</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setHostQuizModalId(quiz.id)}
                    className="w-full gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:text-slate-950"
                  >
                    <Play size={16} /> Mở phòng Host Game
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Quiz Modal */}
      <Modal
        isOpen={isCreateQuizOpen}
        onClose={() => setIsCreateQuizOpen(false)}
        title="Tạo bộ đề trắc nghiệm mới"
        description="Chọn các câu hỏi từ kho câu hỏi để lập đề thi"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuiz} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-[4px]">
              {formError}
            </div>
          )}

          <Input
            label="Tiêu đề đề thi"
            placeholder="Ví dụ: Kiểm tra trắc nghiệm 15 phút Đại số"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Input
            label="Mô tả đề thi"
            placeholder="Ghi chú thêm..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Thời lượng làm bài (phút)"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              min={1}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Khóa theo lớp học (Tùy chọn)
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-100/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-[6px] text-xs focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Để tự do (Mọi học sinh có code) --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Chọn câu hỏi đưa vào đề ({selectedQuestionIds.length}/{questions.length})
              </label>
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedQuestionIds(
                      selectedQuestionIds.length === questions.length
                        ? []
                        : questions.map((q) => q.id)
                    )
                  }
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold"
                >
                  {selectedQuestionIds.length === questions.length
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
              )}
            </div>

            {questions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center bg-slate-100/50 dark:bg-slate-900/40 rounded-[6px]">
                Chưa có câu hỏi nào trong ngân hàng. Hãy tạo câu hỏi trước.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-slate-100/60 dark:bg-slate-900/60 rounded-[6px]">
                {questions.map((q) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestionSelect(q.id)}
                      className={`p-2.5 rounded-[4px] text-xs cursor-pointer flex justify-between items-center select-none ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate max-w-[85%]">{q.content}</span>
                      {isSelected && <Check size={14} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateQuizOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" size="sm">
              Tạo đề thi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Host Game Mode Selection Modal */}
      <Modal
        isOpen={!!hostQuizModalId}
        onClose={() => setHostQuizModalId(null)}
        title="Mở phòng chơi Game Multiplayer"
        description="Lựa chọn chế độ chơi cho phòng thi đấu trực tiếp"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setSelectedMode('CHAOS')}
              className={`p-4 rounded-[6px] cursor-pointer space-y-2 select-none ${
                selectedMode === 'CHAOS'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Zap size={18} className="text-amber-500" />
                Chaos Quiz
              </div>
              <p className="text-xs text-slate-500">
                Hiển thị 25 câu hỏi đồng thời trên màn hình. Nhịp độ cao, bấm sai bị phạt điểm và đổi câu mới.
              </p>
            </div>

            <div
              onClick={() => setSelectedMode('CLASSIC')}
              className={`p-4 rounded-[6px] cursor-pointer space-y-2 select-none ${
                selectedMode === 'CLASSIC'
                  ? 'bg-blue-600/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <Play size={18} className="text-blue-600 dark:text-blue-400" />
                Classic Quiz
              </div>
              <p className="text-xs text-slate-500">
                Đồng bộ từng câu hỏi cho toàn bộ phòng chơi. Tính điểm tốc độ và chuỗi đúng (streak).
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setHostQuizModalId(null)}
            >
              Hủy
            </Button>
            <Button size="sm" onClick={startHosting} className="gap-1.5 font-bold">
              <Play size={16} /> Tạo phòng thi đấu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Quiz Confirmation */}
      <ConfirmDialog
        isOpen={!!quizToDelete}
        onClose={() => setQuizToDelete(null)}
        onConfirm={handleDeleteQuiz}
        title="Xóa bộ đề thi này?"
        message="Hành động này sẽ xóa vĩnh viễn đề thi."
        isDestructive
        confirmText="Xóa bộ đề"
      />
    </AppShell>
  );
}
