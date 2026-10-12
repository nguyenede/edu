import { ToolExecutionResult } from '@/lib/ai/aiToolRegistry';
import { createDocumentFile } from '@/lib/documentsApi';

export async function syncExamActionToDocument(
  token: string | null | undefined,
  action: ToolExecutionResult
): Promise<ToolExecutionResult> {
  if (!token || action.actionType !== 'exam' || action.status !== 'success' || !action.data) {
    return action;
  }

  const questions = Array.isArray(action.data.questions) ? action.data.questions : [];
  const title = action.data.title || 'Đề thi trắc nghiệm';
  const totalQ = questions.length || Number(action.data.questionsCount) || 1;
  const pointPerQuestion = Math.round((10 / totalQ) * 100) / 100;
  const existingExamId = action.data.examId;

  try {
    const savePromise = createDocumentFile(token, {
      id: existingExamId,
      name: `${title}.docx`,
      parentId: action.data.folderId || null,
      fileType: 'docx',
      parsedQuiz: {
        title,
        description: action.data.description || '',
        durationMinutes: Number(action.data.durationMinutes) || 45,
        questions: questions.map((q: any, idx: number) => ({
          id: q.id || `q_${idx + 1}`,
          content: (q.content || q.question || '').replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim(),
          points: q.points || pointPerQuestion,
          options: (q.options || []).map((opt: any) => ({
            content: typeof opt === 'string' ? opt : opt?.content || '',
            isCorrect: Boolean(opt?.isCorrect),
          })),
        })),
      },
    });

    const fallbackTimeout = new Promise<any>((resolve) =>
      setTimeout(() => resolve(null), 1500)
    );

    const savedFile = (await Promise.race([savePromise, fallbackTimeout])) || {
      id: existingExamId,
      parentId: action.data.folderId || null,
    };

    return {
      ...action,
      data: {
        ...action.data,
        examId: savedFile.id || existingExamId,
        folderId: savedFile.parentId ?? action.data.folderId ?? null,
        examUrl: `/documents/${savedFile.id || existingExamId}`,
      },
    };
  } catch (err) {
    console.error('Error syncing exam action to documents API:', err);
    return action;
  }
}

