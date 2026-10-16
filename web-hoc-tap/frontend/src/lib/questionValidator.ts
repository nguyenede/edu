/**
 * questionValidator.ts
 * Bộ lọc chuẩn hóa & kiểm tra tính hợp lệ của câu hỏi thi tạo bởi SI / AI
 * Tuân thủ 100% QUY CHUẨN ĐẦU RA BẮT BUỘC:
 * 1. Chuẩn hóa công thức toán học & phân số LaTeX (tử số ở trên, mẫu số ở dưới, không đảo lộn)
 * 2. Chuẩn hóa tiếng Việt sang Unicode NFC (khử combining diacritics / modifier letters)
 * 3. Đảm bảo tính duy nhất 4 phương án A, B, C, D (không trùng lặp)
 * 4. Luôn có đúng 1 đáp án đúng (is_correct: true) khớp với lời giải
 * 5. Kiểm soát đa phương tiện: Nếu thiếu hình vẽ/đồ thị/bảng biến thiên -> Tự động làm sạch thành câu hỏi thuần text hoặc loại bỏ
 */

import { cleanLeakedOleGarbage } from './mtefParser';

/**
 * 1. Chuẩn hóa tiếng Việt sang chuẩn Unicode NFC
 * Khử sạch các ký tự combining tách rời (NFD) và các ký tự modifier tone marks (ˋ, ˊ, ^, ~...)
 */
export function cleanVietnameseEncoding(str: string): string {
  if (!str) return '';
  let res = cleanLeakedOleGarbage(str);

  // Xử lý các trường hợp nguyên âm ghép với dấu mũ và dấu thanh bị tách (ví dụ Haˋm, so^ˊ)
  res = res.replace(/([aeouiyAEOUIY])\^([ˋˊ˜ˇ˙])/g, (_, v, t) => {
    const tMap: Record<string, string> = { 'ˋ': '\u0300', 'ˊ': '\u0301', '˜': '\u0303', 'ˇ': '\u0309', '˙': '\u0323' };
    return v + '\u0302' + (tMap[t] || '');
  });
  res = res.replace(/([aeouiyAEOUIY])\^/g, '$1\u0302');
  res = res.replace(/([aeouiyAEOUIY\u0302\u031b\u0306])ˋ/g, '$1\u0300');
  res = res.replace(/([aeouiyAEOUIY\u0302\u031b\u0306])ˊ/g, '$1\u0301');
  res = res.replace(/ˋ/g, '\u0300').replace(/ˊ/g, '\u0301');

  // Chuẩn hóa sang Unicode NFC (Normalization Form C - Dựng sẵn)
  res = res.normalize('NFC');

  return res;
}

/**
 * Trích xuất khối ngoặc nhọn cân bằng {...}
 */
function extractBalancedBraces(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null;
  let depth = 0;
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        return {
          content: str.substring(startIndex + 1, i),
          endIndex: i,
        };
      }
    }
  }
  return null;
}

/**
 * Phân tích và bảo toàn tuyệt đối phân số LaTeX: \frac{tử_số}{mẫu_số}
 * Tử số luôn ở trên, mẫu số luôn ở dưới.
 */
export function sanitizeLatexFractions(str: string): string {
  if (!str) return '';
  let res = '';
  let i = 0;
  while (i < str.length) {
    if (str.startsWith('\\frac', i) || str.startsWith('\\dfrac', i)) {
      const isDfrac = str.startsWith('\\dfrac', i);
      const prefixLen = isDfrac ? 6 : 5;
      let pos = i + prefixLen;
      while (pos < str.length && /\s/.test(str[pos])) pos++;

      const numMatch = extractBalancedBraces(str, pos);
      if (numMatch) {
        let denPos = numMatch.endIndex + 1;
        while (denPos < str.length && /\s/.test(str[denPos])) denPos++;
        const denMatch = extractBalancedBraces(str, denPos);
        if (denMatch) {
          // BẢO TOÀN TUYỆT ĐỐI: numMatch.content là TỬ SỐ, denMatch.content là MẪU SỐ
          const num = sanitizeLatexFractions(numMatch.content.trim());
          const den = sanitizeLatexFractions(denMatch.content.trim());
          res += isDfrac ? `\\dfrac{${num}}{${den}}` : `\\frac{${num}}{${den}}`;
          i = denMatch.endIndex + 1;
          continue;
        }
      }
    }
    res += str[i];
    i++;
  }
  return res;
}

