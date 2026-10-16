import { CognitiveLevel } from './types';
import azotaConfig from './azota_params.json';

/**
 * Bản sao thông số và mẫu biểu thức chính quy chính thức trích xuất từ Azota Production
 */
export const AZOTA_CONFIG = azotaConfig;

/**
 * Bảng thay thế ký tự đồng dạng (Homoglyphs) từ Azota TVCN_CHAR
 * Chuyển các ký tự Hy Lạp / Cyrillic dễ bị nhầm lẫn khi scan hoặc copy tài liệu
 */
export const HOMOGLYPHS_MAP: [string, string][] = [
  ['Α', 'A'], // Greek Alpha -> Latin A
  ['В', 'B'], // Cyrillic Ve -> Latin B
  ['Β', 'B'], // Greek Beta -> Latin B
  ['С', 'C'], // Cyrillic Es -> Latin C
];

/**
 * Thay thế các ký tự đồng dạng và xóa bỏ ký tự ẩn / zero-width space
 */
export function replaceHomoglyphs(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [from, to] of HOMOGLYPHS_MAP) {
    result = result.replaceAll(from, to);
  }
  // Loại bỏ zero-width spaces và byte order mark
  result = result.replace(/[\u200B-\u200D\uFEFF]/g, ' ');
  return result;
}

export const AZOTA_PATTERNS = {
  // 1. Nhận diện đầu câu hỏi (kết hợp QUESTION_PATTERN và QUESTION_PATTERN2 từ Azota)
  QUESTION: [
    /(?:^|\n)\s*(?:câu\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:câu\s*(\d{1,4})[^0-9])/i, // Decomposed accent
    /(?:^|\n)\s*(?:c©u\s*(\d{1,4})[^0-9])/i, // TCVN3 encoding
    /(?:^|\n)\s*(?:ca‚u\s*(\d{1,4})[^0-9])/i, // VNI encoding
    /(?:^|\n)\s*(?:bài\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:question\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:questions\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:\[(\d{1,4})\][^0-9])/,
    /(?:^|\n)\s*(\d{1,4})\s*\[(nb)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(th)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(vd)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(vdc)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\((nb|th|vd|vdc)\)/i,
    /(?:^|\n)\s*(\d{1,4})\s*([.:])\s*[\.0-9]/,
    /(?:^|\n)\s*(\d{1,4})\s*([.:])\s*[^\s]\s*[^\s0-9]/
  ],

  // 2. Nhận diện phương án đáp án (A, B, C, D... hoặc dấu sao *A, *B...)
  ANSWER_OPTION: /(?:^|[\s|.$])(\*?[A-Ha-h])[\s|]*[.)]/g,
  ANSWER_STAR_PREFIX: /^\s*\*([A-Ha-h])/i,

  // 3. Nhận diện các phần đặc thù (GDPT 2018)
  GROUP_TRUE_FALSE: /(trắc\s*nghiệm\s*đúng[\s\/\\]*sai|đúng[\s\/\\]*sai)/i,
  GROUP_SHORT_ANSWER: /(trắc\s*nghiệm\s*trả\s*lời\s*ngắn|trả\s*lời\s*ngắn)/i,
  GROUP_ESSAY: /(tự\s*luận)/i,

  // 4. Nhận diện tiêu đề bảng đáp án cuối đề
  DAPAN_HEADER: [
    /(bảng\s*đáp\s*án)/i,
    /(đáp\s*án\s*và\s*hướng)/i,
    /(đáp\s*án\s*[.:]?\s*$)/i,
    /(answer\s*keys)/i,
    /(khóa\s*câu\s*trắc\s*nghiệm)/i,
    /(áp\s*án[^:])/i
  ],

  // 5. Điểm kết thúc đề
  END_EXAM: /(?:^|\n)\s*(?:hết|hết|het|the\s*end|\-\-ht\-\-)\s*(?:\n|$)/i,

  // 6. Tiêu đề lời giải chi tiết
  EXPLANATION: [
    /(hướng\s*dẫn\s*giải)/i,
    /(lời\s*giải)/i,
    /(giải\s*thích\s*chi\s*tiết)/i,
    /(hd:)/i,
    /(hướng\s*dẫn)/i
  ],

  // 7. Nhận diện đáp án trong lời giải (HELP_ANS_PATTERN trích từ Azota)
  HELP_ANS_PATTERNS: [
    /(?:[\s.]*chọn\s*:?\s*([A-K])[^A-Za-z0-9]*$)/i,
    /(?:[\d\s.:]*đáp\s*án\s*là\s*:?\s*([A-K])[^A-Za-z0-9]*$)/i,
    /(?:[\d\s.:]*chọn\s*đáp\s*án\s*:?\s*([A-K])[^A-Za-z0-9]*$)/i,
    /(?:[\d\s.:]*đáp\s*án\s*đúng\s*:?\s*([A-K])[^A-Za-z0-9]*$)/i,
    /(?:chọn\s*([A-K])\b)/i,
    /(?:đáp\s*án\s*([A-K])\b)/i,
    /(?:kết\s*quả\s*([A-K])\b)/i
  ],

  // 8. Nhóm câu hỏi theo ngữ cảnh (Reading comprehension, QUEST_GROUP_WITH_LIST)
  QUEST_GROUP_PATTERNS: [
    /(?:trả\s*lời\s*(?:các\s*)?(?:câu|câu\s*hỏi)\s*từ\s*(\d+)\s*đến\s*(\d+))/i,
    /(?:trả\s*lời\s*(?:các\s*)?(?:câu|câu\s*hỏi)\s*(\d+)\s*-\s*(\d+))/i,
    /(?:hoàn\s*thành\s*(?:các\s*)?(?:câu|câu\s*hỏi)\s*(\d+)\s*-\s*(\d+))/i,
    /(?:dùng\s*cho\s*(?:các\s*)?(?:câu|câu\s*hỏi)\s*(\d+)\s*đến\s*(\d+))/i,
    /(?:dựa\s*vào\s*thông\s*tin\s*sau\s*đây\s*để\s*trả\s*lời\s*(?:các\s*)?(?:câu|câu\s*hỏi)\s*từ\s*(\d+)\s*đến\s*(\d+))/i,
    /(?:read\s*(?:the)?\s*following\s*passage\s*and\s*mark.*questions?\s*(\d+)\s*(?:to|-)\s*(\d+))/i
  ],

  // 9. Placeholders đa phương tiện & công thức
  MATH_PLACEHOLDER: /\[!m:([^\]]+)\]/g,
  IMAGE_PLACEHOLDER: /\[img:([^\]]+)\]/g,
  TABLE_BLOCK: /\[\*\s*([\s\S]+?)\s*\*\]/g
};

