export interface QuestionOption {
  content: string;
  isCorrect: boolean;
}

export interface GeneratedQuestion {
  content: string;
  options: QuestionOption[];
  explanation?: string;
  points?: number;
}

interface FallbackTemplate {
  subject: string;
  gradePattern: RegExp | string;
  topicKeywords: string[];
  questions: Array<{
    content: string;
    options: [string, string, string, string];
    correctAnswer: string;
    explanation: string;
  }>;
}

const CURRICULUM_BANK: FallbackTemplate[] = [
  // --- TOÁN HỌC LỚP 9 ---
  {
    subject: 'Toán',
    gradePattern: /9|thcs/i,
    topicKeywords: ['bất đẳng thức', 'tính chất', 'thứ tự', 'so sánh', 'bđt'],
    questions: [
      {
        content: 'Cho $a < b$. Khẳng định nào sau đây là ĐÚNG?',
        options: ['$a + 3 < b + 3$', '$a + 3 > b + 3$', '$a - 2 > b - 2$', '$a + 5 \\ge b + 5$'],
        correctAnswer: '$a + 3 < b + 3$',
        explanation: 'Theo tính chất liên hệ giữa thứ tự và phép cộng: Khi cộng cùng một số vào cả hai vế của một bất đẳng thức thì được bất đẳng thức mới cùng chiều. Do $a < b$ nên $a + 3 < b + 3$.',
      },
      {
        content: 'Cho $a < b$. Khi nhân cả hai vế với số âm $-2$, ta được khẳng định nào sau đây là ĐÚNG?',
        options: ['$-2a > -2b$', '$-2a < -2b$', '$-2a \\le -2b$', '$-2a = -2b$'],
        correctAnswer: '$-2a > -2b$',
        explanation: 'Theo tính chất liên hệ giữa thứ tự và phép nhân: Khi nhân cả hai vế của một bất đẳng thức với cùng một số âm, ta phải đổi chiều bất đẳng thức. Do đó $a < b \\Rightarrow -2a > -2b$.',
      },
      {
        content: 'Cho $x - 5 > y - 5$. So sánh $x$ và $y$ ta được kết quả là:',
        options: ['$x > y$', '$x < y$', '$x = y$', '$x \\le y$'],
        correctAnswer: '$x > y$',
        explanation: 'Cộng cả hai vế của bất đẳng thức $x - 5 > y - 5$ với $5$, ta được $x > y$.',
      },
      {
        content: 'Cho $a > b$ và $c < 0$. Bất đẳng thức nào sau đây luôn ĐÚNG?',
        options: ['$ac < bc$', '$ac > bc$', '$\\frac{a}{c} > \\frac{b}{c}$', '$a + c < b + c$'],
        correctAnswer: '$ac < bc$',
        explanation: 'Vì $c < 0$ (số âm), nhân cả hai vế của bất đẳng thức $a > b$ với $c$ sẽ đổi chiều bất đẳng thức thành $ac < bc$.',
      },
      {
        content: 'Biết $a \\le b$. Khẳng định nào sau đây là SAI?',
        options: ['$-3a \\le -3b$', '$2a \\le 2b$', '$a - 1 \\le b - 1$', '$-a \\ge -b$'],
        correctAnswer: '$-3a \\le -3b$',
        explanation: 'Khi nhân cả hai vế của $a \\le b$ với số âm $-3$, bất đẳng thức phải đổi chiều thành $-3a \\ge -3b$. Do đó $-3a \\le -3b$ là khẳng định SAI.',
      },
      {
        content: 'Nếu $a < b$ và $b < c$ thì ta có $a < c$. Đây là tính chất gì của bất đẳng thức?',
        options: ['Tính chất bắc cầu', 'Tính chất giao hoán', 'Tính chất kết hợp', 'Tính chất phân phối'],
        correctAnswer: 'Tính chất bắc cầu',
        explanation: 'Tính chất: Nếu $a < b$ và $b < c$ thì $a < c$ được gọi là tính chất bắc cầu của thứ tự và bất đẳng thức.',
      },
    ],
  },
  // --- TOÁN HỌC ---
  {
    subject: 'Toán',
    gradePattern: /10|11|12|thpt/i,
    topicKeywords: ['hàm số', 'parabol', 'bậc hai', 'đồ thị'],
    questions: [
      {
        content: 'Tọa độ đỉnh $I$ của parabol $(P): y = x^2 - 4x + 3$ là:',
        options: ['$I(2; -1)$', '$I(-2; 15)$', '$I(2; 3)$', '$I(-2; -1)$'],
        correctAnswer: '$I(2; -1)$',
        explanation: 'Hoành độ đỉnh $x_I = -\\frac{b}{2a} = -\\frac{-4}{2 \\cdot 1} = 2$. Thay vào hàm số: $y_I = 2^2 - 4(2) + 3 = -1$. Do đó $I(2; -1)$.',
      },
      {
        content: 'Trục đối xứng của parabol $(P): y = -2x^2 + 4x - 1$ là đường thẳng có phương trình:',
        options: ['$x = 1$', '$x = -1$', '$x = 2$', '$y = 1$'],
        correctAnswer: '$x = 1$',
        explanation: 'Trục đối xứng của parabol $y = ax^2 + bx + c$ là đường thẳng $x = -\\frac{b}{2a} = -\\frac{4}{2(-2)} = 1$.',
      },
      {
        content: 'Cho hàm số $y = x^2 - 2x - 3$. Mệnh đề nào sau đây là ĐÚNG?',
        options: [
          'Hàm số đồng biến trên khoảng $(1; +\\infty)$',
          'Hàm số nghịch biến trên khoảng $(1; +\\infty)$',
          'Hàm số đồng biến trên khoảng $(-\\infty; 1)$',
          'Hàm số nghịch biến trên khoảng $(-\\infty; +\\infty)$',
        ],
        correctAnswer: 'Hàm số đồng biến trên khoảng $(1; +\\infty)$',
        explanation: 'Hệ số $a = 1 > 0$, hoành độ đỉnh $x_I = 1$. Do đó hàm số nghịch biến trên $(-\\infty; 1)$ và đồng biến trên $(1; +\\infty)$.',
      },
      {
        content: 'Tập xác định của hàm số $y = \\sqrt{2x - 4}$ là:',
        options: ['$[2; +\\infty)$', '$(2; +\\infty)$', '$(-\\infty; 2]$', '$\\mathbb{R} \\setminus \\{2\\}$'],
        correctAnswer: '$[2; +\\infty)$',
        explanation: 'Biểu thức dưới dấu căn có nghĩa khi $2x - 4 \\ge 0 \\Leftrightarrow x \\ge 2$. Vậy tập xác định là $D = [2; +\\infty)$.',
      },
      {
        content: 'Giá trị nhỏ nhất của hàm số $y = x^2 - 6x + 11$ trên $\\mathbb{R}$ bằng:',
        options: ['$2$', '$11$', '$3$', '$-2$'],
        correctAnswer: '$2$',
        explanation: 'Ta có $y = (x - 3)^2 + 2 \\ge 2$ với mọi $x \\in \\mathbb{R}$. Dấu bằng xảy ra khi $x = 3$.',
      },
      {
        content: 'Giao điểm của parabol $(P): y = x^2 - 3x + 2$ với trục tung $Oy$ là điểm nào?',
        options: ['$A(0; 2)$', '$B(1; 0)$', '$C(2; 0)$', '$D(0; -3)$'],
        correctAnswer: '$A(0; 2)$',
        explanation: 'Giao điểm với trục tung cho $x = 0 \\Rightarrow y = 0^2 - 3(0) + 2 = 2$. Vậy tọa độ giao điểm là $(0; 2)$.',
      },
      {
        content: 'Phương trình $x^2 - 5x + 6 = 0$ có tập nghiệm là:',
        options: ['$S = \\{2; 3\\}$', '$S = \\{-2; -3\\}$', '$S = \\{1; 6\\}$', '$S = \\{-1; -6\\}$'],
        correctAnswer: '$S = \\{2; 3\\}$',
        explanation: 'Phân tích đa thức thành nhân tử: $(x - 2)(x - 3) = 0 \\Leftrightarrow x = 2$ hoặc $x = 3$.',
      },
      {
        content: 'Bất phương trình $x^2 - 4x + 3 < 0$ có tập nghiệm là khoảng nào?',
        options: ['$(1; 3)$', '$(-\\infty; 1) \\cup (3; +\\infty)$', '$[1; 3]$', '$(-\\infty; 1]$'],
        correctAnswer: '$(1; 3)$',
        explanation: 'Tam thức bậc hai có hai nghiệm phân biệt $x_1 = 1, x_2 = 3$. Hệ số $a = 1 > 0$, theo quy tắc "trong trái ngoài cùng", tam thức nhận giá trị âm trong khoảng $(1; 3)$.',
      },
    ],
  },
  {
    subject: 'Toán học',
    gradePattern: /10|11|12|thpt/i,
    topicKeywords: ['lượng giác', 'vectơ', 'hình học', 'tích phân', 'đạo hàm'],
    questions: [
      {
        content: 'Trong mặt phẳng tọa độ $Oxy$, cho $\\vec{a} = (2; -3)$ và $\\vec{b} = (1; 4)$. Tọa độ của vectơ $\\vec{u} = 2\\vec{a} + \\vec{b}$ là:',
        options: ['$\\vec{u} = (5; -2)$', '$\\vec{u} = (5; 2)$', '$\\vec{u} = (3; 1)$', '$\\vec{u} = (4; -6)$'],
        correctAnswer: '$\\vec{u} = (5; -2)$',
        explanation: 'Ta có $2\\vec{a} = (4; -6)$. Suy ra $\\vec{u} = 2\\vec{a} + \\vec{b} = (4 + 1; -6 + 4) = (5; -2)$.',
      },
      {
        content: 'Tích vô hướng của hai vectơ $\\vec{a} = (1; 2)$ và $\\vec{b} = (-2; 3)$ bằng:',
        options: ['$4$', '$-4$', '$8$', '$0$'],
        correctAnswer: '$4$',
        explanation: '$\\vec{a} \\cdot \\vec{b} = x_a \\cdot x_b + y_a \\cdot y_b = 1(-2) + 2(3) = -2 + 6 = 4$.',
      },
      {
        content: 'Đạo hàm của hàm số $y = x^3 - 3x^2 + 2x - 5$ là:',
        options: ['$y\' = 3x^2 - 6x + 2$', '$y\' = 3x^2 - 3x + 2$', '$y\' = x^2 - 6x + 2$', '$y\' = 3x^2 - 6x$'],
        correctAnswer: '$y\' = 3x^2 - 6x + 2$',
        explanation: 'Áp dụng công thức đạo hàm cơ bản: $(x^n)\' = n x^{n-1}$, ta có $(x^3)\' = 3x^2, (-3x^2)\' = -6x, (2x)\' = 2, (-5)\' = 0$.',
      },
      {
        content: 'Khẳng định nào sau đây là ĐÚNG với mọi góc $\\alpha$?',
        options: [
          '$\\sin^2 \\alpha + \\cos^2 \\alpha = 1$',
          '$\\sin^2 \\alpha - \\cos^2 \\alpha = 1$',
          '$\\tan \\alpha = \\frac{\\cos \\alpha}{\\sin \\alpha}$',
          '$\\sin(2\\alpha) = 2\\sin \\alpha$',
        ],
        correctAnswer: '$\\sin^2 \\alpha + \\cos^2 \\alpha = 1$',
        explanation: 'Đây là hệ thức lượng giác cơ bản giữa sin và cos của cùng một góc: $\\sin^2 \\alpha + \\cos^2 \\alpha = 1$.',
      },
      {
        content: 'Nguyên hàm của hàm số $f(x) = 2x + 1$ là:',
        options: ['$F(x) = x^2 + x + C$', '$F(x) = 2x^2 + x + C$', '$F(x) = x^2 + C$', '$F(x) = 2 + C$'],
        correctAnswer: '$F(x) = x^2 + x + C$',
        explanation: '$\\int (2x + 1) dx = 2 \\cdot \\frac{x^2}{2} + x + C = x^2 + x + C$.',
      },
    ],
  },
  // --- TIẾNG ANH ---
  {
    subject: 'Tiếng Anh',
    gradePattern: /.*/i,
    topicKeywords: ['english', 'tense', 'grammar', 'passive', 'vocabulary', 'anh'],
    questions: [
      {
        content: 'Choose the best option to complete the sentence: "If it ______ tomorrow, we will cancel the picnic."',
        options: ['rains', 'will rain', 'rained', 'is raining'],
        correctAnswer: 'rains',
        explanation: 'Câu điều kiện loại 1 (First Conditional): Mệnh đề If dùng thì Hiện tại đơn (Present Simple: rains), mệnh đề chính dùng will + V-inf.',
      },
      {
        content: 'Choose the best option: "She has worked at this school ______ 2018."',
        options: ['since', 'for', 'in', 'during'],
        correctAnswer: 'since',
        explanation: 'Trong thì Hiện tại hoàn thành, dùng "since" đi kèm mốc thời gian cụ thể trong quá khứ (since 2018), còn "for" dùng cho khoảng thời gian.',
      },
      {
        content: 'The passive voice of "They built this bridge in 1995" is:',
        options: [
          'This bridge was built in 1995.',
          'This bridge is built in 1995.',
          'This bridge has been built in 1995.',
          'This bridge was being built in 1995.',
        ],
        correctAnswer: 'This bridge was built in 1995.',
        explanation: 'Câu chủ động ở thì Quá khứ đơn (built). Cấu trúc bị động: S + was/were + V3/ed. Chủ ngữ số ít "This bridge" đi với was built.',
      },
      {
        content: 'Choose the correct relative pronoun: "The boy ______ won the first prize is my classmate."',
        options: ['who', 'which', 'whom', 'whose'],
        correctAnswer: 'who',
        explanation: 'Đại từ quan hệ "who" thay thế cho danh từ chỉ người ("The boy") và đóng vai trò làm chủ ngữ trong mệnh đề quan hệ.',
      },
      {
        content: 'Choose the correct form of the verb: "Listen! The baby ______ in the next room."',
        options: ['is crying', 'cries', 'cried', 'has cried'],
        correctAnswer: 'is crying',
        explanation: 'Dấu hiệu nhận biết câu cảm thán "Listen!" biểu thị hành động đang diễn ra tại thời điểm nói -> Thì Hiện tại tiếp diễn (is crying).',
      },
      {
        content: 'Choose the correct preposition: "I am interested ______ learning foreign languages."',
        options: ['in', 'on', 'at', 'about'],
        correctAnswer: 'in',
        explanation: 'Cụm tính từ cố định: to be interested in + V-ing / Noun (quan tâm, hứng thú với điều gì).',
      },
      {
        content: 'Choose the correct answer: "She didn\'t go to the party ______ she felt exhausted."',
        options: ['because', 'although', 'despite', 'in spite of'],
        correctAnswer: 'because',
        explanation: '"Because" đi kèm mệnh đề chỉ nguyên nhân (she felt exhausted - cô ấy cảm thấy kiệt sức).',
      },
    ],
  },
  // --- VẬT LÝ ---
  {
    subject: 'Vật lý',
    gradePattern: /.*/i,
    topicKeywords: ['vật lý', 'lực', 'dao động', 'chuyển động', 'điện', 'quang'],
    questions: [
      {
        content: 'Trong chuyển động thẳng biến đổi đều, công thức liên hệ giữa vận tốc $v$, gia tốc $a$ và quãng đường $s$ là:',
        options: ['$v^2 - v_0^2 = 2as$', '$v - v_0 = 2as$', '$v^2 - v_0^2 = as$', '$v^2 + v_0^2 = 2as$'],
        correctAnswer: '$v^2 - v_0^2 = 2as$',
        explanation: 'Công thức độc lập với thời gian trong chuyển động thẳng biến đổi đều là $v^2 - v_0^2 = 2as$.',
      },
      {
        content: 'Theo định luật II Newton, biểu thức liên hệ giữa lực $\\vec{F}$, khối lượng $m$ và gia tốc $\\vec{a}$ là:',
        options: ['$\\vec{F} = m \\vec{a}$', '$\\vec{a} = m \\vec{F}$', '$\\vec{F} = \\frac{\\vec{a}}{m}$', '$\\vec{F} = m a^2$'],
        correctAnswer: '$\\vec{F} = m \\vec{a}$',
        explanation: 'Định luật II Newton phát biểu rằng gia tốc của một vật cùng hướng với lực tác dụng và tỉ lệ thuận với độ lớn của lực: $\\vec{F} = m \\vec{a}$.',
      },
      {
        content: 'Công thức tính động năng của một vật có khối lượng $m$ chuyển động với vận tốc $v$ là:',
        options: ['$W_đ = \\frac{1}{2}mv^2$', '$W_đ = mv^2$', '$W_đ = \\frac{1}{2}mv$', '$W_đ = 2mv^2$'],
        correctAnswer: '$W_đ = \\frac{1}{2}mv^2$',
        explanation: 'Động năng là dạng năng lượng mà vật có được do chuyển động, tính bởi $W_đ = \\frac{1}{2}mv^2$.',
      },
      {
        content: 'Một vật dao động điều hòa với phương trình $x = A \\cos(\\omega t + \\varphi)$. Vận tốc cực đại của vật có độ lớn bằng:',
        options: ['$v_{max} = \\omega A$', '$v_{max} = \\omega^2 A$', '$v_{max} = \\frac{A}{\\omega}$', '$v_{max} = 2\\omega A$'],
        correctAnswer: '$v_{max} = \\omega A$',
        explanation: 'Vận tốc $v = x\' = -\\omega A \\sin(\\omega t + \\varphi)$. Khi sin bằng $\\pm 1$, độ lớn vận tốc đạt cực đại là $v_{max} = \\omega A$.',
      },
    ],
  },
  // --- HÓA HỌC ---
  {
    subject: 'Hóa học',
    gradePattern: /.*/i,
    topicKeywords: ['hóa học', 'nguyên tử', 'axit', 'bazơ', 'phản ứng', 'kim loại'],
    questions: [
      {
        content: 'Nguyên tử của một nguyên tố hóa học được cấu tạo từ các loại hạt vi mô nào sau đây?',
        options: [
          'Proton, nơtron và electron',
          'Chỉ gồm proton và electron',
          'Chỉ gồm proton và nơtron',
          'Proton, nơtron và ion',
        ],
        correctAnswer: 'Proton, nơtron và electron',
        explanation: 'Hạt nhân nguyên tử gồm các hạt proton (mang điện tích dương) và nơtron (không mang điện), lớp vỏ gồm các electron (mang điện tích âm).',
      },
      {
        content: 'Dung dịch nào sau đây làm quỳ tím chuyển sang màu đỏ?',
        options: ['Dung dịch $HCl$', 'Dung dịch $NaOH$', 'Dung dịch $NaCl$', 'Dung dịch $H_2O$ tinh khiết'],
        correctAnswer: 'Dung dịch $HCl$',
        explanation: 'Axit clohiđric ($HCl$) phân ly cho ion $H^+$ trong nước, làm môi trường có tính axit nên quỳ tím chuyển sang màu đỏ.',
      },
      {
        content: 'Kim loại nào sau đây có tính dẫn điện tốt nhất ở điều kiện thường?',
        options: ['Bạc ($Ag$)', 'Đồng ($Cu$)', 'Vàng ($Au$)', 'Nhôm ($Al$)'],
        correctAnswer: 'Bạc ($Ag$)',
        explanation: 'Thứ tự dẫn điện giảm dần của các kim loại thông dụng là: $Ag > Cu > Au > Al > Fe$. Bạc là kim loại dẫn điện tốt nhất.',
      },
      {
        content: 'Công thức phân tử của khí metan (thành phần chính của khí thiên nhiên) là:',
        options: ['$CH_4$', '$C_2H_4$', '$C_2H_2$', '$C_6H_6$'],
        correctAnswer: '$CH_4$',
        explanation: 'Metan là ankan đơn giản nhất có công thức phân tử $CH_4$.',
      },
    ],
  },
];