/**
 * 2. Chuẩn hóa công thức toán học & phân số
 * - Chuyển đổi các phân thức (A)/(B) hoặc N/M sang \frac{A}{B} (Tử số A ở trên, mẫu số B ở dưới)
 * - Bao bọc công thức toán LaTeX vào $...$ riêng rẽ, không bao bọc cả câu tiếng Việt làm KaTeX vỡ font
 */
export function normalizeMathFormulas(text: string): string {
  if (!text) return '';
  let str = cleanLeakedOleGarbage(text);
  str = cleanVietnameseEncoding(str);

  // 1. Chuyển đổi phân thức dạng (A)/(B) sang \frac{A}{B} (Bảo toàn: A là tử số, B là mẫu số)
  str = str.replace(
    /(?<![a-zA-Z0-9_\\])\(([a-zA-Z0-9_+\-*^ \t\\]+)\)\s*\/\s*\(([a-zA-Z0-9_+\-*^ \t\\]+)\)/g,
    (_, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`
  );

  // 2. Chuyển đổi phân số dạng số nguyên 1/3, 2/5 (không phải ngày tháng hoặc đường dẫn)
  str = str.replace(
    /(?<![a-zA-Z0-9_\/.\\])(\d+)\s*\/\s*(\d+)(?![a-zA-Z0-9_\/.\\])/g,
    (_, num, den) => `\\frac{${num.trim()}}{${den.trim()}}`
  );

  // 3. Chuẩn hóa cú pháp các phân số \frac và \dfrac
  str = sanitizeLatexFractions(str);

  // 4. Nếu toàn bộ chuỗi đã là công thức toán hoàn chỉnh trong $...$ hoặc $$...$$
  if (/^\s*\$\$[\s\S]*?\$\$\s*$/.test(str) || /^\s*\$[^\$]+?\$\s*$/.test(str)) {
    return str.trim();
  }

  // 5. Nếu chuỗi thuần túy là công thức toán học (không chứa tiếng Việt có dấu)
  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/i.test(
    str
  );

  if (
    !hasVietnamese &&
    !str.includes('$') &&
    (/\\(?:frac|dfrac|sqrt|lim|int|sum|alpha|beta|pi|times|ge|le|ne|in|mathbb)\b/.test(str) ||
      /^[A-Za-z0-9_+\-*\/=() \t\^.,;:]+$/.test(str.trim()))
  ) {
    return `$${str.trim()}$`;
  }

  // 6. Tách các phần văn bản để bao bọc các công thức toán LaTeX trần trụi vào $...$
  // Tránh bọc cả câu văn tiếng Việt vào trong $...$
  const parts = str.split(/(\$[^\$]+\$|\$\$[^\$]+\$\$)/g);
  const processedParts = parts.map((part) => {
    if (part.startsWith('$')) return part; // Đã nằm trong math mode, giữ nguyên

    let p = part;
    // Bọc các biểu thức toán có phân số, căn, hàm số: ví dụ y = \frac{2x-1}{x+1}, \sqrt{x}, v.v.
    p = p.replace(
      /(?:(?:[a-zA-Z]\s*=\s*)?\\(?:frac|dfrac)\s*\{[^{}]+\}\s*\{[^{}]+\}|[a-zA-Z]\s*=\s*[-0-9a-zA-Z+\/*^\\{}]+|\\sqrt(?:\[[^\]]+\])?\{[^{}]+\})/g,
      (m) => `$${m}$`
    );
    return p;
  });

  return processedParts.join('').trim();
}

/**
 * 3. Kiểm soát đa phương tiện (Hình vẽ, Đồ thị, Bảng biến thiên)
 * - Nếu đề cập hình vẽ/bảng biến thiên nhưng thiếu hình/table: Tự động làm sạch thành câu hỏi thuần text nếu có công thức,
 *   hoặc LOẠI BỎ câu hỏi nếu khuyết tài nguyên không thể giải được.
 */
export function checkAndSanitizeMultimedia(question: {
  content: string;
  imageUrl?: string;
  image?: string;
  svg?: string;
}): { isValid: boolean; sanitizedContent: string; reason?: string } {
  let content = question.content || '';
  const hasImage = Boolean(
    question.imageUrl ||
      question.image ||
      question.svg ||
      /<svg\b[\s\S]*?<\/svg>/i.test(content) ||
      /!\[.*?\]\(.*?\)/.test(content)
  );
  const hasMarkdownTable = /\|[^\n]+\|\r?\n\|[-:\s|]+\|\r?\n\|[^\n]+\|/.test(content);

  // Kiểm tra câu hỏi có đề cập đến hình vẽ, đồ thị, bảng biến thiên
  const mentionsVisual =
    /(?:như|trong|theo|ở)\s+(?:hình\s*(?:vẽ|bên|sau|dưới)?|đồ\s*thị(?:\s*hàm\s*số)?\s*(?:bên|sau|dưới)?|bảng\s*biến\s*thiên(?:\s*sau|\s*dưới)?)|đường cong trong hình|hình vẽ bên là/i.test(
      content
    );
  const mentionsBBT = /bảng\s*biến\s*thiên/i.test(content);

  // Nếu không đề cập đến tài nguyên trực quan -> Hợp lệ
  if (!mentionsVisual && !mentionsBBT) {
    return { isValid: true, sanitizedContent: content };
  }

  // Nếu có link ảnh, SVG hoặc bảng Markdown table -> Hợp lệ
  if (hasImage || hasMarkdownTable) {
    return { isValid: true, sanitizedContent: content };
  }

  // Trường hợp đề cập bảng biến thiên mà KHÔNG có bảng Markdown table hay ảnh -> LOẠI BỎ
  if (mentionsBBT && !hasMarkdownTable && !hasImage) {
    return {
      isValid: false,
      sanitizedContent: content,
      reason: 'Khuyết dữ liệu bảng biến thiên (không có hình ảnh hoặc Markdown table kèm theo)',
    };
  }

  // THIẾU HÌNH VẼ: Thử xem có thể chuyển thành câu hỏi thuần text được không
  // Kiểm tra xem hàm số có công thức toán học cụ thể (ví dụ: x^3, x^2, ax+b, phân thức \frac{...}{...}) hay chỉ là f(x) trừu tượng
  const isAbstractFunction =
    /y\s*=\s*f\(x\)|hàm số\s+f\(x\)/i.test(content) &&
    !/[0-9x]\s*[\^+\-*\/]\s*[0-9x]|\\frac|\\dfrac/i.test(content);
  const hasRedundantVisualPhrase =
    /(?:có\s+)?đồ\s*thị\s*như\s*hình(?:\s*vẽ)?(?:\s*bên)?|(?:như\s+)?hình\s*vẽ\s*(?:bên|dưới)/i.test(content);

  if (!isAbstractFunction && hasRedundantVisualPhrase && !/đường cong trong hình|hình vẽ bên là đồ thị/i.test(content)) {
    // Gọt bỏ cụm từ tham chiếu ảo để trở thành câu hỏi thuần text hoàn chỉnh
    let clean = content
      .replace(/,\s*(?:có\s+)?đồ\s*thị\s*như\s*hình(?:\s*vẽ)?(?:\s*bên)?/gi, '')
      .replace(/(?:có\s+)?đồ\s*thị\s*như\s*hình(?:\s*vẽ)?(?:\s*bên)?[,.]?\s*/gi, '')
      .replace(/\(như\s*hình\s*(?:vẽ|bên)\)/gi, '')
      .trim();
    return { isValid: true, sanitizedContent: clean };
  }

  // Phụ thuộc hoàn toàn vào hình vẽ bị khuyết -> LOẠI BỎ
  return {
    isValid: false,
    sanitizedContent: content,
    reason: 'Khuyết dữ liệu hình vẽ / đồ thị không có URL ảnh hoặc SVG đính kèm',
  };
}

/**
 * Chuẩn hóa chuỗi so sánh phương án để kiểm tra tính duy nhất
 */
function canonicalOptionContent(str: string): string {
  if (!str) return '';
  return str
    .replace(/^[A-D][\s.:)-]+/i, '') // Xóa tiền tố A., B., C., D.
    .replace(/\$/g, '') // Bỏ dấu $
    .replace(/\s+/g, '') // Bỏ khoảng trắng
    .toLowerCase()
    .normalize('NFC');
}

export interface ValidatedOption {
  content: string;
  isCorrect: boolean;
}

export interface ValidatedQuestion {
  id?: string;
  rawLabel?: string;
  content: string;
  options: ValidatedOption[];
  explanation?: string;
  points?: number;
  type?: 'multiple_choice' | 'essay' | 'fill_blank' | 'true_false';
  imageUrl?: string;
  answer?: string;
}

/**
 * 4. Kiểm tra và chuẩn hóa một câu hỏi trắc nghiệm
 * - Bắt buộc 4 phương án A, B, C, D có giá trị phân biệt tuyệt đối (Set.size == 4)
 * - Luôn tồn tại đúng 1 đáp án được đánh dấu isCorrect: true, khớp với lời giải
 * - Đảm bảo phân số và công thức toán học không bị đảo lộn tử/mẫu
 * - Kiểm soát đa phương tiện (loại bỏ câu khuyết ảnh/bảng)
 */
export function validateAndSanitizeQuestion(q: any, index: number = 0): {
  isValid: boolean;
  question?: ValidatedQuestion;
  error?: string;
} {
  if (!q || typeof q !== 'object') {
    return { isValid: false, error: 'Dữ liệu câu hỏi không hợp lệ (không phải object)' };
  }

  let rawContent = String(q.content || q.question || '').trim();
  // Loại bỏ nhãn Câu X:, Bài Y: ở đầu nếu có
  rawContent = rawContent
    .replace(
      /^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i,
      ''
    )
    .replace(/^[:.-]+\s*/, '')
    .trim();

  if (rawContent.length < 5) {
    return { isValid: false, error: 'Nội dung câu hỏi quá ngắn hoặc rỗng' };
  }

  // 1. Kiểm soát đa phương tiện
  const mediaCheck = checkAndSanitizeMultimedia({
    content: rawContent,
    imageUrl: q.imageUrl || q.image,
    svg: q.svg,
  });

  if (!mediaCheck.isValid) {
    return { isValid: false, error: mediaCheck.reason || 'Khuyết dữ liệu đa phương tiện' };
  }

  const sanitizedContent = normalizeMathFormulas(cleanVietnameseEncoding(mediaCheck.sanitizedContent));

  // 2. Kiểm tra phương án trắc nghiệm
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  if (rawOptions.length < 2) {
    // Nếu là câu hỏi tự luận không có phương án trắc nghiệm
    const cleanExp = normalizeMathFormulas(cleanVietnameseEncoding(q.explanation || q.explain || 'Lời giải chi tiết.'));
    return {
      isValid: true,
      question: {
        id: q.id || `q_${index + 1}`,
        rawLabel: q.rawLabel || `Câu ${index + 1}`,
        content: sanitizedContent,
        options: [],
        explanation: cleanExp,
        points: q.points || 1,
        type: 'essay',
        answer: q.answer ? cleanVietnameseEncoding(String(q.answer)) : undefined,
      },
    };
  }

  // Hỗ trợ câu hỏi Trắc nghiệm nhiều lựa chọn (2 đến 5 phương án) hoặc Trắc nghiệm Đúng/Sai
  if (rawOptions.length < 2 || rawOptions.length > 5) {
    return {
      isValid: false,
      error: `Số lượng phương án trắc nghiệm phải từ 2 đến 5 phương án (hiện có ${rawOptions.length})`,
    };
  }

  const answerKey = String(q.answer || q.correct_answer || q.correctAnswer || '').trim().toUpperCase();
  const rawExplanation = String(q.explanation || q.explain || '').trim();

  // Tìm đáp án đúng theo lời giải nếu có ("Chọn đáp án C", "Đáp án đúng là B")
  let keyFromExplanation = '';
  const expMatch = rawExplanation.match(/(?:Chọn\s+đáp\s+án|Đáp\s+án\s+đúng\s+là|Chọn)\s*([A-D])\b/i);
  if (expMatch) {
    keyFromExplanation = expMatch[1].toUpperCase();
  }

  const validatedOptions: ValidatedOption[] = [];
  const canonicalSet = new Set<string>();
  const isTrueFalse = q.type === 'true_false' || (rawOptions.length === 2 && rawOptions.some((o: any) => {
    const txt = String(typeof o === 'string' ? o : o?.content || '').toLowerCase();
    return txt.includes('đúng') || txt.includes('sai');
  }));

  for (let idx = 0; idx < rawOptions.length; idx++) {
    const o = rawOptions[idx];
    let optContent = '';
    let isCorrect = false;

    if (typeof o === 'string') {
      optContent = o.trim();
    } else if (typeof o === 'object' && o !== null) {
      optContent = String(o.content || o.text || o.title || '').trim();
      isCorrect = Boolean(o.isCorrect || o.correct);
    }

    // Loại bỏ tiền tố A., B., C., D. nếu có để chuẩn hóa (chỉ áp dụng khi không phải câu Đúng/Sai)
    if (!isTrueFalse) {
      optContent = optContent.replace(/^[A-D][\s.:)-]+/i, '').trim();
    }

    // Chuẩn hóa toán học & Unicode cho nội dung phương án
    optContent = normalizeMathFormulas(cleanVietnameseEncoding(optContent));

    if (!optContent || /^Phương án\s*[A-D0-9]?$/i.test(optContent) || /^Lựa chọn\s*[A-D0-9]?$/i.test(optContent)) {
      return { isValid: false, error: `Phương án ${String.fromCharCode(65 + idx)} chứa placeholder giả hoặc rỗng` };
    }

    // 3. KIỂM TRA TÍNH DUY NHẤT: Tuyệt đối không trùng lặp phương án
    const canonical = canonicalOptionContent(optContent);
    if (canonicalSet.has(canonical)) {
      return {
        isValid: false,
        error: `Trùng lặp phương án: Phương án "${optContent}" xuất hiện nhiều lần`,
      };
    }
    canonicalSet.add(canonical);

    // Xác định isCorrect dựa trên cờ có sẵn, answerKey hoặc lời giải
    const letter = String.fromCharCode(65 + idx);
    if (!isCorrect) {
      if (answerKey === letter || (answerKey && canonical === canonicalOptionContent(answerKey))) {
        isCorrect = true;
      } else if (keyFromExplanation === letter) {
        isCorrect = true;
      }
    }

    validatedOptions.push({
      content: isTrueFalse ? optContent : `${letter}. ${optContent}`,
      isCorrect,
    });
  }

  // 4. KIỂM TRA TÍNH CHÍNH XÁC: Luôn tồn tại đúng 1 đáp án đúng
  const correctCount = validatedOptions.filter((o) => o.isCorrect).length;

  if (correctCount === 0) {
    // Nếu chưa có đáp án nào được đánh dấu, thử xác định qua answerKey hoặc keyFromExplanation
    const targetLetter = keyFromExplanation || (['A', 'B', 'C', 'D'].includes(answerKey) ? answerKey : '');
    if (targetLetter) {
      const targetIdx = targetLetter.charCodeAt(0) - 65;
      if (targetIdx >= 0 && targetIdx < validatedOptions.length) {
        validatedOptions[targetIdx].isCorrect = true;
      }
    }
  } else if (correctCount > 1) {
    // Nếu có nhiều hơn 1 đáp án được đánh dấu đúng, ưu tiên đáp án theo lời giải hoặc answerKey
    const targetLetter = keyFromExplanation || (['A', 'B', 'C', 'D'].includes(answerKey) ? answerKey : '');
    if (targetLetter) {
      const targetIdx = targetLetter.charCodeAt(0) - 65;
      validatedOptions.forEach((o, i) => {
        o.isCorrect = i === targetIdx;
      });
    } else {
      // Giữ đáp án đúng đầu tiên, các đáp án sau đặt false
      let foundFirst = false;
      validatedOptions.forEach((o) => {
        if (o.isCorrect) {
          if (!foundFirst) foundFirst = true;
          else o.isCorrect = false;
        }
      });
    }
  }

  // Kiểm tra lại lần cuối: Bắt buộc phải có đúng 1 đáp án đúng
  const finalCorrectCount = validatedOptions.filter((o) => o.isCorrect).length;
  if (finalCorrectCount !== 1) {
    return {
      isValid: false,
      error: `Câu hỏi phải có chính xác 1 đáp án đúng (hiện có ${finalCorrectCount})`,
    };
  }

  const cleanExplanation = rawExplanation
    ? normalizeMathFormulas(cleanVietnameseEncoding(rawExplanation))
    : undefined;

  return {
    isValid: true,
    question: {
      id: q.id || `q_${index + 1}`,
      rawLabel: q.rawLabel || `Câu ${index + 1}`,
      content: sanitizedContent,
      options: validatedOptions,
      explanation: cleanExplanation,
      points: q.points || 1,
      type: isTrueFalse ? 'true_false' : 'multiple_choice',
      answer: validatedOptions.find((o) => o.isCorrect)?.content,
    },
  };
}

/**
 * 5. Lọc và chuẩn hóa toàn bộ danh sách câu hỏi đề thi
 * Loại bỏ toàn bộ các câu vi phạm quy chuẩn đầu ra
 */
export function validateAndSanitizeQuestions(rawQuestions: any[]): ValidatedQuestion[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) return [];

  const validQuestions: ValidatedQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const check = validateAndSanitizeQuestion(rawQuestions[i], i);
    if (check.isValid && check.question) {
      validQuestions.push(check.question);
    } else {
      console.warn(`[questionValidator] Loại bỏ câu hỏi ${i + 1} không đạt chuẩn:`, check.error);
    }
  }

  // Tái phân bổ điểm để tổng điểm bằng 10
  if (validQuestions.length > 0) {
    const ptPerQ = Math.round((10 / validQuestions.length) * 100) / 100;
    validQuestions.forEach((q, idx) => {
      q.id = `q_${idx + 1}`;
      q.rawLabel = `Câu ${idx + 1}`;
      q.points = ptPerQ;
    });
  }

  return validQuestions;
}

/**
 * 6. Kiểm định tính hợp lệ của tài liệu tải lên:
 * Đảm bảo tài liệu là tài liệu học tập, bài giảng, bài tập, đề thi thực thụ.
 * Tuyệt đối chặn:
 * - Danh sách học sinh, điểm danh, danh sách lớp, sổ điểm, hồ sơ hành chính
 * - Văn bản rỗng, quá ngắn (< 40 ký tự)
 * - Văn bản ngẫu nhiên, vô nghĩa, chuỗi ký tự rác, code log/trace
 */
export function validateEducationalDocument(text: string, fileName?: string): { isValid: boolean; reason?: string } {
  if (!text || text.trim().length < 40) {
    return {
      isValid: false,
      reason: 'Tài liệu quá ngắn hoặc không có nội dung chữ để phân tích đề thi.',
    };
  }

  const clean = text.toLowerCase();
  const fileClean = (fileName || '').toLowerCase();

  // 1. Kiểm tra tài liệu dạng Danh sách học sinh / Điểm danh / Bảng điểm hành chính
  const rosterKeywords = [
    'danh sách học sinh',
    'danh sach hoc sinh',
    'danh sách lớp',
    'danh sach lop',
    'danh sách sinh viên',
    'bảng điểm danh',
    'bang diem danh',
    'điểm danh',
    'diem danh',
    'sổ gọi tên',
    'so goi ten',
    'danh sách thi',
    'danh sach thi',
    'sổ điểm',
    'so diem',
    'danh sách cán bộ',
    'danh sách giáo viên',
    'bảng lương',
    'hóa đơn',
    'biên lai',
  ];
  const isRosterTitle = rosterKeywords.some((kw) => clean.includes(kw) || fileClean.includes(kw));

  // Kiểm tra các cột dữ liệu hành chính điển hình
  const adminColumns = [
    /\bhọ\s*và\s*tên\b/,
    /\bho\s*va\s*ten\b/,
    /\bngày\s*sinh\b/,
    /\bngay\s*sinh\b/,
    /\bgiới\s*tính\b/,
    /\bgioi\s*tinh\b/,
    /\bnơi\s*sinh\b/,
    /\bnoi\s*sinh\b/,
    /\bdân\s*tộc\b/,
    /\bchức\s*vụ\b/,
    /\bsố\s*điện\s*thoại\b/,
    /\bsđt\b/,
    /\bcccd\b/,
    /\bcmnd\b/,
    /\bmshs\b/,
    /\bmssv\b/,
    /\bsbd\b/,
    /\bchữ\s*ký\b/,
  ];
  let adminColCount = 0;
  for (const reg of adminColumns) {
    if (reg.test(clean)) adminColCount++;
  }

  // Kiểm tra từ khóa câu hỏi hoặc bài tập giáo dục
  const educationalKeywords = [
    /\b(?:câu|câu\s*hỏi|bài|bài\s*tập|question)\s*\d+/i,
    /\b(?:đáp\s*án|lời\s*giải|hướng\s*dẫn\s*giải)\b/i,
    /\b(?:chứng\s*minh|tính\s*giá\s*trị|rút\s*gọn|tìm\s*x|giải\s*phương\s*trình|hàm\s*số)\b/i,
    /\b(?:định\s*nghĩa|định\s*lý|khái\s*niệm|tính\s*chất|công\s*thức|lý\s*thuyết)\b/i,
    /\b(?:phương\s*án|lựa\s*chọn|trắc\s*nghiệm|tự\s*luận)\b/i,
    /(?:^|\n)\s*[A-D][\s.)]/,
  ];
  const hasEducationalContent = educationalKeywords.some((reg) => reg.test(text));

  // Nếu tiêu đề là danh sách lớp/học sinh hoặc có >= 2 cột hành chính và KHÔNG CÓ nội dung bài tập giáo dục
  if ((isRosterTitle || adminColCount >= 2) && !hasEducationalContent) {
    return {
      isValid: false,
      reason: 'Tài liệu tải lên là danh sách học sinh / bảng điểm hành chính, không phải đề thi hay tài liệu bài giảng giáo dục. Hệ thống không tạo đề thi từ file này!',
    };
  }

  // 2. Kiểm tra văn bản rác / ngẫu nhiên / vô nghĩa
  const commonWords = [
    /\b(?:và|của|trong|cho|với|có|các|được|này|khi|sau|như|về|đến|từ|bằng|không|những|theo|đã|sẽ|phải|để|người|việc|thì|mà|ở|ra|vào|lại|rồi|lên|qua|nhiều|khác|một|hai|ba|bốn|năm)\b/i,
    /\b(?:the|and|in|of|to|is|are|for|with|on|that|this|by|from|as|at|or|an|be|which|have|has)\b/i,
    /\b(?:bài|học|giáo|khoa|sách|chương|phần|mục|tiết|lý|thuyết|thực|hành|kiến|thức|kỹ|năng)\b/i,
  ];
  let commonWordMatches = 0;
  for (const cw of commonWords) {
    const m = clean.match(cw);
    if (m) commonWordMatches += m.length;
  }

  if (!hasEducationalContent && commonWordMatches < 3) {
    return {
      isValid: false,
      reason: 'Tài liệu không chứa nội dung bài học hoặc câu hỏi kiểm tra có ý nghĩa.',
    };
  }

  const letters = text.match(/[a-zA-Z\u00C0-\u024F\u1EA0-\u1EF9]/g) || [];
  if (letters.length < 25) {
    return {
      isValid: false,
      reason: 'Tài liệu không chứa đủ nội dung chữ có nghĩa để phân tích đề thi.',
    };
  }

  return { isValid: true };
}