/**
 * Trích xuất mức độ nhận thức (NB, TH, VD, VDC) theo chuẩn Azota
 */
export function extractCognitiveLevel(text: string): CognitiveLevel | undefined {
  if (!text) return undefined;
  if (/\[\s*(?:VDC|HARDEST)\s*\]|vận\s*dụng\s*cao/i.test(text)) return 'VDC';
  if (/\[\s*(?:VD|HARD)\s*\]|vận\s*dụng/i.test(text)) return 'VD';
  if (/\[\s*(?:TH|MEDIUM)\s*\]|thông\s*hiểu/i.test(text)) return 'TH';
  if (/\[\s*(?:NB|EASY)\s*\]|nhận\s*biết/i.test(text)) return 'NB';

  // Dạng ngoặc tròn: (NB), (TH), (VD), (VDC)
  if (/\(\s*(?:VDC|HARDEST)\s*\)/i.test(text)) return 'VDC';
  if (/\(\s*(?:VD|HARD)\s*\)/i.test(text)) return 'VD';
  if (/\(\s*(?:TH|MEDIUM)\s*\)/i.test(text)) return 'TH';
  if (/\(\s*(?:NB|EASY)\s*\)/i.test(text)) return 'NB';

  return undefined;
}

/**
 * Trích xuất điểm số gán cho câu hỏi nếu có (ví dụ: [1.0 điểm], (0.25 đ), [1pt], [2 điểm])
 */
export function extractPointScore(text: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/[\[\(]\s*(\d+(?:[.,]\d+)?)\s*(?:đ|điểm|diem|pt|pts|marks?)\s*[\]\)]/i);
  if (match) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0 && val <= 100) {
      return val;
    }
  }
  return undefined;
}

/**
 * Trích xuất khoảng câu hỏi cho nhóm câu hỏi (Dùng cho câu 1 đến câu 5 -> { start: 1, end: 5 })
 */
export function extractQuestionGroupRange(text: string): { start: number; end: number } | undefined {
  if (!text) return undefined;
  for (const pattern of AZOTA_PATTERNS.QUEST_GROUP_PATTERNS) {
    const m = text.match(pattern);
    if (m && m[1] && m[2]) {
      const start = parseInt(m[1], 10);
      const end = parseInt(m[2], 10);
      if (start > 0 && end >= start) {
        return { start, end };
      }
    }
  }
  return undefined;
}

/**
 * Trích xuất đáp án từ lời giải chi tiết theo các mẫu biểu thức chính thức của Azota
 */
export function extractAnswerFromExplanationText(text: string): string | undefined {
  if (!text) return undefined;
  for (const p of AZOTA_PATTERNS.HELP_ANS_PATTERNS) {
    const m = text.match(p);
    if (m && m[1]) {
      return m[1].toUpperCase();
    }
  }
  return undefined;
}

/**
 * Kiểm tra xem phương án có phải loại cố định vị trí khi trộn không
 * Tích hợp toàn diện 15 mẫu MULTIPLE_ANS_PATTERN từ hệ thống Azota Production:
 * - "Tất cả các đáp án trên", "Cả A và B đều đúng", "Cả 3 đáp án", "Không có đáp án nào đúng"...
 */
export function isOptionOrderFixed(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase().trim();

  // Kiểm tra các mẫu từ MULTIPLE_ANS_PATTERN
  const azotaMultiPatterns = [
    /^[a-h]\s*và\s*[a-h]\s*đều/i,
    /^cả\s*[a-h]\s*và\s*[a-h]/i,
    /^cả\s*[a-h]\s*,\s*[a-h]/i,
    /^cả\s*3\s*đáp\s*án/i,
    /^tất cả (?:các )?(?:đáp án|phương án|ý)?(?:\s*trên)?\s*đều (?:đúng|sai)/i,
    /^tất cả (?:các )?(?:đáp án|phương án|ý)(?:\s*trên)?/i,
    /^không có (?:đáp án|phương án) nào (?:đúng|sai)?/i,
    /^cả hai (?:đáp án|phương án) đều (?:đúng|sai)/i,
    /^đáp án khác/i,
    /^tất cả đều đúng/i,
    /^tất cả đều sai/i
  ];

  for (const p of azotaMultiPatterns) {
    if (p.test(lower)) return true;
  }

  return false;
}
