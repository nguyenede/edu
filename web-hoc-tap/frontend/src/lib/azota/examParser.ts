import { AzotaExam, AzotaQuestion, ParsedOption, ParsedSubQuestion, QuestionType } from './types';
import { AZOTA_PATTERNS, extractCognitiveLevel, isOptionOrderFixed } from './patterns';
import { detectSubjectFromText, detectGradeFromText, detectDurationFromText } from '../examStructureParser';
import { DocxPreprocessor } from './docxPreprocessor';

export class ExamParser {
  /**
   * Phân tích cú pháp văn bản đề thi trọn vẹn (Lexer + Parser)
   */
  public static parse(rawText: string, hints?: { title?: string; fileName?: string }): AzotaExam | null {
    const normalized = DocxPreprocessor.normalizeText(rawText);
    if (!normalized || normalized.trim().length < 15) return null;

    // 1. Tách phần kết thúc đề (nếu có nhãn HẾT, THE END, --HT--)
    let bodyText = normalized;
    let postExamText = '';

    const endExamMatch = bodyText.match(AZOTA_PATTERNS.END_EXAM);
    if (endExamMatch && endExamMatch.index !== undefined) {
      postExamText = bodyText.substring(endExamMatch.index + endExamMatch[0].length);
      bodyText = bodyText.substring(0, endExamMatch.index).trim();
    }

    // 2. Tách bảng đáp án cuối đề
    const { answerKeyMap, textWithoutAnswerKeys } = this.extractAnswerKeys(bodyText + '\n' + postExamText);
    bodyText = textWithoutAnswerKeys;

    // 3. Tách phần lời giải / hướng dẫn giải chi tiết
    const { explanationMap, textWithoutExplanations } = this.extractExplanations(bodyText);
    bodyText = textWithoutExplanations;

    // 4. Nhận diện metadata: Tiêu đề, Môn học, Khối lớp, Thời gian
    const detectedSubject = detectSubjectFromText(bodyText);
    const detectedGrade = detectGradeFromText(bodyText);
    const detectedDuration = detectDurationFromText(bodyText);

    let detectedTitle = hints?.title || hints?.fileName?.replace(/\.[^/.]+$/, '') || 'Đề thi trắc nghiệm';
    const lines = bodyText.split('\n').slice(0, 6).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/(?:đề\s+(?:thi|kiểm\s+tra)|bài\s+tập|khảo\s+sát|kiểm\s+tra\s+chương)/i.test(line) && line.length < 120) {
        detectedTitle = line;
        break;
      }
    }

    // 5. Phân tích các khối câu hỏi theo các pattern Azota
    const rawBlocks = this.tokenizeQuestions(bodyText);
    if (rawBlocks.length === 0) return null;

    const questions: AzotaQuestion[] = [];
    let currentSectionType: QuestionType = 'multiple_choice';

    for (let i = 0; i < rawBlocks.length; i++) {
      const block = rawBlocks[i];

      // Cập nhật section type nếu câu hỏi này bắt đầu một section mới
      if (block.sectionBanner) {
        currentSectionType = block.sectionBanner as QuestionType;
      } else if (AZOTA_PATTERNS.GROUP_TRUE_FALSE.test(block.rawLabel || '')) {
        currentSectionType = 'true_false';
      } else if (AZOTA_PATTERNS.GROUP_SHORT_ANSWER.test(block.rawLabel || '')) {
        currentSectionType = 'short_answer';
      }

      const qIndex = block.qNum > 0 ? block.qNum : i + 1;
      const parsedQ = this.parseQuestionBlock(block.content, qIndex, currentSectionType, block.rawLabel);

      // Gắn đáp án từ bảng đáp án nếu có
      if (answerKeyMap.has(qIndex)) {
        const correctLetter = answerKeyMap.get(qIndex)!.toUpperCase();
        if (parsedQ.type === 'multiple_choice' && parsedQ.options.length > 0) {
          parsedQ.options.forEach((opt) => {
            opt.isCorrect = opt.letter.toUpperCase() === correctLetter;
          });
        } else if (parsedQ.type === 'short_answer') {
          parsedQ.shortAnswer = correctLetter;
        }
      }

      // Gắn lời giải chi tiết nếu có
      if (explanationMap.has(qIndex)) {
        const expData = explanationMap.get(qIndex)!;
        parsedQ.explanation = expData.explanation;
        if (expData.correctLetter && parsedQ.type === 'multiple_choice') {
          parsedQ.options.forEach((opt) => {
            if (opt.letter.toUpperCase() === expData.correctLetter) {
              opt.isCorrect = true;
            }
          });
        }
      }

      questions.push(parsedQ);
    }

    if (questions.length === 0) return null;

    const answerKeysRecord: Record<number, string> = {};
    answerKeyMap.forEach((v, k) => {
      answerKeysRecord[k] = v;
    });

    return {
      title: detectedTitle,
      subject: detectedSubject,
      grade: detectedGrade,
      durationMinutes: detectedDuration || 45,
      questions,
      answerKeys: answerKeysRecord,
      parserUsed: 'azota_compiler_engine'
    };
  }

  /**
   * Lexer: Bóc tách danh sách các khối câu hỏi từ văn bản đề thi
   */
  private static tokenizeQuestions(text: string): { index: number; qNum: number; rawLabel: string; content: string; sectionBanner?: string }[] {
    // Tổng hợp biểu thức bắt đầu câu hỏi chuẩn Azota
    const questionRegex = /(?:^|\n)\s*(?:(?:Câu|câu|CÂU|Bài|bài|BÀI|Question|QUESTION|CH|Ví\s*dụ|Luyện\s*tập)\s*(\d{1,4})[\s:.-]*|\[(\d{1,4})\][\s:.-]*|(\d{1,4})\s*\[(nb|th|vd|vdc)\]|(\d{1,4})\s*[.:]\s+|(\d{1,4})\)\s+)/gi;

    const matches: { index: number; qNum: number; headerLen: number; rawLabel: string }[] = [];
    let m: RegExpExecArray | null;
    let autoCounter = 1;

    while ((m = questionRegex.exec(text)) !== null) {
      const matchIndex = m.index;
      // Bỏ qua nếu xuất hiện trong phần tiêu đề bài giảng ở đầu tài liệu
      if (matchIndex < 250 && /(?:chuyên\s*đề|bài\s*học|chương\s*\d+|lý\s*thuyết\s*trọng\s*tâm)/i.test(m[0])) {
        continue;
      }

      const rawNum = m[1] || m[2] || m[3] || m[5] || m[6];
      const qNum = rawNum ? parseInt(rawNum, 10) : autoCounter++;
      matches.push({
        index: matchIndex,
        qNum,
        headerLen: m[0].length,
        rawLabel: m[0].trim(),
      });
    }

    if (matches.length === 0) return [];

    const blocks: { index: number; qNum: number; rawLabel: string; content: string; sectionBanner?: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      const curr = matches[i];
      const next = i < matches.length - 1 ? matches[i + 1] : null;
      const endIdx = next ? next.index : text.length;
      const chunk = text.substring(curr.index + curr.headerLen, endIdx).trim();

      // Kiểm tra xem giữa câu hỏi trước và câu hỏi hiện tại có banner đề mục không
      const prevEnd = i > 0 ? matches[i - 1].index + matches[i - 1].headerLen : 0;
      const betweenText = text.substring(prevEnd, curr.index);
      let sectionBanner: string | undefined;
      if (AZOTA_PATTERNS.GROUP_TRUE_FALSE.test(betweenText)) {
        sectionBanner = 'true_false';
      } else if (AZOTA_PATTERNS.GROUP_SHORT_ANSWER.test(betweenText)) {
        sectionBanner = 'short_answer';
      } else if (/nhiều\s*phương\s*án|phần\s*(?:i|1)\b/i.test(betweenText)) {
        sectionBanner = 'multiple_choice';
      }

      blocks.push({
        index: curr.index,
        qNum: curr.qNum,
        rawLabel: curr.rawLabel,
        content: chunk,
        sectionBanner
      });
    }

    return blocks;
  }

  /**
   * Parser: Phân tích nội dung chi tiết của một khối câu hỏi
   */
  private static parseQuestionBlock(
    blockText: string,
    qIndex: number,
    inheritedType: QuestionType,
    rawLabel?: string
  ): AzotaQuestion {
    const level = extractCognitiveLevel(rawLabel || '') || extractCognitiveLevel(blockText);

    // 1. Nhận diện các phương án trắc nghiệm A, B, C, D (UPPERCASE A-H)
    const optionSplitsRegex = /(?:^|[\s\n])(\*?[A-H])[\s]*[.)]\s+/g;
    const allMatches = Array.from(blockText.matchAll(optionSplitsRegex));

    // Tìm phương án A đầu tiên (bỏ qua các điểm hình học B, C, D xuất hiện trước A như "vuông tại B.")
    const firstAIdx = allMatches.findIndex((m) => m[1].replace('*', '').toUpperCase() === 'A');

    if (firstAIdx !== -1) {
      const validMatches: RegExpMatchArray[] = [];
      let expectedLetterCode = 65; // 'A'

      for (let i = firstAIdx; i < allMatches.length; i++) {
        const m = allMatches[i];
        const letter = m[1].replace('*', '').toUpperCase();
        if (letter.charCodeAt(0) === expectedLetterCode) {
          validMatches.push(m);
          expectedLetterCode++;
        }
      }

      if (validMatches.length >= 2) {
        const firstOptIndex = validMatches[0].index!;
        const prompt = blockText.substring(0, firstOptIndex).trim();
        const options: ParsedOption[] = [];

        for (let o = 0; o < validMatches.length; o++) {
          const curOpt = validMatches[o];
          const nextOpt = o < validMatches.length - 1 ? validMatches[o + 1] : null;
          const endOpt = nextOpt ? nextOpt.index : blockText.length;
          const optRawContent = blockText.substring(curOpt.index! + curOpt[0].length, endOpt).trim();

          const rawMarker = curOpt[1];
          const isStar = rawMarker.startsWith('*');
          const letter = rawMarker.replace('*', '').toUpperCase();
          const content = this.sanitizeContent(optRawContent);

          options.push({
            letter,
            content,
            isCorrect: isStar,
            isFixedOrder: isOptionOrderFixed(content)
          });
        }

        return {
          index: qIndex,
          content: this.sanitizeContent(prompt),
          type: 'multiple_choice',
          level,
          rawLabel,
          options,
        };
      }
    }

    // 2. Kiểm tra xem có phải câu hỏi Đúng / Sai (các ý con a, b, c, d thường)
    const subItemRegex = /(?:^|[\s\n])([a-d])[\.\)]\s+/g;
    const subMatches = Array.from(blockText.matchAll(subItemRegex));

    if (inheritedType === 'true_false' || (subMatches.length >= 3 && subMatches.length <= 4)) {
      const subQuestions: ParsedSubQuestion[] = [];
      let questionPrompt = blockText;

      if (subMatches.length > 0) {
        questionPrompt = blockText.substring(0, subMatches[0].index).trim();
        for (let s = 0; s < subMatches.length; s++) {
          const curSub = subMatches[s];
          const nextSub = s < subMatches.length - 1 ? subMatches[s + 1] : null;
          const endSub = nextSub ? nextSub.index : blockText.length;
          const subContent = blockText.substring(curSub.index! + curSub[0].length, endSub).trim();
          const letter = curSub[1].toLowerCase();

          // Kiểm tra xem có gắn nhãn Đúng hay Sai ở cuối ý không
          const isCorrect = /(?:\[\s*Đúng\s*\]|\(\s*Đúng\s*\)|\bĐúng\b|\bĐ\b)/i.test(subContent) &&
            !/(?:\[\s*Sai\s*\]|\(\s*Sai\s*\)|\bSai\b|\bS\b)/i.test(subContent);

          subQuestions.push({
            letter,
            content: this.sanitizeContent(subContent.replace(/(?:\[\s*(?:Đúng|Sai)\s*\]|\(\s*(?:Đúng|Sai)\s*\))/gi, '').trim()),
            isCorrect,
          });
        }

        return {
          index: qIndex,
          content: this.sanitizeContent(questionPrompt),
          type: 'true_false',
          level,
          rawLabel,
          options: [],
          subQuestions,
        };
      }
    }

    // 3. Nếu là dạng trả lời ngắn (Short Answer)
    const answerMatch = blockText.match(/(?:(?:Đáp\s*(?:án|số)|Kết\s*quả|Trả\s*lời|ĐS)[\s:.-]*([^\n]+))/i);
    if (inheritedType === 'short_answer' || answerMatch) {
      const shortAnswer = answerMatch ? answerMatch[1].trim() : undefined;
      const cleanPrompt = answerMatch ? blockText.replace(answerMatch[0], '').trim() : blockText;

      return {
        index: qIndex,
        content: this.sanitizeContent(cleanPrompt),
        type: 'short_answer',
        level,
        rawLabel,
        options: [],
        shortAnswer
      };
    }

    // 4. Mặc định là câu Tự luận (Essay)
    return {
      index: qIndex,
      content: this.sanitizeContent(blockText),
      type: 'essay',
      level,
      rawLabel,
      options: [],
    };
  }

  /**
   * Tách bảng đáp án ở cuối văn bản (DAPAN_HEADER)
   */
  private static extractAnswerKeys(fullText: string): { answerKeyMap: Map<number, string>; textWithoutAnswerKeys: string } {
    const answerKeyMap = new Map<number, string>();
    let textWithoutAnswerKeys = fullText;

    for (const pattern of AZOTA_PATTERNS.DAPAN_HEADER) {
      const match = fullText.match(pattern);
      if (match && match.index !== undefined) {
        const headerIndex = match.index;
        const tailBlock = fullText.substring(headerIndex);

        // Bắt các cặp "1.A", "2. B", "3 - C", "4: D"
        const pairRegex = /(?:^|[\s,;|])(\d{1,4})[\s:.-]*([A-Ha-h])\b/g;
        let pm: RegExpExecArray | null;
        while ((pm = pairRegex.exec(tailBlock)) !== null) {
          const qNum = parseInt(pm[1], 10);
          const letter = pm[2].toUpperCase();
          if (qNum > 0 && letter) {
            answerKeyMap.set(qNum, letter);
          }
        }

        // Bắt bảng đáp án 2 hàng (Hàng 1 số, Hàng 2 chữ)
        if (answerKeyMap.size === 0) {
          const rows = tailBlock.split('\n').map(l => l.trim()).filter(Boolean);
          for (let r = 0; r < rows.length - 1; r++) {
            const numTokens = rows[r].match(/\b\d+\b/g);
            const letterTokens = rows[r + 1].match(/\b[A-H]\b/gi);
            if (numTokens && letterTokens && numTokens.length >= 2 && numTokens.length === letterTokens.length) {
              for (let k = 0; k < numTokens.length; k++) {
                const qNum = parseInt(numTokens[k], 10);
                const letter = letterTokens[k].toUpperCase();
                answerKeyMap.set(qNum, letter);
              }
            }
          }
        }

        if (answerKeyMap.size > 0) {
          textWithoutAnswerKeys = fullText.substring(0, headerIndex).trim();
          break;
        }
      }
    }

    return { answerKeyMap, textWithoutAnswerKeys };
  }

  /**
   * Tách phần Hướng dẫn giải chi tiết (EXPLANATION)
   */
  private static extractExplanations(fullText: string): {
    explanationMap: Map<number, { explanation: string; correctLetter?: string }>;
    textWithoutExplanations: string;
  } {
    const explanationMap = new Map<number, { explanation: string; correctLetter?: string }>();
    let textWithoutExplanations = fullText;

    for (const pattern of AZOTA_PATTERNS.EXPLANATION) {
      const match = fullText.match(pattern);
      if (match && match.index !== undefined && match.index > 200) {
        const expHeaderIndex = match.index;
        const expTail = fullText.substring(expHeaderIndex);

        const expSplitsRegex = /(?:^|\n)\s*(?:(?:Câu|câu|Bài|Question)\s*(\d+)[\s:.-]*|(\d+)[\.\)]\s+)/gi;
        const expMatches: { index: number; qNum: number; headerLen: number }[] = [];
        let em: RegExpExecArray | null;
        while ((em = expSplitsRegex.exec(expTail)) !== null) {
          const qNum = parseInt(em[1] || em[2], 10);
          if (qNum > 0) {
            expMatches.push({ index: em.index, qNum, headerLen: em[0].length });
          }
        }

        for (let j = 0; j < expMatches.length; j++) {
          const currExp = expMatches[j];
          const nextExp = j < expMatches.length - 1 ? expMatches[j + 1] : null;
          const endExpIdx = nextExp ? nextExp.index : expTail.length;
          const singleExp = expTail.substring(currExp.index + currExp.headerLen, endExpIdx).trim();

          let cLetter: string | undefined;
          const letterMatch = singleExp.match(/(?:(?:Chọn(?:\s*đáp\s*án)?|Đáp\s*án(?:\s*đúng)?(?:\s*là)?|Key)[\s:.-]*([A-H])\b)/i);
          if (letterMatch) {
            cLetter = letterMatch[1].toUpperCase();
          }

          explanationMap.set(currExp.qNum, {
            explanation: this.sanitizeContent(singleExp),
            correctLetter: cLetter
          });
        }

        if (explanationMap.size > 0) {
          textWithoutExplanations = fullText.substring(0, expHeaderIndex).trim();
          break;
        }
      }
    }

    return { explanationMap, textWithoutExplanations };
  }

  /**
   * Làm sạch nội dung câu hỏi/phương án và chuẩn hóa placeholder toán học [!m:...!] -> $...$
   */
  private static sanitizeContent(content: string): string {
    if (!content) return '';
    return content
      .replace(/\[!m:([^\]]+)\]/g, '$$$1$$') // Chuyển placeholder math thành $...$
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
