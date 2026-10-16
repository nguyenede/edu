import { AzotaExam, AzotaQuestion, ParsedOption, ShuffledExamVariant } from './types';
import { isOptionOrderFixed } from './patterns';

export class RuleEngine {
  /**
   * Kiểm tra và kiểm định tính hợp lệ của đề thi
   */
  public static validate(exam: AzotaExam): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!exam.questions || exam.questions.length === 0) {
      errors.push('Đề thi không có câu hỏi nào.');
      return { isValid: false, errors, warnings };
    }

    exam.questions.forEach((q, idx) => {
      const qNum = q.index || idx + 1;

      // 1. Kiểm tra nội dung câu hỏi
      if (!q.content || q.content.trim().length < 5) {
        errors.push(`Câu ${qNum}: Nội dung câu hỏi quá ngắn hoặc bị rỗng.`);
      }

      // 2. Kiểm tra câu trắc nghiệm nhiều lựa chọn
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length < 2) {
          errors.push(`Câu ${qNum}: Câu trắc nghiệm phải có ít nhất 2 phương án lựa chọn.`);
        } else {
          const hasCorrect = q.options.some((o) => o.isCorrect);
          if (!hasCorrect) {
            warnings.push(`Câu ${qNum}: Chưa đánh dấu đáp án đúng.`);
          }

          // Kiểm tra trùng lặp nội dung phương án
          const seenContents = new Set<string>();
          for (const opt of q.options) {
            const clean = opt.content.trim().toLowerCase();
            if (clean.length === 0) {
              errors.push(`Câu ${qNum}: Có phương án rỗng nội dung.`);
            }
            if (seenContents.has(clean)) {
              warnings.push(`Câu ${qNum}: Phương án "${opt.letter}" có nội dung trùng lặp.`);
            }
            seenContents.add(clean);
          }
        }
      }

      // 3. Kiểm tra câu Đúng / Sai (GDPT 2018)
      if (q.type === 'true_false') {
        if (!q.subQuestions || q.subQuestions.length === 0) {
          errors.push(`Câu ${qNum}: Câu hỏi Đúng/Sai thiếu các ý con (a, b, c, d).`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ExamShuffler {
  /**
   * Trộn đề thi thành nhiều mã đề ngẫu nhiên (101, 102, 103, 104...)
   * Giữ cố định nhóm câu hỏi (Reading comprehension group), ghim cố định các đáp án "Tất cả các ý trên"
   */
  public static shuffleExam(
    originalExam: AzotaExam,
    options?: {
      variantCount?: number;
      variantCodes?: string[];
      shuffleQuestions?: boolean;
      shuffleOptions?: boolean;
    }
  ): {
    variants: ShuffledExamVariant[];
    masterAnswerKeyMatrix: Record<string, Record<number, string>>;
  } {
    const count = options?.variantCount || 4;
    const codes =
      options?.variantCodes && options.variantCodes.length >= count
        ? options.variantCodes.slice(0, count)
        : Array.from({ length: count }, (_, i) => String(101 + i));

    const doShuffleQuestions = options?.shuffleQuestions !== false;
    const doShuffleOptions = options?.shuffleOptions !== false;

    const variants: ShuffledExamVariant[] = [];
    const masterAnswerKeyMatrix: Record<string, Record<number, string>> = {};

    for (const code of codes) {
      // 1. Phân loại câu hỏi theo Section để đảm bảo giữ nguyên cấu trúc chuẩn GDPT 2018
      // (Phần 1: Trắc nghiệm 4 lựa chọn, Phần 2: Đúng/Sai, Phần 3: Trả lời ngắn, Phần 4: Tự luận)
      let shuffledQList: AzotaQuestion[] = [];

      if (doShuffleQuestions) {
        const mcqs = originalExam.questions.filter((q) => q.type === 'multiple_choice');
        const trueFalses = originalExam.questions.filter((q) => q.type === 'true_false');
        const shortAnswers = originalExam.questions.filter((q) => q.type === 'short_answer');
        const essays = originalExam.questions.filter((q) => q.type === 'essay');

        // Trộn bảo toàn nhóm câu hỏi (Question Grouping)
        const shuffledMCQs = this.shuffleWithGroupPreservation(mcqs);
        const shuffledTF = this.shuffleWithGroupPreservation(trueFalses);
        const shuffledSA = this.shuffleWithGroupPreservation(shortAnswers);
        const shuffledEssay = this.shuffleWithGroupPreservation(essays);

        shuffledQList = [...shuffledMCQs, ...shuffledTF, ...shuffledSA, ...shuffledEssay];
      } else {
        shuffledQList = originalExam.questions.map((q) => ({ ...q }));
      }

      // 2. Trộn các phương án A, B, C, D (Smart Pinning rule)
      const answerKeyMap: Record<number, string> = {};

      const processedQuestions: AzotaQuestion[] = shuffledQList.map((q, newIndex) => {
        const qNum = newIndex + 1;
        let finalOptions = q.options ? q.options.map((o) => ({ ...o })) : [];

        if (doShuffleOptions && q.type === 'multiple_choice' && finalOptions.length >= 2) {
          finalOptions = this.shuffleOptionsWithPinning(finalOptions);
        }

        // Đánh lại nhãn chữ cái A, B, C, D... và tìm đáp án đúng
        const standardLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        let correctLetter = '';

        finalOptions = finalOptions.map((opt, optIdx) => {
          const letter = standardLetters[optIdx] || opt.letter;
          if (opt.isCorrect) {
            correctLetter = letter;
          }
          return {
            ...opt,
            letter,
          };
        });

        if (correctLetter) {
          answerKeyMap[qNum] = correctLetter;
        } else if (q.type === 'short_answer' && q.shortAnswer) {
          answerKeyMap[qNum] = q.shortAnswer;
        }

        return {
          ...q,
          index: qNum,
          options: finalOptions,
        };
      });

      const variant: ShuffledExamVariant = {
        code,
        title: `${originalExam.title} - Mã đề ${code}`,
        questions: processedQuestions,
        answerKeyMap,
      };

      variants.push(variant);
      masterAnswerKeyMatrix[code] = answerKeyMap;
    }

    return {
      variants,
      masterAnswerKeyMatrix,
    };
  }

  /**
   * Trộn câu hỏi nhưng bảo toàn các nhóm câu hỏi gắn liền với đoạn văn bản hoặc đề bài chung
   */
  private static shuffleWithGroupPreservation(questions: AzotaQuestion[]): AzotaQuestion[] {
    if (questions.length <= 1) return [...questions];

    // Nhóm các câu hỏi theo groupId hoặc groupHeader
    const groups: AzotaQuestion[][] = [];
    let currentGroup: AzotaQuestion[] = [];
    let currentGroupId: string | undefined = undefined;

    for (const q of questions) {
      const gId = q.groupId || q.groupHeader;
      if (!gId) {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
          currentGroupId = undefined;
        }
        groups.push([q]);
      } else {
        if (currentGroupId === gId) {
          currentGroup.push(q);
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [q];
          currentGroupId = gId;
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    // Trộn thứ tự giữa các nhóm độc lập
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }

    // Ghép lại thành mảng phẳng
    return groups.flat();
  }

  /**
   * Trộn các phương án A, B, C, D nhưng ghim cố định các phương án đặc thù
   * (Ví dụ: "Tất cả các đáp án trên", "Cả A và B đều đúng" luôn được giữ ở cuối)
   */
  private static shuffleOptionsWithPinning(options: ParsedOption[]): ParsedOption[] {
    const unpinned: ParsedOption[] = [];
    const pinned: { option: ParsedOption; index: number }[] = [];

    options.forEach((opt, idx) => {
      if (opt.isFixedOrder || isOptionOrderFixed(opt.content)) {
        pinned.push({ option: opt, index: idx });
      } else {
        unpinned.push(opt);
      }
    });

    // Trộn ngẫu nhiên các phương án tự do (unpinned)
    for (let i = unpinned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unpinned[i], unpinned[j]] = [unpinned[j], unpinned[i]];
    }

    // Ghép lại theo đúng vị trí của pinned
    const result: ParsedOption[] = [];
    let unpinnedIdx = 0;

    for (let i = 0; i < options.length; i++) {
      const pinMatch = pinned.find((p) => p.index === i);
      if (pinMatch) {
        result.push(pinMatch.option);
      } else if (unpinnedIdx < unpinned.length) {
        result.push(unpinned[unpinnedIdx++]);
      }
    }

    return result;
  }
}
