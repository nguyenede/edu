export interface NormalizedGameOption {
  content: string;
  isCorrect: boolean;
}

export interface NormalizedGameQuestion {
  id: string;
  content: string;
  options: NormalizedGameOption[];
  explanation?: string;
  selected?: boolean;
}

/**
 * Normalizes questions from raw documents / IndexedDB / AI output
 * Ensures isCorrect is always properly determined, stripping duplicated A./B. prefixes
 */
export function normalizeGameQuestion(q: any, idx: number): NormalizedGameQuestion {
  let content = String(q?.content || q?.question || q?.text || `Câu hỏi số ${idx + 1}`).trim();
  // Remove "Câu 1: " prefix if present in content
  content = content.replace(/^Câu\s+\d+[\s.:-]+/i, '').trim();

  const rawExplanation = String(q?.explanation || q?.explain || '').trim();

  // Find correct key from answer or explanation
  const answerKey = String(
    q?.answer || q?.correct_answer || q?.correctAnswer || q?.correct || ''
  ).trim().toUpperCase();

  let keyFromExplanation = '';
  const expMatch = rawExplanation.match(
    /(?:Chọn\s+đáp\s+án|Đáp\s+án\s+đúng\s+là|Chọn)\s*([A-F])\b/i
  );
  if (expMatch) {
    keyFromExplanation = expMatch[1].toUpperCase();
  }

  const rawOptions = Array.isArray(q?.options) ? q.options : [];
  const hasPredefinedCorrect = rawOptions.some(
    (opt: any) => typeof opt === 'object' && opt !== null && Boolean(opt.isCorrect || opt.correct)
  );

  let options: NormalizedGameOption[] = rawOptions
    .map((opt: any, oIdx: number) => {
      let optContent = '';
      let isCorrect = false;

      if (typeof opt === 'string') {
        optContent = opt.trim();
      } else if (typeof opt === 'object' && opt !== null) {
        optContent = String(opt.content || opt.text || opt.title || '').trim();
        isCorrect = Boolean(opt.isCorrect || opt.correct);
      }

      // Strip leading A., B., C., D. or A), B)
      optContent = optContent.replace(/^[A-F][\s.:)-]+/i, '').trim();

      const letter = String.fromCharCode(65 + oIdx);
      if (!isCorrect && !hasPredefinedCorrect) {
        if (
          answerKey === letter ||
          answerKey === String(oIdx) ||
          (answerKey && optContent.toLowerCase() === answerKey.toLowerCase())
        ) {
          isCorrect = true;
        } else if (keyFromExplanation === letter) {
          isCorrect = true;
        }
      }

      return {
        content: optContent,
        isCorrect,
      };
    })
    .filter((o: NormalizedGameOption) => o.content && o.content.length > 0);

  // Guarantee EXACTLY 1 correct answer (tránh lỗi 2 đáp án cùng đúng)
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount > 1) {
    // Nếu có nhiều hơn 1 đáp án đúng, ưu tiên đáp án theo key rõ ràng hoặc chỉ giữ lại đáp án đúng đầu tiên
    const targetLetter =
      keyFromExplanation ||
      (['A', 'B', 'C', 'D', 'E', 'F'].includes(answerKey) ? answerKey : '');
    if (targetLetter) {
      const targetIdx = targetLetter.charCodeAt(0) - 65;
      if (targetIdx >= 0 && targetIdx < options.length) {
        options.forEach((o, i) => {
          o.isCorrect = i === targetIdx;
        });
      }
    } else {
      let foundFirst = false;
      options.forEach((o) => {
        if (o.isCorrect) {
          if (!foundFirst) {
            foundFirst = true;
          } else {
            o.isCorrect = false;
          }
        }
      });
    }
  } else if (correctCount === 0 && options.length > 0) {
    const targetLetter =
      keyFromExplanation ||
      (['A', 'B', 'C', 'D', 'E', 'F'].includes(answerKey) ? answerKey : '');
    if (targetLetter) {
      const targetIdx = targetLetter.charCodeAt(0) - 65;
      if (targetIdx >= 0 && targetIdx < options.length) {
        options[targetIdx].isCorrect = true;
      } else {
        options[0].isCorrect = true;
      }
    } else {
      options[0].isCorrect = true;
    }
  }

  return {
    id: q?.id || `q_${idx}_${Date.now()}`,
    content,
    options,
    explanation: rawExplanation,
    selected: q?.selected !== false,
  };
}

/**
 * Không sử dụng câu hỏi giả / placeholder.
 * Chỉ cho phép người dùng chơi game khi có câu hỏi thực tế từ kho đề hoặc đề thi đã tạo.
 */
export const DEFAULT_CLASSROOM_TRIAL_QUESTIONS: NormalizedGameQuestion[] = [];

