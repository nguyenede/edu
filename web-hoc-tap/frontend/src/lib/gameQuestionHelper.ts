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
      if (!isCorrect) {
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

  // Guarantee at least 1 correct answer
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount === 0 && options.length > 0) {
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
 * High-quality standard classroom trial questions for warm-up and game demonstration.
 * Ensures games are ALWAYS playable immediately even when user has not uploaded any documents yet.
 */
export const DEFAULT_CLASSROOM_TRIAL_QUESTIONS: NormalizedGameQuestion[] = [
  {
    id: 'trial_q_1',
    content: 'Đây là hình dạng hình học nào?',
    options: [
      { content: 'Hình bình hành', isCorrect: false },
      { content: 'Hình thoi', isCorrect: false },
      { content: 'Hình thang', isCorrect: true },
      { content: 'Hình chữ nhật', isCorrect: false },
    ],
    explanation: 'Hình thang là tứ giác lồi có hai cạnh đối song song với nhau.',
    selected: true,
  },
  {
    id: 'trial_q_2',
    content: 'Thủ đô của Việt Nam là thành phố nào?',
    options: [
      { content: 'Đà Nẵng', isCorrect: false },
      { content: 'TP. Hồ Chí Minh', isCorrect: false },
      { content: 'Hà Nội', isCorrect: true },
      { content: 'Huế', isCorrect: false },
    ],
    explanation: 'Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là Hà Nội.',
    selected: true,
  },
  {
    id: 'trial_q_3',
    content: 'Hành tinh nào nằm gần Mặt Trời nhất trong Hệ Mặt Trời?',
    options: [
      { content: 'Sao Kim', isCorrect: false },
      { content: 'Sao Hỏa', isCorrect: false },
      { content: 'Sao Thủy', isCorrect: true },
      { content: 'Trái Đất', isCorrect: false },
    ],
    explanation: 'Sao Thủy (Mercury) là hành tinh nằm gần Mặt Trời nhất trong Hệ Mặt Trời.',
    selected: true,
  },
  {
    id: 'trial_q_4',
    content: 'Tác phẩm văn học "Truyện Kiều" là kiệt tác của danh nhân văn hóa nào?',
    options: [
      { content: 'Nguyễn Trãi', isCorrect: false },
      { content: 'Nguyễn Du', isCorrect: true },
      { content: 'Hồ Xuân Hương', isCorrect: false },
      { content: 'Nguyễn Đình Chiểu', isCorrect: false },
    ],
    explanation: 'Đại thi hào Nguyễn Du là tác giả của kiệt tác Đoạn trường tân thanh (Truyện Kiều).',
    selected: true,
  },
  {
    id: 'trial_q_5',
    content: 'Động vật nào sau đây là loài thú có vú sống dưới đại dương?',
    options: [
      { content: 'Cá voi xanh', isCorrect: true },
      { content: 'Cá mập trắng', isCorrect: false },
      { content: 'Cá hồi', isCorrect: false },
      { content: 'Cá đuối', isCorrect: false },
    ],
    explanation: 'Cá voi là động vật có vú hít thở bằng phổi và nuôi con bằng sữa mẹ, không phải là loài cá.',
    selected: true,
  },
  {
    id: 'trial_q_6',
    content: 'Việt Nam nằm ở khu vực nào của châu Á?',
    options: [
      { content: 'Đông Á', isCorrect: false },
      { content: 'Nam Á', isCorrect: false },
      { content: 'Đông Nam Á', isCorrect: true },
      { content: 'Tây Á', isCorrect: false },
    ],
    explanation: 'Việt Nam thuộc khu vực Đông Nam Á, nằm trên bán đảo Đông Dương.',
    selected: true,
  },
  {
    id: 'trial_q_7',
    content: 'Chất khí nào chiếm tỉ lệ thể tích lớn nhất trong bầu khí quyển Trái Đất?',
    options: [
      { content: 'Khí Ô-xi (O2)', isCorrect: false },
      { content: 'Khí Ni-tơ (N2)', isCorrect: true },
      { content: 'Khí Cac-bon-nic (CO2)', isCorrect: false },
      { content: 'Khí Hi-đrô (H2)', isCorrect: false },
    ],
    explanation: 'Khí Ni-tơ chiếm khoảng 78% thể tích bầu khí quyển Trái Đất, khí Ô-xi chiếm khoảng 21%.',
    selected: true,
  },
  {
    id: 'trial_q_8',
    content: 'Bác Hồ đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa vào năm nào?',
    options: [
      { content: 'Năm 1930', isCorrect: false },
      { content: 'Năm 1945', isCorrect: true },
      { content: 'Năm 1954', isCorrect: false },
      { content: 'Năm 1975', isCorrect: false },
    ],
    explanation: 'Ngày 2/9/1945 tại Quảng trường Ba Đình (Hà Nội), Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập.',
    selected: true,
  },
];
