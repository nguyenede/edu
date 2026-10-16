import { CognitiveLevel } from './types';

export const AZOTA_PATTERNS = {
  // 1. Nhận diện đầu câu hỏi
  QUESTION: [
    /(?:^|\n)\s*(?:câu\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:bài\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:question\s*(\d{1,4})[^0-9])/i,
    /(?:^|\n)\s*(?:\[(\d{1,4})\][^0-9])/,
    /(?:^|\n)\s*(\d{1,4})\s*\[(nb)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(th)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(vd)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*\[(vdc)\]/i,
    /(?:^|\n)\s*(\d{1,4})\s*([.:])\s*[\.0-9]/,
    /(?:^|\n)\s*(\d{1,4})\s*([.:])\s*[^\s]\s*[^\s0-9]/
  ],

  // 2. Nhận diện phương án đáp án (A, B, C, D... hoặc dấu sao *A, *B...)
  ANSWER_OPTION: /(?:^|[\s|.$])(\*?[A-Ha-h])[\s|]*[.)]/g,
  ANSWER_STAR_PREFIX: /^\s*\*([A-Ha-h])/i,

  // 3. Nhận diện các phần đặc thù (GDPT 2018)
  GROUP_TRUE_FALSE: /(trắc\s*nghiệm\s*đúng[\s\/\\]*sai|đúng[\s\/\\]*sai)/i,
  GROUP_SHORT_ANSWER: /(trắc\s*nghiệm\s*trả\s*lời\s*ngắn|trả\s*lời\s*ngắn)/i,

  // 4. Nhận diện tiêu đề bảng đáp án cuối đề
  DAPAN_HEADER: [
    /(bảng\s*đáp\s*án)/i,
    /(đáp\s*án\s*và\s*hướng)/i,
    /(đáp\s*án\s*[.:]?\s*$)/i,
    /(answer\s*keys)/i,
    /(khóa\s*câu\s*trắc\s*nghiệm)/i
  ],

  // 5. Điểm kết thúc đề
  END_EXAM: /(?:^|\n)\s*(?:hết|the\s*end|\-\-ht\-\-)\s*(?:\n|$)/i,

  // 6. Tiêu đề lời giải chi tiết
  EXPLANATION: [
    /(hướng\s*dẫn\s*giải)/i,
    /(lời\s*giải)/i,
    /(giải\s*thích\s*chi\s*tiết)/i,
    /(hd:)/i
  ],

  // 7. Placeholders đa phương tiện & công thức
  MATH_PLACEHOLDER: /\[!m:([^\]]+)\]/g,
  IMAGE_PLACEHOLDER: /\[img:([^\]]+)\]/g,
  TABLE_BLOCK: /\[\*\s*([\s\S]+?)\s*\*\]/g
};

/**
 * Trích xuất mức độ nhận thức (NB, TH, VD, VDC) nếu có gắn trong câu hỏi
 */
export function extractCognitiveLevel(text: string): CognitiveLevel | undefined {
  if (!text) return undefined;
  if (/\[\s*VDC\s*\]|vận\s*dụng\s*cao/i.test(text)) return 'VDC';
  if (/\[\s*VD\s*\]|vận\s*dụng/i.test(text)) return 'VD';
  if (/\[\s*TH\s*\]|thông\s*hiểu/i.test(text)) return 'TH';
  if (/\[\s*NB\s*\]|nhận\s*biết/i.test(text)) return 'NB';
  return undefined;
}

/**
 * Kiểm tra xem phương án có phải loại cố định vị trí khi trộn không
 * (Ví dụ: "Tất cả các đáp án trên", "Cả A và B đều đúng"...)
 */
export function isOptionOrderFixed(content: string): boolean {
  if (!content) return false;
  const lower = content.toLowerCase().trim();
  return (
    /tất cả (?:các )?(?:đáp án|phương án|ý)?(?:\s*trên)?\s*đều (?:đúng|sai)/i.test(lower) ||
    /tất cả (?:các )?(?:đáp án|phương án|ý)(?:\s*trên)?/i.test(lower) ||
    /cả [a-d],?\s*[a-d](?:,?\s*và\s*[a-d])? đều (?:đúng|sai)/i.test(lower) ||
    /cả [a-d]\s*và\s*[a-d]/i.test(lower) ||
    /không có (?:đáp án|phương án) nào (?:đúng|sai)/i.test(lower) ||
    /cả hai (?:đáp án|phương án) đều (?:đúng|sai)/i.test(lower) ||
    /đáp án khác/i.test(lower)
  );
}