export function generateCurriculumFallbackExam(params: {
  subject: string;
  grade: string;
  topic: string;
  targetCount: number;
}): {
  title: string;
  subject: string;
  grade: string;
  questions: GeneratedQuestion[];
} {
  const normSubject = (params.subject || 'Toán').trim();
  const normGrade = (params.grade || '9').trim();
  const normTopic = (params.topic || 'Kiến thức trọng tâm').trim();
  const count = Math.max(1, Math.min(params.targetCount || 10, 30));

  // 1. Tìm template phù hợp nhất theo môn, khối lớp và chủ đề
  let matchedTemplate = CURRICULUM_BANK.find((t) => {
    const subMatch =
      t.subject.toLowerCase() === normSubject.toLowerCase() ||
      (normSubject.toLowerCase().includes('toán') && t.subject.toLowerCase().includes('toán'));
    const topicMatch = t.topicKeywords.some((k) => normTopic.toLowerCase().includes(k.toLowerCase()));
    const gradeMatch = typeof t.gradePattern === 'string' ? t.gradePattern === normGrade : t.gradePattern.test(normGrade);
    return subMatch && topicMatch && gradeMatch;
  });

  if (!matchedTemplate) {
    matchedTemplate = CURRICULUM_BANK.find((t) => {
      const subMatch =
        t.subject.toLowerCase() === normSubject.toLowerCase() ||
        (normSubject.toLowerCase().includes('toán') && t.subject.toLowerCase().includes('toán'));
      const topicMatch = t.topicKeywords.some((k) => normTopic.toLowerCase().includes(k.toLowerCase()));
      return subMatch && topicMatch;
    });
  }

  if (!matchedTemplate) {
    matchedTemplate = CURRICULUM_BANK.find((t) => {
      return (
        t.subject.toLowerCase() === normSubject.toLowerCase() ||
        (normSubject.toLowerCase().includes('toán') && t.subject.toLowerCase().includes('toán'))
      );
    });
  }

  if (!matchedTemplate) {
    matchedTemplate = CURRICULUM_BANK[0];
  }

  // 2. Lấy danh sách câu hỏi và nhân bản có biến thể nếu thiếu
  const basePool = matchedTemplate.questions;
  const questions: GeneratedQuestion[] = [];

  for (let i = 0; i < count; i++) {
    const src = basePool[i % basePool.length];
    const qId = `fallback_q_${Date.now()}_${i + 1}`;
    
    // Nếu phải lặp lại vòng 2, thêm tiền tố nhận diện câu
    const content = i < basePool.length ? src.content : `[Mở rộng ${Math.floor(i / basePool.length) + 1}] ${src.content}`;
    
    questions.push({
      content,
      options: src.options.map((opt) => ({
        content: opt,
        isCorrect: opt === src.correctAnswer,
      })),
      explanation: src.explanation,
    });
  }

  return {
    title: `Đề thi môn ${normSubject} - Chủ đề: ${normTopic.slice(0, 40)}`,
    subject: normSubject,
    grade: normGrade,
    questions,
  };
}
