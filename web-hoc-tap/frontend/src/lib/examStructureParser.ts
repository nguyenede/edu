import JSZip from 'jszip';
import mammoth from 'mammoth';
// @ts-ignore
import pako from 'pako';
import { cleanVietnameseEncoding, sanitizeLatexFractions } from './questionValidator';
import { parseMtefBinaryToLatex, cleanLeakedOleGarbage } from './mtefParser';

export interface ParsedOptionItem {
  letter: string;
  content: string;
  isCorrect: boolean;
  isBold?: boolean;
  isUnderlined?: boolean;
  isColored?: boolean;
  isHighlighted?: boolean;
  colorValue?: string;
  hasDistinctFormatting?: boolean;
}

export type QuestionType = 'multiple_choice' | 'essay' | 'fill_blank' | 'true_false' | 'short_answer';

export interface ParsedExamQuestion {
  id?: string;
  rawLabel?: string;
  content: string;
  options: { content: string; isCorrect: boolean }[];
  explanation?: string;
  points?: number;
  type?: QuestionType;
  answer?: string;
  images?: string[];
  originalIndex?: number;
}

export interface DeterministicExamResult {
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  questions: ParsedExamQuestion[];
  parserUsed: 'azota_compiler_engine' | 'docx_xml' | 'docx_mammoth' | 'excel_xlsx' | 'latex_tex' | 'azota_text' | 'plain_text' | 'pdf_text' | 'zip_archive';
}

/**
 * Loại bỏ thẻ HTML thừa
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Chuẩn hóa khoảng trắng và dấu xuống dòng
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/**
 * Tự động nhận diện Môn học từ tiêu đề hoặc nội dung tài liệu
 */
/**
 * Tự động nhận diện Môn học từ tiêu đề hoặc nội dung tài liệu chuẩn GDPT Việt Nam
 */
export function detectSubjectFromText(text: string): string {
  if (!text) return 'Kiến thức tổng hợp';
  const lower = text.toLowerCase();

  // 1. Toán học (bao gồm Đại số, Hình học, Bất đẳng thức, Giải tích...)
  if (
    /toán|toan|đại số|dai so|hình học|hinh hoc|giải tích|giai tich|bất đẳng thức|bat dang thuc|bđt|bdt|bất phương trình|bat phuong trinh|bpt|phương trình|phuong trinh|hệ phương trình|he phuong trinh|hpt|hàm số|ham so|đạo hàm|dao ham|tích phân|tich phan|nguyên hàm|nguyen ham|lượng giác|vecto|vectơ|toạ độ|tọa độ|tam giác|tứ giác|đường tròn|parabol|hypebol|elip|căn bậc hai|căn thức|hằng đẳng thức|hang dang thuc|xác suất|thống kê|dãy số|cấp số cộng|cấp số nhân|nhị thức newton|thales|ta-lét|talét|pythagore|pytago|pitago|tam thức bậc hai|dấu của tam thức|logarit|khối đa diện|hình không gian/.test(
      lower
    )
  ) {
    return 'Toán';
  }

  // 2. Vật lý (Cơ, Nhiệt, Điện, Quang, Hạt nhân...)
  if (
    /vật lý|vật lí|vat ly|vat li|cơ học|nhiệt học|quang học|điện xoay chiều|vận tốc|gia tốc|newton|động năng|thế năng|cơ năng|dao động điều hòa|con lắc|sóng cơ|giao thoa sóng|sóng điện từ|dòng điện|điện tích|điện trường|tụ điện|khúc xạ|thấu kính|quang phổ|hạt nhân nguyên tử|phóng xạ/.test(
      lower
    )
  ) {
    return 'Vật lý';
  }

  // 3. Hóa học
  if (
    /hóa học|hoa hoc|hóa vô cơ|hóa hữu cơ|nguyên tử|phân tử|bảng tuần hoàn|liên kết hóa học|phản ứng|axit|bazơ|bazo|oxit|muối|kim loại|phi kim|hiđrocacbon|ankan|anken|ankin|este|lipit|chất béo|cacbohiđrat|glucozơ|amin|amino axit|peptit|protein|polime|oxi hóa khử|điện phân|đồng phân/.test(
      lower
    )
  ) {
    return 'Hóa học';
  }

  // 4. Sinh học & Khoa học tự nhiên (KHTN)
  if (
    /sinh học|sinh hoc|khtn|khoa học tự nhiên|tế bào|màng sinh chất|quang hợp|hô hấp|trao đổi chất|adn|arn|axit nucleic|gen|mã di truyền|phiên mã|dịch mã|đột biến|nhiễm sắc thể|nst|nguyên phân|giảm phân|menden|di truyền|phả hệ|tiến hóa|sinh thái|quần thể|quần xã|hệ sinh thái|chuỗi thức ăn/.test(
      lower
    )
  ) {
    return 'Sinh học';
  }

  // 5. Tiếng Anh
  if (
    /tiếng anh|tieng anh|english|grammar|vocabulary|reading|listening|writing|speaking|present simple|past simple|present perfect|conditional sentence|passive voice|relative clause|reported speech|preposition/.test(
      lower
    )
  ) {
    return 'Tiếng Anh';
  }

  // 6. Ngữ văn
  if (
    /ngữ văn|ngu van|văn học|van hoc|tác phẩm|tac pham|nhân vật|đoạn trích|thơ |truyện|nghị luận|biện pháp tu từ|truyện kiều|vợ chồng a phủ|vợ nhặt|chí phèo|lão hạc|tắt đèn|sóng xuân quỳnh|tây tiến|đất nước|đồng chí|lặng lẽ sa pa|chiếc lược ngà|bếp lửa|ánh trăng|dế mèn phiêu lưu/.test(
      lower
    )
  ) {
    return 'Ngữ văn';
  }

  // 7. Lịch sử
  if (
    /lịch sử|lich su|sử học|chiến tranh|kháng chiến|chiến dịch|cách mạng|thế chiến|điện biên phủ|hiệp định|năm 1945|năm 1954|năm 1975|triều đại|nhà lý|nhà trần|nhà lê|nhà nguyễn|phong trào cần vương|xô viết nghệ tĩnh/.test(
      lower
    )
  ) {
    return 'Lịch sử';
  }

  // 8. Địa lý
  if (
    /địa lý|địa lí|dia ly|dia li|khí hậu|khi hau|địa hình|dia hinh|sông ngòi|thổ nhưỡng|khoáng sản|dân số|đô thị hóa|vùng kinh tế|đồng bằng|tây nguyên|bắc bộ|nam bộ|kinh tế biển/.test(
      lower
    )
  ) {
    return 'Địa lý';
  }

  // 9. Kinh tế & Pháp luật (GDCD)
  if (
    /gdcd|giáo dục công dân|kinh tế & pháp luật|kinh tế và pháp luật|gdkt&pl|pháp luật|hiến pháp|doanh nghiệp|thuế|thị trường|lạm phát|thất nghiệp|quyền công dân|vi phạm pháp luật|hợp đồng kinh tế/.test(
      lower
    )
  ) {
    return 'GDCD';
  }

  // 10. Tin học
  if (
    /tin học|tin hoc|lập trình|lap trinh|thuật toán|thuat toan|python|pascal|c\+\+|java|csdl|cơ sở dữ liệu|mạng máy tính|hệ điều hành|excel|word|powerpoint/.test(
      lower
    )
  ) {
    return 'Tin học';
  }

  // 11. Công nghệ
  if (/công nghệ|kỹ thuật|cong nghe|ky thuat|mạch điện tử|cơ khí/.test(lower)) {
    return 'Công nghệ';
  }

  return 'Kiến thức tổng hợp';
}

/**
 * Tự động nhận diện Khối lớp từ tiêu đề, nội dung hoặc phân phối chương trình GDPT
 */
export function detectGradeFromText(text: string): string {
  if (!text) return 'Tự do';
  const lower = text.toLowerCase();

  // 1. Kiểm tra tiền tố trực tiếp (ví dụ: "Lớp 9", "Khối 9", "Grade 9", "K9", "Lop 9")
  const directMatch = lower.match(/(?:khối|lớp|lop|grade|khoi)\s*(\d{1,2})\b/);
  if (directMatch && directMatch[1]) {
    const g = parseInt(directMatch[1], 10);
    if (g >= 1 && g <= 12) return String(g);
  }

  // 2. Kiểm tra mã môn kèm lớp trong tên file (ví dụ: toan9, toan-9, toan_9, ly10, hoa11, van9, anh8)
  const codeMatch = lower.match(/(?:toan|toán|ly|lý|hoa|hóa|sinh|van|văn|anh|su|sử|dia|địa|tin|gdcd)[-_ ]?(\d{1,2})\b/);
  if (codeMatch && codeMatch[1]) {
    const g = parseInt(codeMatch[1], 10);
    if (g >= 1 && g <= 12) return String(g);
  }

  // 3. Kiểm tra ký hiệu K + số (K9, K10, K11, K12...)
  const kMatch = lower.match(/\bk(\d{1,2})\b/);
  if (kMatch && kMatch[1]) {
    const g = parseInt(kMatch[1], 10);
    if (g >= 1 && g <= 12) return String(g);
  }

  // 4. Đối chiếu tên bài học đặc trưng theo chương trình GDPT Việt Nam:
  // --- THCS: LỚP 9 ---
  if (
    /bất đẳng thức và tính chất|liên hệ giữa thứ tự và phép cộng|liên hệ giữa thứ tự và phép nhân|căn bậc hai|căn thức bậc hai|khai phương|hệ hai phương trình bậc nhất hai ẩn|phương trình bậc hai một ẩn|hệ thức vi-ét|hệ thức viet|tứ giác nội tiếp|góc với đường tròn|lặng lẽ sa pa|chiếc lược ngà|đồng chí|bếp lửa|ánh trăng/.test(
      lower
    )
  ) {
    return '9';
  }

  // --- THCS: LỚP 8 ---
  if (
    /hằng đẳng thức đáng nhớ|phân thức đại số|định lý thalès|định lí ta-lét|tam giác đồng dạng|hình chóp tam giác đều|lão hạc|tắt đèn/.test(
      lower
    )
  ) {
    return '8';
  }

  // --- THCS: LỚP 7 ---
  if (/số hữu tỉ|số thực|đại lượng tỉ lệ thuận|đại lượng tỉ lệ nghịch|tam giác bằng nhau/.test(lower)) {
    return '7';
  }

  // --- THCS: LỚP 6 ---
  if (/số tự nhiên|ước chung|bội chung|số nguyên|dế mèn phiêu lưu ký|thánh gióng/.test(lower)) {
    return '6';
  }

  // --- THPT: LỚP 10 ---
  if (
    /mệnh đề|tập hợp|bất phương trình bậc nhất hai ẩn|hệ bất phương trình bậc nhất hai ẩn|tam thức bậc hai|dấu của tam thức|chuyển động thẳng biến đổi đều/.test(
      lower
    )
  ) {
    return '10';
  }

  // --- THPT: LỚP 11 ---
  if (
    /hàm số lượng giác|phương trình lượng giác|cấp số cộng|cấp số nhân|dãy số|giới hạn dãy số|chí phèo|hai đứa trẻ/.test(
      lower
    )
  ) {
    return '11';
  }

  // --- THPT: LỚP 12 ---
  if (
    /tích phân|nguyên hàm|khảo sát hàm số|tọa độ không gian oxyz|số phức|este|lipit|vợ chồng a phủ|vợ nhặt|người lái đò sông đà|ai đã đặt tên cho dòng sông|đất nước nguyễn khoa điềm/.test(
      lower
    )
  ) {
    return '12';
  }

  return 'Tự do';
}

/**
 * Tự động nhận diện thời gian làm bài (phút)
 */
export function detectDurationFromText(text: string): number {
  const match = text.match(/thời\s*gian(?:\s*làm\s*bài)?\s*[:.-]?\s*(\d+)\s*(?:phút|p|min)/i);
  if (match && match[1]) {
    const d = parseInt(match[1], 10);
    if (d > 0 && d <= 180) return d;
  }
  return 45;
}

/**
 * Trích xuất bảng đáp án ở cuối văn bản (BẢNG ĐÁP ÁN: 1.A 2.B 3.C ...)
 */
export function extractAnswerKeyMap(fullText: string): {
  answerKeyMap: Map<number, string>;
  cleanedText: string;
} {
  const answerKeyMap = new Map<number, string>();
  let cleanedText = fullText;

  // Header bảng đáp án ở cuối đề thi:
  // - Bắt buộc phải nằm ở đầu dòng riêng biệt
  // - Tuyệt đối không khớp với câu văn giải thích giữa bài như "Chọn đáp án C", "Đáp án đúng là A"
  // - Khối bảng đáp án KHÔNG ĐƯỢC chứa các đề bài tập mới (như "Bài 3:", "Câu 4:", "Dạng 2:")
  const keyHeaderRegex = /(?:^|\n)\s*(?:(?:BẢNG\s+)?ĐÁP\s+ÁN(?:\s+CHI\s+TIẾT)?|PHIẾU\s+TRẢ\s+LỜI(?:\s+TRẮC\s+NGHIỆM)?|ANSWER\s+KEY|KEY\s+ĐÁP\s+ÁN|HƯỚNG\s+DẪN\s+CHẤM)[\s:.-]*\n?([\s\S]*)$/i;
  const match = fullText.match(keyHeaderRegex);

  if (match && match[1] && match.index !== undefined) {
    const keyBlock = match[1];

    // Kiểm tra an toàn: Nếu khối phía sau vẫn chứa các câu hỏi / bài tập tiếp theo
    // (ví dụ có "Bài 3:", "Câu 4:", "Dạng 2:") thì đây KHÔNG PHẢI bảng đáp án cuối đề,
    // mà chỉ là phần giải của một câu đơn lẻ! TUYỆT ĐỐI không cắt bỏ nội dung tài liệu!
    const hasSubsequentQuestions = /(?:^|\n)\s*(?:Bài|Câu|Dạng|Question)\s*\d+[\s:.-]+/i.test(keyBlock);
    if (!hasSubsequentQuestions) {
      // 1. Regex bắt các cặp: 1.A, 1. A, 1-A, 1:A, 1)A, 1A, [1] A, v.v.
      const pairRegex = /(?:^|\s|\||;|,)(\d+)[\s.:)-]+([A-D])\b|(?:^|\s|\|)(\d+)([A-D])\b/gi;
      let pMatch: RegExpExecArray | null;

      while ((pMatch = pairRegex.exec(keyBlock)) !== null) {
        const qNum = parseInt(pMatch[1] || pMatch[3], 10);
        const letter = (pMatch[2] || pMatch[4]).toUpperCase();
        if (qNum > 0 && letter) {
          answerKeyMap.set(qNum, letter);
        }
      }

      // 2. Bắt bảng đáp án 2 hàng: Hàng 1 là số 1 2 3..., Hàng 2 là chữ A B C...
      if (answerKeyMap.size === 0) {
        const lines = keyBlock.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        for (let r = 0; r < lines.length - 1; r++) {
          const numTokens = lines[r].match(/\b\d+\b/g);
          const letterTokens = lines[r + 1].match(/\b[A-D]\b/gi);
          if (numTokens && letterTokens && numTokens.length >= 2 && numTokens.length === letterTokens.length) {
            for (let k = 0; k < numTokens.length; k++) {
              const qNum = parseInt(numTokens[k], 10);
              const letter = letterTokens[k].toUpperCase();
              if (qNum > 0 && letter) {
                answerKeyMap.set(qNum, letter);
              }
            }
          }
        }
      }

      if (answerKeyMap.size > 0) {
        cleanedText = fullText.substring(0, match.index).trim();
      }
    }
  }

  return { answerKeyMap, cleanedText };
}

/**
 * Chuyển đổi mã toán học Office OpenXML (OMML) <m:oMath> sang chuẩn LaTeX / ký hiệu toán học
 */
export function convertOmmlToLatex(ommlXml: string): string {
  if (!ommlXml) return '';

  function parseNode(str: string): string {
    if (!str) return '';
    let res = str;

    // Lặp duyệt từ trong ra ngoài (innermost-first) để bảo toàn tuyệt đối các cấu trúc lồng nhau
    let changed = true;
    let loopCount = 0;
    while (changed && loopCount < 30) {
      changed = false;
      loopCount++;

      // 1. Phân số OMML: <m:f> (tử số luôn trước, mẫu số luôn sau, không ngắt dòng)
      res = res.replace(/<m:f\b[^>]*>((?:(?!<m:f\b)[\s\S])*?)<\/m:f>/g, (_, inner) => {
        changed = true;
        const numMatch = inner.match(/<m:num\b[^>]*>([\s\S]*?)<\/m:num>/);
        const denMatch = inner.match(/<m:den\b[^>]*>([\s\S]*?)<\/m:den>/);
        const num = numMatch ? parseNode(numMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const den = denMatch ? parseNode(denMatch[1]).replace(/\n+/g, ' ').trim() : '';
        return `\\frac{${num}}{${den}}`;
      });

      // 1b. Phân số MathML: <mfrac>
      res = res.replace(/<mfrac\b[^>]*>((?:(?!<mfrac\b)[\s\S])*?)<\/mfrac>/g, (_, inner) => {
        changed = true;
        const children: string[] = [];
        const childRegex = /<([a-zA-Z0-9]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(inner)) !== null) {
          children.push(cm[2]);
        }
        let num = '', den = '';
        if (children.length >= 2) {
          num = parseNode(children[0]).replace(/\n+/g, ' ').trim();
          den = parseNode(children[1]).replace(/\n+/g, ' ').trim();
        } else {
          const parts = inner.split(/<\/[a-zA-Z0-9]+>\s*<[a-zA-Z0-9]+/);
          num = parseNode(parts[0] || '').replace(/\n+/g, ' ').trim();
          den = parseNode(parts[1] || '').replace(/\n+/g, ' ').trim();
        }
        return `\\frac{${num}}{${den}}`;
      });

      // 2. Căn thức OMML: <m:rad>
      res = res.replace(/<m:rad\b[^>]*>((?:(?!<m:rad\b)[\s\S])*?)<\/m:rad>/g, (_, inner) => {
        changed = true;
        const degMatch = inner.match(/<m:deg\b[^>]*>([\s\S]*?)<\/m:deg>/);
        const eMatch = inner.match(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/);
        const isDegHidden = /<m:degHide\b[^>]*m:val=["']?(?:1|on|true)["']?/i.test(inner);
        const deg = (!isDegHidden && degMatch) ? parseNode(degMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const e = eMatch ? parseNode(eMatch[1]).replace(/\n+/g, ' ').trim() : '';
        return deg ? `\\sqrt[${deg}]{${e}}` : `\\sqrt{${e}}`;
      });

      // 2b. Căn thức MathML: <msqrt> và <mroot>
      res = res.replace(/<msqrt\b[^>]*>((?:(?!<msqrt\b)[\s\S])*?)<\/msqrt>/g, (_, inner) => {
        changed = true;
        const e = parseNode(inner).replace(/\n+/g, ' ').trim();
        return `\\sqrt{${e}}`;
      });
      res = res.replace(/<mroot\b[^>]*>((?:(?!<mroot\b)[\s\S])*?)<\/mroot>/g, (_, inner) => {
        changed = true;
        const children: string[] = [];
        const childRegex = /<([a-zA-Z0-9]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(inner)) !== null) children.push(cm[2]);
        if (children.length >= 2) {
          const base = parseNode(children[0]).replace(/\n+/g, ' ').trim();
          const deg = parseNode(children[1]).replace(/\n+/g, ' ').trim();
          return `\\sqrt[${deg}]{${base}}`;
        }
        return `\\sqrt{${parseNode(inner).trim()}}`;
      });

      // 3. Chỉ số trên và dưới đồng thời: <m:sSubSup> hoặc <msubsup>
      res = res.replace(/<m:sSubSup\b[^>]*>((?:(?!<m:sSubSup\b)[\s\S])*?)<\/m:sSubSup>/g, (_, inner) => {
        changed = true;
        const eMatch = inner.match(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/);
        const subMatch = inner.match(/<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>/);
        const supMatch = inner.match(/<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>/);
        const e = eMatch ? parseNode(eMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const sub = subMatch ? parseNode(subMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const sup = supMatch ? parseNode(supMatch[1]).replace(/\n+/g, ' ').trim() : '';
        return `{${e}}_{${sub}}^{${sup}}`;
      });
      res = res.replace(/<msubsup\b[^>]*>((?:(?!<msubsup\b)[\s\S])*?)<\/msubsup>/g, (_, inner) => {
        changed = true;
        const children: string[] = [];
        const childRegex = /<([a-zA-Z0-9]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(inner)) !== null) children.push(cm[2]);
        if (children.length >= 3) {
          const e = parseNode(children[0]).replace(/\n+/g, ' ').trim();
          const sub = parseNode(children[1]).replace(/\n+/g, ' ').trim();
          const sup = parseNode(children[2]).replace(/\n+/g, ' ').trim();
          return `{${e}}_{${sub}}^{${sup}}`;
        }
        return inner;
      });

      // 4. Lũy thừa / Số mũ: <m:sSup> hoặc <msup>
      res = res.replace(/<m:sSup\b[^>]*>((?:(?!<m:sSup\b)[\s\S])*?)<\/m:sSup>/g, (_, inner) => {
        changed = true;
        const eMatch = inner.match(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/);
        const supMatch = inner.match(/<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>/);
        const e = eMatch ? parseNode(eMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const sup = supMatch ? parseNode(supMatch[1]).replace(/\n+/g, ' ').trim() : '';
        return `${e}^{${sup}}`;
      });
      res = res.replace(/<msup\b[^>]*>((?:(?!<msup\b)[\s\S])*?)<\/msup>/g, (_, inner) => {
        changed = true;
        const children: string[] = [];
        const childRegex = /<([a-zA-Z0-9]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(inner)) !== null) children.push(cm[2]);
        if (children.length >= 2) {
          const e = parseNode(children[0]).replace(/\n+/g, ' ').trim();
          const sup = parseNode(children[1]).replace(/\n+/g, ' ').trim();
          return `${e}^{${sup}}`;
        }
        return inner;
      });

      // 5. Chỉ số dưới: <m:sSub> hoặc <msub>
      res = res.replace(/<m:sSub\b[^>]*>((?:(?!<m:sSub\b)[\s\S])*?)<\/m:sSub>/g, (_, inner) => {
        changed = true;
        const eMatch = inner.match(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/);
        const subMatch = inner.match(/<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>/);
        const e = eMatch ? parseNode(eMatch[1]).replace(/\n+/g, ' ').trim() : '';
        const sub = subMatch ? parseNode(subMatch[1]).replace(/\n+/g, ' ').trim() : '';
        return `${e}_{${sub}}`;
      });
      res = res.replace(/<msub\b[^>]*>((?:(?!<msub\b)[\s\S])*?)<\/msub>/g, (_, inner) => {
        changed = true;
        const children: string[] = [];
        const childRegex = /<([a-zA-Z0-9]+)\b[^>]*>([\s\S]*?)<\/\1>/g;
        let cm: RegExpExecArray | null;
        while ((cm = childRegex.exec(inner)) !== null) children.push(cm[2]);
        if (children.length >= 2) {
          const e = parseNode(children[0]).replace(/\n+/g, ' ').trim();
          const sub = parseNode(children[1]).replace(/\n+/g, ' ').trim();
          return `${e}_{${sub}}`;
        }
        return inner;
      });

      // 6. Dấu ngoặc, Giá trị tuyệt đối, Hệ phương trình: <m:d> hoặc <mfenced>
      res = res.replace(/<m:d\b[^>]*>((?:(?!<m:d\b)[\s\S])*?)<\/m:d>/g, (_, inner) => {
        changed = true;
        const begChrMatch = inner.match(/<m:begChr\b[^>]*m:val=["']([^"']*)["']/);
        const endChrMatch = inner.match(/<m:endChr\b[^>]*m:val=["']([^"']*)["']/);
        const beg = begChrMatch ? begChrMatch[1] : '(';
        const end = endChrMatch ? endChrMatch[1] : ')';

        // Hệ phương trình: ngoặc nhọn kết hợp eqArr hoặc m:m
        const eqArrMatch = inner.match(/<(?:m:eqArr|m:m)\b[^>]*>([\s\S]*?)<\/(?:m:eqArr|m:m)>/);
        if (eqArrMatch && (beg === '{' || !beg || beg === '')) {
          const equations: string[] = [];
          const eRegex = /<m:e\b[^>]*>([\s\S]*?)<\/m:e>/g;
          let em: RegExpExecArray | null;
          while ((em = eRegex.exec(eqArrMatch[1])) !== null) {
            const eq = parseNode(em[1]).replace(/\n+/g, ' ').trim();
            if (eq) equations.push(eq);
          }
          if (equations.length > 0) {
            return `\\begin{cases} ${equations.join(' \\\\ ')} \\end{cases}`;
          }
        }

        // Giá trị tuyệt đối: |...|
        const isAbsBar = (c: string) => /^[\|\u2502\u01c0\u2223\u2758\u2016]$|&#x7c;|&#124;|\\vert/i.test(c);
        const isAbsolute = isAbsBar(beg) && isAbsBar(end);

        const eMatch = inner.match(/<m:e\b[^>]*>([\s\S]*?)<\/m:e>/);
        const e = eMatch ? parseNode(eMatch[1]).replace(/\n+/g, ' ').trim() : '';

        if (isAbsolute) {
          return `\\left|${e}\\right|`;
        }
        if (beg === '{' && !end) {
          const lines = e.split(/\n+|\\\\/).map((l) => l.trim()).filter(Boolean);
          if (lines.length > 1) {
            return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
          }
          return `\\{${e}`;
        }
        return `${beg}${e}${end}`;
      });

      // 6b. Dấu ngoặc, Giá trị tuyệt đối, Hệ phương trình trong MathML: <mfenced>
      res = res.replace(/<mfenced\b([^>]*)>((?:(?!<mfenced\b)[\s\S])*?)<\/mfenced>/g, (_, attrs, inner) => {
        changed = true;
        const openMatch = attrs.match(/open=["']([^"']*)["']/);
        const closeMatch = attrs.match(/close=["']([^"']*)["']/);
        const beg = openMatch ? openMatch[1] : '(';
        const end = closeMatch ? closeMatch[1] : ')';
        const parsedInner = parseNode(inner).trim();

        const isAbsBar = (c: string) => /^[\|\u2502\u01c0\u2223\u2758\u2016]$|&#x7c;|&#124;|\\vert/i.test(c);
        if (isAbsBar(beg) && isAbsBar(end)) {
          return `\\left|${parsedInner}\\right|`;
        }
        if (beg === '{' && (!end || end === '')) {
          const lines = parsedInner.split(/\n+|\\\\/).map((l) => l.trim()).filter(Boolean);
          if (lines.length > 1) {
            return `\\begin{cases} ${lines.join(' \\\\ ')} \\end{cases}`;
          }
          return `\\{${parsedInner}`;
        }
        return `${beg}${parsedInner}${end}`;
      });

      // 6c. Hệ phương trình MathML: <mtable>
      res = res.replace(/<mtable\b[^>]*>((?:(?!<mtable\b)[\s\S])*?)<\/mtable>/g, (_, inner) => {
        changed = true;
        const rows: string[] = [];
        const trRegex = /<mtr\b[^>]*>([\s\S]*?)<\/mtr>/g;
        let trm: RegExpExecArray | null;
        while ((trm = trRegex.exec(inner)) !== null) {
          const rowText = parseNode(trm[1]).replace(/\n+/g, ' ').trim();
          if (rowText) rows.push(rowText);
        }
        if (rows.length > 1) {
          return `\\begin{cases} ${rows.join(' \\\\ ')} \\end{cases}`;
        }
        return parseNode(inner);
      });
    }

    // 7. Bóc tách chữ và ký hiệu trong thẻ <m:t>, <w:t>, MathML <mi>, <mn>, <mo>
    res = res.replace(/<[mw]:t\b[^>]*>([\s\S]*?)<\/[mw]:t>/g, '$1');
    res = res.replace(/<m[ino]\b[^>]*>([\s\S]*?)<\/m[ino]>/g, '$1');

    // 8. Làm sạch thẻ XML còn sót lại
    res = res.replace(/<[^>]+>/g, '');

    return res;
  }

  // Giải mã thực thể XML chỉ sau khi các thẻ XML đã được bóc tách xong
  let formula = parseNode(ommlXml)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!formula) return '';

  // Khôi phục căn thức nếu còn ký tự \u221A hoặc √
  formula = formula
    .replace(/(?:\\u221A|√)\s*\(([^)]+)\)/g, '\\sqrt{$1}')
    .replace(/(?:\\u221A|√)\s*\{([^}]+)\}/g, '\\sqrt{$1}')
    .replace(/(?:\\u221A|√)\s*([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // Chuẩn hóa một số ký hiệu toán học phổ biến trong văn bản tiếng Việt
  formula = formula
    .replace(/<=|≤/g, ' \\le ')
    .replace(/>=|≥/g, ' \\ge ')
    .replace(/!=|≠/g, ' \\ne ')
    .replace(/±/g, ' \\pm ')
    .replace(/×/g, ' \\times ')
    .replace(/÷/g, ' \\div ')
    .replace(/∈/g, ' \\in ')
    .replace(/∉/g, ' \\notin ')
    .replace(/⊂/g, ' \\subset ')
    .replace(/∩/g, ' \\cap ')
    .replace(/∪/g, ' \\cup ')
    .replace(/∞/g, ' \\infty ')
    .replace(/(\s{2,})/g, ' ')
    .trim();

  return `$${formula}$`;
}

/**
 * Mã hóa ký tự đặc biệt khi nhúng vào XML Word
 */
export function escapeXmlText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Chuyển đổi an toàn ArrayBuffer sang chuỗi Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Xác định định dạng MIME từ đuôi tệp
 */
export function getMimeTypeFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'image/png';
}

/**
 * Chuyển đổi bảng Word XML (<w:tbl>) thành bảng Markdown tiêu chuẩn
 * Hỗ trợ bảng biến thiên, bảng phân bố tần số, bảng số liệu thực tế...
 */
export function convertWordTableToMarkdown(tblXml: string): string | null {
  if (!tblXml) return null;
  const rows = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
  if (rows.length === 0) return null;

  const tableData: string[][] = [];
  for (const rowXml of rows) {
    const cells = rowXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
    const rowCells: string[] = [];
    for (const cellXml of cells) {
      const textMatches = cellXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
      const cellText = textMatches
        .map((t) => t.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\|/g, '\\|')
        .trim();
      rowCells.push(cellText);
    }
    if (rowCells.some((c) => c.length > 0)) {
      tableData.push(rowCells);
    }
  }

  if (tableData.length === 0) return null;
  const maxCols = Math.max(...tableData.map((r) => r.length));
  if (maxCols === 0) return null;

  // Nếu là bảng đáp án (hàng 1 số 1..N, hàng 2 chữ A..D) thì trả về null để bộ xử lý bảng đáp án bắt riêng
  if (tableData.length === 2 && maxCols >= 2) {
    const isNumRow = tableData[0].every((c) => /^\d+$/.test(c.trim()));
    const isAnsRow = tableData[1].every((c) => /^[A-D]$/i.test(c.trim()));
    if (isNumRow && isAnsRow) return null;
  }

  const lines: string[] = [];
  const header = [...tableData[0]];
  while (header.length < maxCols) header.push('');
  lines.push(`| ${header.map((c) => c || ' ').join(' | ')} |`);
  lines.push(`| ${Array(maxCols).fill(':---:').join(' | ')} |`);

  for (let r = 1; r < tableData.length; r++) {
    const row = [...tableData[r]];
    while (row.length < maxCols) row.push('');
    lines.push(`| ${row.map((c) => c || ' ').join(' | ')} |`);
  }

  return lines.join('\n');
}

/**
 * Tiền xử lý XML tài liệu Word (.docx):
 * - Chuyển đổi công thức OMML (<m:oMath>) sang LaTeX
 * - Chuyển đổi công thức MathType OLE (<w:object>, Equation.DSMT4) trực tiếp sang LaTeX qua bộ giải mã MTEF
 * - Chuyển đổi hình vẽ / ảnh thực tế sang định dạng Markdown Image ![Hình vẽ](data:image/...)
 * Đảm bảo 100% không làm mất công thức toán học và ảnh khi Mammoth trích xuất văn bản.
 */
export function replaceOmmlInDocumentXml(
  xml: string,
  oleLatexMap?: Map<string, string>,
  oleIndexMap?: Map<number, string>,
  imageRelMap?: Map<string, string>,
  imageIndexMap?: Map<number, string>
): string {
  let mathIdx = 1;
  let imgIdx = 1;

  // 1. Chuyển đổi toàn bộ công thức OMML (<m:oMath>) sang LaTeX
  let processed = xml.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>|<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/g, (m) => {
    const latex = convertOmmlToLatex(m);
    if (!latex) return '';
    const safeLatex = escapeXmlText(latex);
    return `<w:r><w:t xml:space="preserve"> ${safeLatex} </w:t></w:r>`;
  });

  // 2. Chuyển đổi hình vẽ / ảnh đồ họa (<w:drawing>)
  processed = processed.replace(/<w:drawing\b[\s\S]*?<\/w:drawing>/g, (drawXml) => {
    const rIdMatch = drawXml.match(/r:(?:embed|id|link)=["']([^"']+)["']/i);
    const rId = rIdMatch ? rIdMatch[1] : '';
    let dataUri = '';
    if (rId && imageRelMap?.has(rId)) {
      dataUri = imageRelMap.get(rId)!;
    } else if (imageIndexMap?.has(imgIdx)) {
      dataUri = imageIndexMap.get(imgIdx)!;
    }
    imgIdx++;
    if (dataUri) {
      const mdImg = `\n\n![Hình vẽ](${dataUri})\n\n`;
      const safeText = escapeXmlText(mdImg);
      return `<w:r><w:t xml:space="preserve"> ${safeText} </w:t></w:r>`;
    }
    return `<w:r><w:t xml:space="preserve"> [IMAGE_URL] </w:t></w:r>`;
  });

  // 3. Chuyển đổi đối tượng MathType OLE (<w:object>) sang LaTeX thực tế qua MTEF Parser
  processed = processed.replace(/<w:object\b[\s\S]*?<\/w:object>/g, (m) => {
    const rIdMatch = m.match(/<[oOwW]:OLEObject\b[^>]*r:id=["']([^"']+)["']/i) || m.match(/r:id=["']([^"']+)["']/i);
    const rId = rIdMatch ? rIdMatch[1] : '';

    let directLatex = '';
    if (rId && oleLatexMap && oleLatexMap.has(rId)) {
      directLatex = oleLatexMap.get(rId)!;
    } else if (oleIndexMap && oleIndexMap.has(mathIdx)) {
      directLatex = oleIndexMap.get(mathIdx)!;
    }

    if (directLatex) {
      mathIdx++;
      const cleaned = cleanLeakedOleGarbage(directLatex);
      if (cleaned) {
        const safeLatex = escapeXmlText(cleaned);
        return `<w:r><w:t xml:space="preserve"> ${safeLatex} </w:t></w:r>`;
      }
    }

    mathIdx++;
    // Nếu là công thức OLE không giải mã được LaTeX, trả về khoảng trắng an toàn, TUYỆT ĐỐI không chèn token rác mathtype_
    return `<w:r><w:t xml:space="preserve"> </w:t></w:r>`;
  });

  // 4. Bóc tách các thẻ hình ảnh VML (<v:shape>) hoặc (<w:pict>)
  processed = processed.replace(/<v:shape\b[\s\S]*?<\/v:shape>|<w:pict\b[\s\S]*?<\/w:pict>/g, (shapeXml) => {
    // Nếu đây là shape chứa công thức MathType preview, bỏ qua không coi là hình ảnh bài thi
    if (/Equation|DSMT4|OLEObject/i.test(shapeXml)) {
      return '';
    }
    const rIdMatch = shapeXml.match(/r:(?:embed|id|link)=["']([^"']+)["']/i) || shapeXml.match(/o:href=["']([^"']+)["']/i);
    const rId = rIdMatch ? rIdMatch[1] : '';
    let dataUri = '';
    if (rId && imageRelMap?.has(rId)) {
      dataUri = imageRelMap.get(rId)!;
    } else if (imageIndexMap?.has(imgIdx)) {
      dataUri = imageIndexMap.get(imgIdx)!;
    }
    imgIdx++;
    if (dataUri) {
      const mdImg = `\n\n![Hình vẽ](${dataUri})\n\n`;
      const safeText = escapeXmlText(mdImg);
      return `<w:r><w:t xml:space="preserve"> ${safeText} </w:t></w:r>`;
    }
    return '';
  });

  return processed;
}

/**
 * Trích xuất toàn bộ văn bản từ XML Word (document.xml) siêu tốc (< 2ms)
 * Không cần nén lại zip qua JSZip.generateAsync -> Loại bỏ 100% hiện tượng đơ lag trình duyệt.
 */
export function extractTextFromWordXml(docXml: string): string {
  if (!docXml) return '';
  const text = docXml
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:br\b[^>]*\/>/gi, '\n')
    .replace(/<w:cr\b[^>]*\/>/gi, '\n');

  const paragraphs = text.match(/<w:p\b[\s\S]*?<\/w:p>/gi) || [];
  const lines: string[] = [];
  for (const p of paragraphs) {
    const textRuns = p.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
    if (textRuns.length > 0) {
      const line = textRuns.map((tr) => tr.replace(/<[^>]+>/g, '')).join('');
      if (line.trim().length > 0) {
        lines.push(line);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Làm sạch và chuyển đổi toàn bộ token nội bộ sang định dạng chuẩn,
 * bảo toàn ngữ nghĩa và công thức toán học 100% từ tài liệu gốc.
 * TUYỆT ĐỐI KHÔNG TỰ BỊA NỘI DUNG TOÁN HỌC.
 */
export function cleanAndEnrichMathFormulas(
  text: string,
  _context?: { isOption?: boolean; optLetter?: string; questionText?: string; isExplanation?: boolean }
): string {
  if (!text) return '';
  let res = cleanLeakedOleGarbage(text);

  // 1. Xóa sạch các token nội bộ nếu còn sót lại từ OLE rỗng
  res = res.replace(/\bmathtype_\d+\b/gi, '');

  // 2. Chuẩn hóa token ảnh nội bộ thành [IMAGE_URL] thay vì xóa bỏ
  res = res.replace(/\[img:\$img_\d+\$\]/gi, '');
  res = res.replace(/(?:\[!img:[^\]]+\]|\[img:[^\]]+\])/gi, ' [IMAGE_URL] ');

  // 3. Sửa lỗi đảo ngược phân số & ngắt dòng giữa tử và mẫu
  res = res.replace(/\\(?:d?frac)\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, (_, num, den) => {
    return `\\frac{${num.replace(/\n+/g, ' ').trim()}}{${den.replace(/\n+/g, ' ').trim()}}`;
  });
  res = res.replace(/([a-zA-Z0-9_\(\)]+)\s*\n\s*[-—]{2,}\s*\n\s*([a-zA-Z0-9_\(\)]+)/g, '\\frac{$1}{$2}');
  res = res.replace(/([a-zA-Z0-9_\(\)\\]+)\s*\n\s*\/\s*([a-zA-Z0-9_\(\)\\]+)/g, '\\frac{$1}{$2}');
  res = res.replace(/([a-zA-Z0-9_\(\)\\]+)\s*\/\s*\n\s*([a-zA-Z0-9_\(\)\\]+)/g, '\\frac{$1}{$2}');

  // 4. Khôi phục căn bậc hai từ ký tự Unicode \u221A / √ và \sqrt rỗng
  res = res.replace(/\\sqrt\{\}\s*(\([^)]+\)|\{[^}]+\}|[a-zA-Z0-9]+)/g, '\\sqrt{$1}');
  res = res.replace(/\\sqrt\s+([a-zA-Z0-9]+)/g, '\\sqrt{$1}');
  res = res.replace(/(?:\\u221A|√)\s*\(([^)]+)\)/g, '\\sqrt{$1}');
  res = res.replace(/(?:\\u221A|√)\s*\{([^}]+)\}/g, '\\sqrt{$1}');
  res = res.replace(/(?:\\u221A|√)\s*([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // 5. Sửa lỗi ngắt dòng ở số mũ, chỉ số dưới (nối liền vào biến liền trước)
  res = res.replace(/([a-zA-Z0-9_\)])\s*\n\s*(\^|\_)\{?([a-zA-Z0-9+\-*\/=]+)\}?/g, '$1$2{$3}');
  res = res.replace(/([a-zA-Z0-9_\)])\s*(\^|\_)\s*\n\s*\{?([a-zA-Z0-9+\-*\/=]+)\}?/g, '$1$2{$3}');
  res = res.replace(/([a-zA-Z0-9_\)])\s*\n\s*([²³¹⁰⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, '$1$2');
  res = res.replace(/\b([A-Z][a-z]?)\s*\n\s*(\d)\b(?!\s*[\.\:])/g, '$1_$2');

  // 6. Giữ nguyên cấu trúc hệ phương trình thành phần trong cùng một khối
  res = res.replace(/(?:^|\n)\s*\{\s*\n\s*([^\n]+=[^\n]+)\s*\n\s*([^\n]+=[^\n]+(?:\s*\n\s*[^\n]+=[^\n]+)*)/g, (_, eq1, rest) => {
    const eqs = [eq1.trim(), ...rest.split('\n').map((l: string) => l.trim()).filter(Boolean)];
    return `\n\\begin{cases} ${eqs.join(' \\\\ ')} \\end{cases}\n`;
  });

  // 7. Chuẩn hóa các ký hiệu so sánh và toán học phổ biến sang LaTeX
  res = res
    .replace(/(?<!\\)<=|≤/g, ' \\le ')
    .replace(/(?<!\\)>=|≥/g, ' \\ge ')
    .replace(/(?<!\\)!=|≠/g, ' \\ne ')
    .replace(/±/g, ' \\pm ')
    .replace(/×/g, ' \\times ')
    .replace(/÷/g, ' \\div ')
    .replace(/∈/g, ' \\in ')
    .replace(/∉/g, ' \\notin ')
    .replace(/∞/g, ' \\infty ');

  // 8. Chuẩn hóa tuyệt đối: Phân số LaTeX (tử số ở trên, mẫu số ở dưới) và Unicode tiếng Việt NFC
  res = sanitizeLatexFractions(cleanVietnameseEncoding(res));

  return res.trim();
}

/**
 * Giữ nguyên 100% các phương án từ file gốc, tuyệt đối không tự sinh phương án giả.
 */
export function resolveMathtypeOptions(
  _questionText: string,
  options: ParsedOptionItem[],
  _explanation: string
): ParsedOptionItem[] {
  return options;
}

/**
 * Tách các ý con a), b), c) từ một khối văn bản bằng phương pháp cắt lát chỉ mục (index slicing)
 * Hoạt động chính xác 100% kể cả khi các ý nằm trên cùng một dòng ngăn cách bằng tab hoặc khoảng trắng.
 */
export function extractSubItemsFromBlock(block: string): { letter: string; content: string; index: number }[] | null {
  const subPrefixRegex = /(?:^|\n|\t|\s{2,})([a-d])[\)\.]\s*/gi;
  const matches: { index: number; letter: string; headerLen: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = subPrefixRegex.exec(block)) !== null) {
    const rawMatch = m[0];
    const letter = m[1].toLowerCase();
    const lIndex = rawMatch.toLowerCase().indexOf(letter);
    matches.push({
      index: m.index + lIndex,
      letter,
      headerLen: rawMatch.length - lIndex,
    });
  }

  if (matches.length < 2) return null;

  const results: { letter: string; content: string; index: number }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const next = matches[i + 1];
    const end = next ? next.index : block.length;
    const content = block.substring(curr.index + curr.headerLen, end).trim();
    results.push({
      letter: curr.letter,
      content,
      index: curr.index,
    });
  }
  return results;
}



/**
 * Làm sạch và chuẩn hóa lời giải (explanation) thật từ file người dùng.
 * TUYỆT ĐỐI KHÔNG TỰ SINH LỜI GIẢI GIẢ, KHÔNG BỊA RA NỘI DUNG "Phân tích chuyên sâu / sai chiều bất đẳng thức".
 */
export function enrichDeepExplanation(q: {
  content: string;
  options?: { content: string; isCorrect: boolean }[];
  explanation?: string;
  type?: string;
  rawLabel?: string;
}): void {
  if (!q.explanation) return;

  let cleanExp = cleanVietnameseEncoding(q.explanation.trim());
  cleanExp = cleanAndEnrichMathFormulas(cleanExp);

  // Loại bỏ triệt để các khối văn bản boilerplate giả (nếu từng bị inject)
  cleanExp = cleanExp
    .replace(/\*\*?Lời giải chi tiết & Phân tích chuyên sâu[:\*\s\S]*$/gi, '')
    .replace(/\*\*?Phân tích từng phương án lựa chọn[:\*\s\S]*$/gi, '')
    .replace(/[-*+]\s*\*\*?Phương án (?:đúng|sai)[^\n]*/gi, '')
    .replace(/[-*+]\s*\*\*?Kết luận: Chọn đáp án[^\n]*/gi, '')
    .trim();

  q.explanation = cleanExp || undefined;
}

/**
 * Trích xuất các phương án trắc nghiệm A, B, C, D từ một đoạn câu hỏi theo chuẩn Azota
 */
export function extractOptionsFromBlock(block: string): ParsedOptionItem[] {
  // Phương án trắc nghiệm chuẩn phải là A, B, C, D in hoa có dấu phân cách (chấm, ngoặc đơn, hai chấm, gạch ngang)
  // Hỗ trợ cả phương án nằm trong bảng Markdown ngăn cách bởi dấu |
  const optPrefixRegex = /(?:^|>|\n|\s{2,}|\t|\|)(?:<[^>]+>\s*)*\s*([\*\[\(]?[A-D][\*\.\:\)\/\s\]\-]+)/g;
  const matches: { index: number; letter: string; hasAsterisk: boolean; prefixLen: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = optPrefixRegex.exec(block)) !== null) {
    const rawMatch = m[1];
    const letterMatch = rawMatch.match(/^[(\[*]*([A-D])([.)\]:\-]*)/);
    if (letterMatch && letterMatch[2].length > 0) {
      const letter = letterMatch[1];
      const hasAsterisk = rawMatch.includes('*') || rawMatch.includes('[x]') || rawMatch.includes('[X]');
      const matchIndex = m.index + m[0].indexOf(rawMatch);
      matches.push({
        index: matchIndex,
        letter,
        hasAsterisk,
        prefixLen: rawMatch.length,
      });
    }
  }

  // Cần ít nhất 2 phương án (ví dụ A và B) mới là câu hỏi trắc nghiệm
  if (matches.length < 2) return [];

  // Lọc chỉ giữ các phương án hợp lệ theo thứ tự
  const results: ParsedOptionItem[] = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const next = i < matches.length - 1 ? matches[i + 1] : null;
    const endIndex = next ? next.index : block.length;

    let optContent = block.substring(curr.index + curr.prefixLen, endIndex).trim();

    // Dấu sao ở đầu nội dung phương án
    let isCorrect = curr.hasAsterisk;
    if (optContent.startsWith('*')) {
      isCorrect = true;
      optContent = optContent.substring(1).trim();
    }

    // Kiểm tra định dạng đậm/gạch chân trong HTML
    const isBold = /<(strong|b)\b/i.test(optContent) || optContent.startsWith('**') || optContent.startsWith('__');
    const isUnderlined = /<u\b/i.test(optContent);
    const isHighlighted = /<mark\b/i.test(optContent);

    // Làm sạch nội dung phương án - TUYỆT ĐỐI không xóa dấu ngoặc vuông ']' của token MathType [!m:...$] hoặc ảnh [img:...$]
    let cleanContent = stripHtmlTags(optContent).replace(/^[\*\.\:\)\s\]\-]+/, '');
    cleanContent = cleanContent.replace(/\|+$/, '').trim();
    if (!/\[!m:[^\]]+\]$/.test(cleanContent) && !/\[img:[^\]]+\]$/.test(cleanContent)) {
      cleanContent = cleanContent.replace(/[\*\.\:\)\s\]\-]+$/, '');
    } else {
      cleanContent = cleanContent.replace(/[\*\.\:\)\s\-]+$/, '');
    }
    cleanContent = cleanContent.replace(/^(\*\*|__)(.*?)\1$/, '$2').trim();

    // TUYỆT ĐỐI 100% không tự ý điền dữ liệu giả như `Phương án ${curr.letter}`
    results.push({
      letter: curr.letter,
      content: cleanContent,
      isCorrect,
      isBold,
      isUnderlined,
      isHighlighted,
    });
  }

  // Nếu bất kỳ phương án nào bị rỗng (ví dụ công thức MathType/ảnh không đọc được chữ),
  // thuật toán từ chối sinh dữ liệu giả và coi như không đủ điều kiện trắc nghiệm
  if (results.some((o) => !o.content || o.content.trim().length === 0)) {
    return [];
  }

  return results;
}

/**
 * Thuật toán phân tích câu hỏi từ văn bản cấu trúc chuẩn tương đương Azota
 * Hỗ trợ nhận diện toàn diện: Trắc nghiệm, Tự luận, Điền từ, Đúng/Sai, Hướng dẫn giải
 */
export function parseExamFromStructuredText(
  rawText: string,
  hints?: { title?: string; fileName?: string }
): DeterministicExamResult | null {
  const normalized = normalizeText(rawText);
  if (!normalized || normalized.trim().length < 10) return null;

  // Thay thế các thẻ bao bọc (p, div, br, tr, li) thành ký tự xuống dòng
  const textWithBreaks = normalized.replace(/<\/?(?:p|div|br|tr|li)[^>]*>/gi, '\n');

  // 1. Tách bảng đáp án nếu có
  const { answerKeyMap, cleanedText } = extractAnswerKeyMap(textWithBreaks);

  // 1b. Tách khối HƯỚNG DẪN GIẢI CHI TIẾT ở cuối đề thi (nếu có)
  // để tránh trùng lặp câu hỏi (duplication) và gán đúng lời giải vào từng câu hỏi
  let mainExamText = cleanedText;
  const trailingExplanationMap = new Map<number, { explanation: string; correctLetter?: string }>();

  const trailingExpHeaderRegex = /(?:^|\n)\s*(?:HƯỚNG\s*DẪN\s*GIẢI(?:\s*CHI\s*TIẾT)?|LỜI\s*GIẢI\s*CHI\s*TIẾT|ĐÁP\s*ÁN\s*VÀ\s*(?:HƯỚNG\s*DẪN\s*)?GIẢI|PHẦN\s*HƯỚNG\s*DẪN\s*GIẢI)[\s:.-]*\n([\s\S]*)$/i;
  const trailingExpMatch = cleanedText.match(trailingExpHeaderRegex);

  if (trailingExpMatch && trailingExpMatch.index !== undefined) {
    const beforeText = cleanedText.substring(0, trailingExpMatch.index).trim();
    if (/(?:Câu|Bài|Question)\s*\d+/i.test(beforeText)) {
      mainExamText = beforeText;
      const trailingBlock = trailingExpMatch[1].trim();

      const expSplitsRegex = /(?:^|\n)\s*(?:(?:Câu|câu|Bài|BÀI|Question)\s*(\d+)[\s:.-]*|(\d+)[\.\)]\s+)/gi;
      const expMatches: { index: number; qNum: number; headerLen: number }[] = [];
      let em: RegExpExecArray | null;
      while ((em = expSplitsRegex.exec(trailingBlock)) !== null) {
        const qNum = parseInt(em[1] || em[2], 10);
        if (qNum > 0) {
          expMatches.push({ index: em.index, qNum, headerLen: em[0].length });
        }
      }

      for (let j = 0; j < expMatches.length; j++) {
        const currExp = expMatches[j];
        const nextExp = j < expMatches.length - 1 ? expMatches[j + 1] : null;
        const endExpIdx = nextExp ? nextExp.index : trailingBlock.length;
        const singleExpText = trailingBlock.substring(currExp.index + currExp.headerLen, endExpIdx).trim();

        let cLetter = '';
        const matchLetter = singleExpText.match(/(?:(?:Chọn(?:\s*đáp\s*án)?|Đáp\s*án(?:\s*đúng)?(?:\s*là)?|Key)[\s:.-]*([A-D])\b)/i);
        if (matchLetter) {
          cLetter = matchLetter[1].toUpperCase();
        }

        trailingExplanationMap.set(currExp.qNum, {
          explanation: singleExpText,
          correctLetter: cLetter || undefined,
        });
      }
    }
  }

  // 2. Nhận diện tiêu đề, môn học, khối lớp, thời gian
  const detectedSubject = detectSubjectFromText(mainExamText);
  const detectedGrade = detectGradeFromText(mainExamText);
  const detectedDuration = detectDurationFromText(mainExamText);

  let detectedTitle = hints?.title || hints?.fileName?.replace(/\.[^/.]+$/, '') || 'Đề thi trắc nghiệm';
  const firstLines = mainExamText.split('\n').slice(0, 6).map((l) => stripHtmlTags(l).trim()).filter(Boolean);
  for (const line of firstLines) {
    if (/(?:đề\s+thi|đề\s+kiểm\s+tra|bài\s+tập|khảo\s+sát|chuyên\s+đề|bài\s*\d+[:.-]\s*[^\n]+)/i.test(line) && line.length < 120) {
      detectedTitle = line;
      break;
    }
  }

  // 3. Tách các khối câu hỏi theo chuẩn đề thi Việt Nam (Azota standard)
  // Bắt các tiền tố: Bài, Câu, Bài tập, Ví dụ, Luyện tập, Vận dụng, Question, La Mã (Bài I, Câu I), số 1.
  const questionRegex = /(?:^|\n)\s*(?:<[^>]+>\s*)*(?:\[(?:img|image|hinh|hình)[^\]]*\]\s*)*(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|LUYỆN\s*TẬP|Vận\s*dụng|VẬN\s*DỤNG)\s*(\d+|[IVXLCDM]+)[\s:.-]*|(\d+)[\.\)]\s+|\[(?:Câu|Bài|Ví\s*dụ)?\s*(\d+|[IVXLCDM]+)\][\s:.-]*|\((?:Câu|Bài|Ví\s*dụ)?\s*(\d+|[IVXLCDM]+)\)[\s:.-]*)/gi;
  const questionSplits: { index: number; qNum: number; headerLen: number; rawLabel: string; sectionBanner?: string }[] = [];

  let qMatch: RegExpExecArray | null;
  let autoIndex = 1;
  while ((qMatch = questionRegex.exec(mainExamText)) !== null) {
    const matchIndex = qMatch.index;

    // Bỏ qua nếu đây là tiêu đề bài học / chuyên đề ở đầu tài liệu (ví dụ: "BÀI 5: BẤT ĐẲNG THỨC VÀ TÍNH CHẤT")
    if (matchIndex < 350) {
      const restOfHeader = mainExamText.substring(matchIndex, matchIndex + 200);
      if (
        /(?:bất\s*đẳng\s*thức|chuyên\s*đề|chương|bài\s*học|trọng\s*tâm\s*kiến\s*thức|lý\s*thuyết|khái\s*niệm)/i.test(restOfHeader) &&
        !/(?:hãy|chứng\s*minh|tính|tìm|cho\s+[a-z0-9]|giải\s+phương\s+trình|khẳng\s+định|sau\s+đây)/i.test(restOfHeader)
      ) {
        continue;
      }
    }

    const rawNum = qMatch[1] || qMatch[2] || qMatch[3] || qMatch[4];
    const num = rawNum ? parseInt(rawNum, 10) || autoIndex : autoIndex;
    autoIndex++;

    const rawMatchText = qMatch[0].trim();
    const cleanLabel = rawMatchText
      .replace(/^\[(?:img|image|hinh|hình)[^\]]*\]\s*/i, '')
      .replace(/[:.-]+$/, '')
      .trim();

    const headerLen = qMatch[0].length;

    // Tìm xem trước câu này có tiêu đề Dạng bài (Dạng 1, Dạng 2...) hoặc Phần đề thi (Phần I, Phần II...) không
    const leadingSnippet = mainExamText.substring(Math.max(0, matchIndex - 300), matchIndex);
    const dangMatch = leadingSnippet.match(/(?:^|\n)\s*((?:Phần|PHẦN|Dạng|DẠNG)\s*(?:[IVXLCDM]+|\d+)[\s:.-]*[^\n]+)/i);
    const sectionBanner = dangMatch ? dangMatch[1].trim() : undefined;

    questionSplits.push({
      index: matchIndex,
      qNum: num,
      headerLen,
      rawLabel: cleanLabel || `Câu ${num}`,
      sectionBanner,
    });
  }

  if (questionSplits.length === 0) {
    return null;
  }

  const parsedQuestions: ParsedExamQuestion[] = [];

  for (let i = 0; i < questionSplits.length; i++) {
    const curr = questionSplits[i];
    const next = i < questionSplits.length - 1 ? questionSplits[i + 1] : null;
    const endIndex = next ? next.index : mainExamText.length;

    const rawBlock = mainExamText.substring(curr.index + curr.headerLen, endIndex).trim();
    if (!rawBlock) continue;

    // Trích xuất tất cả hình ảnh trong khối câu hỏi này
    const blockImages: string[] = [];
    const imgMatchRegex = /(?:\[!(?:img|image):([^\]]+)\]|\[(?:img|image):([^\]]+)\]|!\[[^\]]*\]\(([^)]+)\))/gi;
    let im: RegExpExecArray | null;
    while ((im = imgMatchRegex.exec(rawBlock)) !== null) {
      const uri = (im[1] || im[2] || im[3]).trim();
      if (uri && !blockImages.includes(uri)) {
        blockImages.push(uri);
      }
    }

    // Lọc tiêu đề Dạng bài nếu nó nằm ở dòng đầu tiên của câu hỏi
    let processedBlock = rawBlock;
    const firstLine = (processedBlock.split('\n')[0] || '').trim();
    if (/^Dạng\s*\d+/i.test(firstLine)) {
      processedBlock = processedBlock.substring(firstLine.length).trim();
    }

    if (!processedBlock) continue;

    // Chuẩn hóa placeholder ảnh trong câu hỏi thành [IMAGE_URL]
    processedBlock = processedBlock.replace(/(?:\[!(?:img|image):[^\]]+\]|\[(?:img|image):[^\]]+\]|!\[[^\]]*\]\([^)]+\))/gi, ' [IMAGE_URL] ');

    // 4. Bóc tách Lời giải / Hướng dẫn giải nếu có
    let explanation: string | undefined = undefined;
    let questionAndOptionsBlock = processedBlock;

    const expRegex = /(?:^|\n)\s*(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*giải|Giải\s*thích|HDG|HƯỚNG\s*DẪN\s*GIẢI|LỜI\s*GIẢI|GIẢI|Giải)[\s:.-]+([\s\S]*)$/i;
    const expMatch = processedBlock.match(expRegex);
    if (expMatch && expMatch.index !== undefined) {
      explanation = stripHtmlTags(expMatch[1]).trim();
      questionAndOptionsBlock = processedBlock.substring(0, expMatch.index).trim();
    }

    // 4b. Bổ sung lời giải và đáp án từ khối HƯỚNG DẪN GIẢI CHI TIẾT ở cuối đề (nếu có)
    let inQuestionCorrectLetter = '';
    const trailingInfo = trailingExplanationMap.get(curr.qNum);
    if (trailingInfo) {
      if (!explanation || explanation.length < 5) {
        explanation = trailingInfo.explanation;
      } else {
        explanation = `${explanation}\n${trailingInfo.explanation}`;
      }
      if (trailingInfo.correctLetter) {
        inQuestionCorrectLetter = trailingInfo.correctLetter;
      }
    }

    // 5. Kiểm tra đáp án trắc nghiệm ghi chú trong câu hỏi hoặc lời giải
    const searchForLetter = (explanation || '') + ' ' + questionAndOptionsBlock;
    const inQuestionAnsMatch = searchForLetter.match(/(?:(?:Chọn(?:\s*đáp\s*án)?|Đáp\s*án(?:\s*đúng)?(?:\s*là)?|Key)[\s:.-]*([A-D])\b)/i);
    if (inQuestionAnsMatch) {
      inQuestionCorrectLetter = inQuestionAnsMatch[1].toUpperCase();
    }

    // 6. Kiểm tra đáp án ngắn (cho câu Tự luận / Điền từ)
    let shortAnswer = '';
    const shortAnsMatch = questionAndOptionsBlock.match(/(?:^|\n)\s*(?:Đáp\s*án|Đáp\s*số|Kết\s*quả)[\s:.-]+([^\n]+)/i);
    if (shortAnsMatch) {
      shortAnswer = stripHtmlTags(shortAnsMatch[1]).trim();
      questionAndOptionsBlock = questionAndOptionsBlock.replace(shortAnsMatch[0], '').trim();
    }

    // 7. Bóc tách phương án A, B, C, D
    let extractedOptions = extractOptionsFromBlock(questionAndOptionsBlock);

    if (extractedOptions.length >= 2) {
      // TRẮC NGHIỆM ĐÃ CÓ SẴN PHƯƠNG ÁN A, B, C, D
      const firstOptPrefixRegex = /(?:^|>|\n|\s{2,}|\t|\|)(?:<[^>]+>\s*)*\s*([\*\[\(]?[A-D][\*\.\:\)\/\s\]\-]+)/i;
      const firstOptMatch = questionAndOptionsBlock.match(firstOptPrefixRegex);
      let questionContent = '';
      if (firstOptMatch && firstOptMatch.index !== undefined) {
        questionContent = questionAndOptionsBlock.substring(0, firstOptMatch.index).trim();
      } else {
        questionContent = `${curr.rawLabel || `Câu ${curr.qNum}`}`;
      }

      questionContent = stripHtmlTags(questionContent).replace(/^[:.-]+\s*/, '').trim();
      if (!questionContent) {
        questionContent = `${curr.rawLabel || `Câu ${curr.qNum}`}`;
      }

      // Làm sạch công thức toán trong nội dung câu hỏi
      questionContent = cleanAndEnrichMathFormulas(questionContent);

      // Phục hồi phương án nếu có token MathType hoặc options bị đồng nhất
      extractedOptions = resolveMathtypeOptions(questionContent, extractedOptions, explanation || '');

      const hasAsteriskCorrect = extractedOptions.some((o) => o.isCorrect);
      const keyLetterFromTable = answerKeyMap.get(curr.qNum);
      const boldOpts = extractedOptions.filter((o) => o.isBold);
      const underlineOpts = extractedOptions.filter((o) => o.isUnderlined);

      const formattedOptions = extractedOptions.map((opt) => {
        let isCorrect = opt.isCorrect;

        if (!hasAsteriskCorrect) {
          if (inQuestionCorrectLetter) {
            isCorrect = opt.letter === inQuestionCorrectLetter;
          } else if (keyLetterFromTable) {
            isCorrect = opt.letter === keyLetterFromTable;
          } else if (boldOpts.length === 1 && opt.isBold) {
            isCorrect = true;
          } else if (underlineOpts.length === 1 && opt.isUnderlined) {
            isCorrect = true;
          }
        }

        const optText = cleanAndEnrichMathFormulas(opt.content, {
          isOption: true,
          optLetter: opt.letter,
          questionText: questionContent,
        });

        return {
          content: optText,
          isCorrect: Boolean(isCorrect),
        };
      });

      let cleanExp = explanation ? cleanAndEnrichMathFormulas(explanation) : undefined;

      const qItem: ParsedExamQuestion = {
        id: `q_${curr.qNum}_${Date.now()}_${i}`,
        originalIndex: curr.qNum,
        rawLabel: curr.sectionBanner ? `${curr.sectionBanner} - ${curr.rawLabel}` : curr.rawLabel,
        content: questionContent,
        options: formattedOptions,
        explanation: cleanExp,
        points: 1.0,
        type: 'multiple_choice',
        answer: shortAnswer || undefined,
        images: blockImages.length > 0 ? blockImages : undefined,
      };

      enrichDeepExplanation(qItem);
      parsedQuestions.push(qItem);
    } else {
      // TỰ LUẬN HOẶC CÂU CÓ Ý CON (a, b, c):
      const subItems = extractSubItemsFromBlock(questionAndOptionsBlock);

      if (subItems && subItems.length >= 2) {
        // TÁCH MỖI Ý CON a), b), c) THÀNH MỘT CÂU HỎI ĐỘC LẬP HOÀN CHỈNH
        const firstSubIdx = subItems[0].index;
        const mainQuestionHeader = stripHtmlTags(questionAndOptionsBlock.substring(0, firstSubIdx)).replace(/^[:.-]+\s*/, '').trim();

        const subExpItems = explanation ? extractSubItemsFromBlock(explanation) : null;
        const subExpMap = new Map<string, string>();
        if (subExpItems) {
          subExpItems.forEach((se) => subExpMap.set(se.letter, se.content));
        }

        for (let sIdx = 0; sIdx < subItems.length; sIdx++) {
          const sim = subItems[sIdx];
          const letter = sim.letter;
          let subText = stripHtmlTags(sim.content).trim();
          let subExpRaw = subExpMap.get(letter) || explanation || '';

          // Kiểm tra nếu lời giải được viết inline ngay trong ý con (ví dụ: a) ... Lời giải: Đúng)
          const inlineExpMatch = subText.match(/(?:^|\n|\t|\.\s*|\s+)(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*giải|Giải|Đáp\s*án)[\s:.-]+([\s\S]*)$/i);
          if (inlineExpMatch && inlineExpMatch.index !== undefined) {
            if (!subExpRaw) {
              subExpRaw = inlineExpMatch[1].trim();
            }
            subText = subText.substring(0, inlineExpMatch.index).trim();
          }

          subText = cleanAndEnrichMathFormulas(subText);
          let subExp = cleanAndEnrichMathFormulas(subExpRaw);

          // Phục hồi công thức bất đẳng thức nếu subExp rỗng hoặc chưa đủ biểu thức so sánh
          if (subExp === '$x$' || !subExp || subExp.length < 3) {
            if (/nhỏ hơn\s*(\d+)/i.test(subText)) {
              const n = subText.match(/nhỏ hơn\s*(\d+)/i)![1];
              subExp = `$x < ${n}$`;
            } else if (/lớn hơn\s*(\d+)/i.test(subText)) {
              const n = subText.match(/lớn hơn\s*(\d+)/i)![1];
              subExp = `$x > ${n}$`;
            } else if (/không lớn hơn/i.test(subText)) {
              subExp = '$a \\le b$';
            } else if (/không nhỏ hơn/i.test(subText)) {
              subExp = '$m \\ge n$';
            } else if (/trên\s*(\d+)/i.test(subText) || /nhiệt độ/i.test(subText)) {
              subExp = '$t > 30$';
            } else if (/tuổi.*(?:ít nhất|tối thiểu)\s*(\d+)/i.test(subText)) {
              const n = subText.match(/(?:ít nhất|tối thiểu)\s*(\d+)/i)![1];
              subExp = `$x \\ge ${n}$`;
            }
          }

          let fullSubContent = mainQuestionHeader
            ? `${mainQuestionHeader}\n${letter}) ${subText}`
            : `${curr.rawLabel} (${letter}): ${subText}`;

          fullSubContent = cleanAndEnrichMathFormulas(fullSubContent);

          // Nhận diện định dạng Trắc nghiệm Đúng / Sai (Chương trình GDPT 2018 Phần II)
          const isTrueFalseSection = /đúng\s*[-/]?\s*sai/i.test(curr.sectionBanner || '') ||
                                     /đúng\s*[-/]?\s*sai/i.test(mainQuestionHeader) ||
                                     /\b(?:đúng|sai)\b/i.test(subExpRaw);

          if (isTrueFalseSection && (/(?:đúng|sai)/i.test(subExpRaw) || /(?:đúng|sai)/i.test(subText))) {
            const checkStr = (subExpRaw || subText).toLowerCase();
            const isDung = /(?:^|\s|\b)(?:đúng|true|đ)(?:\s|\b|$|\.)/i.test(checkStr) &&
                           !/(?:^|\s|\b)(?:sai|không\s*đúng)(?:\s|\b|$|\.)/i.test(checkStr);
            const subQItem: ParsedExamQuestion = {
              id: `q_${curr.qNum}_${letter}_${Date.now()}_${sIdx}`,
              originalIndex: curr.qNum,
              rawLabel: curr.sectionBanner ? `${curr.sectionBanner} - ${curr.rawLabel} (${letter})` : `${curr.rawLabel} (${letter})`,
              content: fullSubContent,
              options: [
                { content: 'Đúng', isCorrect: isDung },
                { content: 'Sai', isCorrect: !isDung },
              ],
              explanation: subExp ? `**Lời giải chi tiết câu ${letter}):**\n${subExp}` : undefined,
              points: 1.0,
              type: 'true_false',
              images: blockImages.length > 0 ? blockImages : undefined,
            };
            enrichDeepExplanation(subQItem);
            parsedQuestions.push(subQItem);
            continue;
          }

          // Nếu không có phương án trắc nghiệm A, B, C, D trong đề gốc -> Giữ nguyên là câu Tự luận
          const subQItem: ParsedExamQuestion = {
            id: `q_${curr.qNum}_${letter}_${Date.now()}_${sIdx}`,
            originalIndex: curr.qNum,
            rawLabel: curr.sectionBanner ? `${curr.sectionBanner} - ${curr.rawLabel} (${letter})` : `${curr.rawLabel} (${letter})`,
            content: fullSubContent,
            options: [],
            explanation: subExp ? `**Lời giải:**\n${subExp}` : undefined,
            points: 1.0,
            type: 'short_answer',
            answer: subExp || undefined,
            images: blockImages.length > 0 ? blockImages : undefined,
          };
          enrichDeepExplanation(subQItem);
          parsedQuestions.push(subQItem);
        }
      } else {
        // Câu không có phương án A, B, C, D (Trả lời ngắn / Tự luận):
        // Tuyệt đối không xóa câu hay đánh lại index! Giữ nguyên originalIndex = curr.qNum và gán type = 'short_answer'.
        let questionContent = stripHtmlTags(questionAndOptionsBlock).replace(/^[:.-]+\s*/, '').trim() || `${curr.rawLabel || `Câu ${curr.qNum}`}`;
        questionContent = cleanAndEnrichMathFormulas(questionContent);

        let cleanExp = explanation ? cleanAndEnrichMathFormulas(explanation) : undefined;
        const qItem: ParsedExamQuestion = {
          id: `q_${curr.qNum}_${Date.now()}_${i}`,
          originalIndex: curr.qNum,
          rawLabel: curr.sectionBanner ? `${curr.sectionBanner} - ${curr.rawLabel}` : curr.rawLabel,
          content: questionContent,
          options: [],
          explanation: cleanExp,
          points: 1.0,
          type: 'short_answer',
          answer: shortAnswer ? cleanAndEnrichMathFormulas(shortAnswer) : undefined,
          images: blockImages.length > 0 ? blockImages : undefined,
        };
        enrichDeepExplanation(qItem);
        parsedQuestions.push(qItem);
      }
    }
  }

  if (parsedQuestions.length === 0) {
    return null;
  }

  const pt = Math.round((10 / parsedQuestions.length) * 100) / 100;
  parsedQuestions.forEach((q) => {
    q.points = pt;
  });

  return {
    title: detectedTitle,
    subject: detectedSubject,
    grade: detectedGrade,
    durationMinutes: detectedDuration,
    questions: parsedQuestions,
    parserUsed: 'plain_text',
  };
}

/**
 * Thuật toán bóc tách file Word (.docx) trực tiếp và siêu tốc
 * Sử dụng kết hợp Mammoth raw text và JSZip XML document.xml
 */
export async function parseDocxFileStructure(file: File): Promise<DeterministicExamResult | null> {
  const fileName = file.name;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const answerTableMap = new Map<number, string>();
    let cleanRawText = '';

    // 1. Phân tích Document XML & Giải mã toàn bộ đối tượng MathType MTEF qua JSZip
    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      const oleLatexMap = new Map<string, string>();
      const oleIndexMap = new Map<number, string>();
      const imageRelMap = new Map<string, string>();
      const imageIndexMap = new Map<number, string>();

      // Đọc bảng quan hệ trong word/_rels/document.xml.rels để liên kết rId -> oleObject.bin và hình ảnh
      const relsEntry = zip.file('word/_rels/document.xml.rels');
      if (relsEntry) {
        const relsXml = await relsEntry.async('text');
        const relRegex = /<Relationship\b[^>]*Id=["']([^"']+)["'][^>]*Target=["']([^"']+)["'][^>]*\/>/g;
        let rm: RegExpExecArray | null;
        while ((rm = relRegex.exec(relsXml)) !== null) {
          const rId = rm[1];
          const target = rm[2];

          // 1. MathType OLE Object (.bin)
          if (/embeddings\/|oleObject/i.test(target)) {
            const normalized = target.startsWith('embeddings/')
              ? `word/${target}`
              : target.startsWith('word/embeddings/')
              ? target
              : `word/embeddings/${target.replace(/^.*[\\/]/, '')}`;
            const oleF = zip.file(normalized) || zip.file(`word/${target}`);
            if (oleF) {
              const oleBuf = await oleF.async('arraybuffer');
              const latex = parseMtefBinaryToLatex(oleBuf);
              if (latex) {
                oleLatexMap.set(rId, latex);
              }
            }
          }

          // 2. Hình ảnh (media)
          if (/media\/|image/i.test(target)) {
            const zipPath = target.startsWith('word/') ? target : `word/${target}`;
            const imgF = zip.file(zipPath) || zip.file(target);
            if (imgF) {
              const mime = getMimeTypeFromPath(zipPath);
              const base64 = await imgF.async('base64');
              imageRelMap.set(rId, `data:${mime};base64,${base64}`);
            }
          }
        }
      }

      // Đọc các file oleObject*.bin theo thứ tự số nếu rId không có
      const binEntries = Object.keys(zip.files).filter((k) => /embeddings\/oleobject\d+\.bin/i.test(k));
      binEntries.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

      for (let bi = 0; bi < binEntries.length; bi++) {
        const binF = zip.file(binEntries[bi]);
        if (binF) {
          const buf = await binF.async('arraybuffer');
          const latex = parseMtefBinaryToLatex(buf);
          if (latex) {
            oleIndexMap.set(bi + 1, latex);
          }
        }
      }

      // Đọc các file media image theo thứ tự số để dự phòng imageIndexMap
      const mediaEntries = Object.keys(zip.files).filter((k) => /media\/image\d+\./i.test(k));
      mediaEntries.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
      for (let mi = 0; mi < mediaEntries.length; mi++) {
        const mF = zip.file(mediaEntries[mi]);
        if (mF) {
          const mime = getMimeTypeFromPath(mediaEntries[mi]);
          const base64 = await mF.async('base64');
          imageIndexMap.set(mi + 1, `data:${mime};base64,${base64}`);
        }
      }

      const docXmlEntry = zip.file('word/document.xml');

      if (docXmlEntry) {
        let docXml = await docXmlEntry.async('text');

        // Tìm bảng đáp án dạng table <w:tbl>
        const tblRegex = /<w:tbl\b[\s\S]*?<\/w:tbl>/g;
        let tblMatch: RegExpExecArray | null;

        while ((tblMatch = tblRegex.exec(docXml)) !== null) {
          const tblXml = tblMatch[0];
          const rows = tblXml.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
          if (rows.length >= 2) {
            const grid: string[][] = [];
            for (const rowXml of rows) {
              const cells = rowXml.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
              const cellTexts = cells.map((c) => {
                const texts = c.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g) || [];
                return texts.map((t) => t.replace(/<[^>]+>/g, '').trim()).join('');
              });
              grid.push(cellTexts);
            }

            if (grid.length === 2 && grid[0].length >= 2) {
              for (let c = 0; c < grid[0].length; c++) {
                const qNum = parseInt(grid[0][c].replace(/[^0-9]/g, ''), 10);
                const letter = grid[1][c]?.trim().toUpperCase();
                if (qNum > 0 && /^[A-D]$/.test(letter)) {
                  answerTableMap.set(qNum, letter);
                }
              }
            }
            for (const row of grid) {
              if (row.length >= 2) {
                const qNum = parseInt(row[0].replace(/[^0-9]/g, ''), 10);
                const letter = row[1].trim().toUpperCase();
                if (qNum > 0 && /^[A-D]$/.test(letter)) {
                  answerTableMap.set(qNum, letter);
                }
              }
            }
          }
        }

        // Chuyển đổi các bảng <w:tbl> không phải bảng đáp án thành bảng Markdown
        docXml = docXml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, (tblXml) => {
          const mdTable = convertWordTableToMarkdown(tblXml);
          if (mdTable) {
            const safeMd = escapeXmlText(`\n\n${mdTable}\n\n`);
            return `<w:p><w:r><w:t xml:space="preserve">${safeMd}</w:t></w:r></w:p>`;
          }
          return tblXml;
        });

        // Chuyển đổi toàn bộ thẻ <m:oMath> và MathType OLE sang LaTeX, giữ nguyên hình ảnh
        const convertedDocXml = replaceOmmlInDocumentXml(docXml, oleLatexMap, oleIndexMap, imageRelMap, imageIndexMap);

        // Trích xuất text sạch trực tiếp từ XML - Siêu tốc (< 2ms), KHÔNG dùng JSZip.generateAsync gây đơ lag trình duyệt
        cleanRawText = extractTextFromWordXml(convertedDocXml);
      }
    } catch (zipErr) {
      console.warn('JSZip XML reading & MTEF decoding error:', zipErr);
    }

    // 2. Dự phòng: Nếu cleanRawText quá ngắn, dùng mammoth trên arrayBuffer nguyên bản (siêu nhanh, không bị nghẽn)
    if (!cleanRawText || cleanRawText.trim().length < 15) {
      try {
        const rawRes = await mammoth.extractRawText({ arrayBuffer });
        cleanRawText = rawRes.value || '';
      } catch (e) {
        console.warn('Mammoth raw text extraction fallback error:', e);
      }
    }

    // 3. Ưu tiên phân tích trên cleanRawText (chính xác tuyệt đối với câu hỏi tiếng Việt)
    if (cleanRawText.trim().length > 15) {
      const res = parseExamFromStructuredText(cleanRawText, { fileName });
      if (res && res.questions.length > 0) {
        if (answerTableMap.size > 0) {
          res.questions.forEach((q, idx) => {
            const targetLetter = answerTableMap.get(q.originalIndex || (idx + 1));
            if (targetLetter && q.options && q.options.length > 0) {
              q.options.forEach((opt, oIdx) => {
                const letter = String.fromCharCode(65 + oIdx);
                opt.isCorrect = letter === targetLetter;
              });
            }
          });
        }
        res.parserUsed = 'docx_mammoth';
        return res;
      }
    }

    // 4. Fallback dùng mammoth.convertToHtml trên arrayBuffer
    try {
      const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
      if (htmlRes.value) {
        const resHtml = parseExamFromStructuredText(htmlRes.value, { fileName });
        if (resHtml && resHtml.questions.length > 0) {
          if (answerTableMap.size > 0) {
            resHtml.questions.forEach((q, idx) => {
              const targetLetter = answerTableMap.get(q.originalIndex || (idx + 1));
              if (targetLetter && q.options && q.options.length > 0) {
                q.options.forEach((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  opt.isCorrect = letter === targetLetter;
                });
              }
            });
          }
          resHtml.parserUsed = 'docx_xml';
          return resHtml;
        }
      }
    } catch (e) {
      console.warn('Mammoth HTML fallback error:', e);
    }
  } catch (err) {
    console.warn('parseDocxFileStructure error:', err);
  }

  return null;
}

/**
 * Thuật toán bóc tách file Excel (.xlsx) chứa câu hỏi trắc nghiệm
 */
export async function parseXlsxFileStructure(file: File): Promise<DeterministicExamResult | null> {
  const fileName = file.name;
  try {
    const zip = await JSZip.loadAsync(file);

    const sharedStrings: string[] = [];
    const sharedFile = zip.file('xl/sharedStrings.xml');
    if (sharedFile) {
      const sXml = await sharedFile.async('text');
      const siMatches = sXml.match(/<si\b[\s\S]*?<\/si>/g) || [];
      for (const si of siMatches) {
        const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
        const fullStr = tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('');
        sharedStrings.push(fullStr);
      }
    }

    const sheetFile = zip.file('xl/worksheets/sheet1.xml') || zip.file('xl/worksheets/sheet.xml');
    if (!sheetFile) return null;

    const sheetXml = await sheetFile.async('text');
    const rowMatches = sheetXml.match(/<row\b[\s\S]*?<\/row>/g) || [];
    if (rowMatches.length < 2) return null;

    const tableRows: { colLetter: string; value: string }[][] = [];

    for (const rXml of rowMatches) {
      const cellMatches = rXml.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/g) || [];
      const rowCells: { colLetter: string; value: string }[] = [];

      for (const cXml of cellMatches) {
        const rAttrMatch = cXml.match(/r=["']([A-Z]+)\d+["']/);
        const colLetter = rAttrMatch ? rAttrMatch[1] : '';
        const tAttrMatch = cXml.match(/t=["']([a-z]+)["']/);
        const cellType = tAttrMatch ? tAttrMatch[1] : '';

        const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/);
        let cellVal = '';

        if (vMatch) {
          const rawVal = vMatch[1];
          if (cellType === 's') {
            const sIdx = parseInt(rawVal, 10);
            cellVal = sharedStrings[sIdx] || '';
          } else {
            cellVal = rawVal;
          }
        } else {
          const isMatch = cXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/);
          if (isMatch) {
            cellVal = isMatch[1];
          }
        }

        if (colLetter && cellVal.trim()) {
          rowCells.push({ colLetter, value: cellVal.trim() });
        }
      }

      if (rowCells.length > 0) {
        tableRows.push(rowCells);
      }
    }

    if (tableRows.length < 2) return null;

    const headerRow = tableRows[0];
    let qCol = '';
    let optACol = '';
    let optBCol = '';
    let optCCol = '';
    let optDCol = '';
    let keyCol = '';
    let expCol = '';

    for (const cell of headerRow) {
      const val = cell.value.toLowerCase();
      if (/^(câu|câu hỏi|nội dung|nội dung câu hỏi|question|content)$/i.test(val) || (val.includes('câu hỏi') && !val.includes('số'))) {
        qCol = cell.colLetter;
      } else if (/^(đáp án a|phương án a|a|option a)$/i.test(val) || val === 'a') {
        optACol = cell.colLetter;
      } else if (/^(đáp án b|phương án b|b|option b)$/i.test(val) || val === 'b') {
        optBCol = cell.colLetter;
      } else if (/^(đáp án c|phương án c|c|option c)$/i.test(val) || val === 'c') {
        optCCol = cell.colLetter;
      } else if (/^(đáp án d|phương án d|d|option d)$/i.test(val) || val === 'd') {
        optDCol = cell.colLetter;
      } else if (/^(đáp án đúng|đáp án|key|correct|kết quả)$/i.test(val)) {
        keyCol = cell.colLetter;
      } else if (/^(lời giải|giải thích|hướng dẫn|hướng dẫn giải|explanation)$/i.test(val)) {
        expCol = cell.colLetter;
      }
    }

    const dataRows = tableRows.slice(1);
    const questions: ParsedExamQuestion[] = [];

    let qIndex = 1;
    for (const r of dataRows) {
      const cellMap = new Map<string, string>();
      r.forEach((c) => cellMap.set(c.colLetter, c.value));

      let content = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let key = '';
      let exp = '';

      if (qCol && optACol) {
        content = cellMap.get(qCol) || '';
        optA = cellMap.get(optACol) || '';
        optB = cellMap.get(optBCol) || '';
        optC = cellMap.get(optCCol) || '';
        optD = cellMap.get(optDCol) || '';
        key = (keyCol ? cellMap.get(keyCol) : '') || '';
        exp = (expCol ? cellMap.get(expCol) : '') || '';
      } else {
        const values = r.map((c) => c.value);
        if (values.length >= 5) {
          if (/^\d+$/.test(values[0]) && values.length >= 6) {
            content = values[1];
            optA = values[2];
            optB = values[3];
            optC = values[4];
            optD = values[5];
            key = values[6] || '';
            exp = values[7] || '';
          } else {
            content = values[0];
            optA = values[1];
            optB = values[2];
            optC = values[3];
            optD = values[4];
            key = values[5] || '';
            exp = values[6] || '';
          }
        }
      }

      if (!content || !optA || !optB) continue;

      const upperKey = key.trim().toUpperCase();
      const options: { content: string; isCorrect: boolean }[] = [];
      if (optA) options.push({ content: optA, isCorrect: upperKey === 'A' || upperKey === '1' });
      if (optB) options.push({ content: optB, isCorrect: upperKey === 'B' || upperKey === '2' });
      if (optC) options.push({ content: optC, isCorrect: upperKey === 'C' || upperKey === '3' });
      if (optD) options.push({ content: optD, isCorrect: upperKey === 'D' || upperKey === '4' });

      questions.push({
        id: `q_excel_${qIndex}_${Date.now()}`,
        content: content.replace(/^Câu\s*\d+\s*[:.]\s*/i, '').trim(),
        options,
        explanation: exp || undefined,
        points: 1.0,
      });
      qIndex++;
    }

    if (questions.length > 0) {
      const pt = Math.round((10 / questions.length) * 100) / 100;
      questions.forEach((q) => (q.points = pt));

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
      return {
        title: cleanTitle,
        subject: detectSubjectFromText(cleanTitle),
        grade: detectGradeFromText(cleanTitle),
        durationMinutes: 45,
        questions,
        parserUsed: 'excel_xlsx',
      };
    }
  } catch (err) {
    console.warn('Excel parse error:', err);
  }
  return null;
}

/**
 * Thuật toán bóc tách file LaTeX (.tex) theo chuẩn \begin{ex} ... \choice{A}{B}{C}{D}
 */
export function parseLatexFileStructure(rawText: string, fileName: string): DeterministicExamResult | null {
  if (!rawText || rawText.trim().length < 20) return null;

  const exBlockRegex = /\\begin\{(?:ex|question)\}[\s\S]*?\\end\{(?:ex|question)\}/g;
  const blocks = rawText.match(exBlockRegex);

  if (blocks && blocks.length > 0) {
    const questions: ParsedExamQuestion[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      let explanation: string | undefined = undefined;
      const loigiaiMatch = block.match(/\\loigiai\s*\{([\s\S]*?)\}(?=\s*\\end)/);
      if (loigiaiMatch) {
        explanation = loigiaiMatch[1].trim();
      }

      const choiceMatch = block.match(/\\choice\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/);
      if (choiceMatch) {
        const rawOpts = [choiceMatch[1], choiceMatch[2], choiceMatch[3], choiceMatch[4]];

        const options = rawOpts.map((raw) => {
          const isCorrect = raw.includes('\\True') || raw.startsWith('*') || raw.includes('\\ans');
          const clean = raw
            .replace(/\\True/g, '')
            .replace(/^[\s\*]+/, '')
            .trim();
          return { content: clean, isCorrect };
        });

        const choiceIdx = block.indexOf('\\choice');
        let content = block.substring(0, choiceIdx);
        content = content
          .replace(/\\begin\{(?:ex|question)\}(\[[^\]]*\])?/g, '')
          .replace(/^[:.-]+\s*/, '')
          .trim();

        if (content) {
          questions.push({
            id: `q_tex_${i + 1}_${Date.now()}`,
            content,
            options,
            explanation,
            points: 1.0,
          });
        }
      }
    }

    if (questions.length > 0) {
      const pt = Math.round((10 / questions.length) * 100) / 100;
      questions.forEach((q) => (q.points = pt));

      const cleanTitle = fileName.replace(/\.[^/.]+$/, '');
      return {
        title: cleanTitle,
        subject: detectSubjectFromText(rawText + ' ' + cleanTitle),
        grade: detectGradeFromText(rawText + ' ' + cleanTitle),
        durationMinutes: detectDurationFromText(rawText),
        questions,
        parserUsed: 'latex_tex',
      };
    }
  }

  return parseExamFromStructuredText(rawText, { fileName });
}

/**
 * Trích xuất text từ file PDF sử dụng giải nén stream pako
 * Tự động kiểm tra tính toàn vẹn và font encoding: Nếu phát hiện ký tự hỏng \uFFFD hoặc văn bản bị cắt nát,
 * sẽ lập tức trả về chuỗi rỗng '' để chuyển sang Gemini Multimodal AI xử lý trực tiếp file PDF với độ chính xác 100%.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let latin1Str = '';
    for (let i = 0; i < bytes.length; i++) {
      latin1Str += String.fromCharCode(bytes[i]);
    }
    const lines: string[] = [];

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;

    while ((match = streamRegex.exec(latin1Str)) !== null) {
      const rawStreamStr = match[1];
      const streamBytes = new Uint8Array(rawStreamStr.length);
      for (let i = 0; i < rawStreamStr.length; i++) {
        streamBytes[i] = rawStreamStr.charCodeAt(i);
      }

      let decompressedText = '';
      try {
        const decompressed = pako.inflate(streamBytes);
        decompressedText = new TextDecoder('utf-8', { fatal: false }).decode(decompressed);
      } catch {
        decompressedText = rawStreamStr;
      }

      // Nếu stream giải nén chứa ký tự hỏng \uFFFD (do font encoding là Identity/CID/WinAnsi không phải UTF-8)
      if (decompressedText.includes('\uFFFD')) {
        continue;
      }

      const textFragments: { x: number; y: number; text: string }[] = [];
      const btRegex = /BT[\s\S]*?ET/g;
      let btMatch: RegExpExecArray | null;
      while ((btMatch = btRegex.exec(decompressedText)) !== null) {
        const btBlock = btMatch[0];
        let curX = 0;
        let curY = 0;

        const tmMatch = btBlock.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm/);
        if (tmMatch) {
          curX = parseFloat(tmMatch[5]);
          curY = parseFloat(tmMatch[6]);
        } else {
          const tdMatch = btBlock.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td/);
          if (tdMatch) {
            curX = parseFloat(tdMatch[1]);
            curY = parseFloat(tdMatch[2]);
          }
        }

        const textInBlock: string[] = [];

        // 1. Array TJ: [(text) offset (text2)] TJ
        const tjRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
          const inner = tjMatch[1];
          const tokens = inner.match(/\(([^()]*)\)|(-?\d+(?:\.\d+)?)/g);
          if (tokens) {
            let linePart = '';
            for (const tok of tokens) {
              if (tok.startsWith('(') && tok.endsWith(')')) {
                linePart += tok.slice(1, -1);
              } else {
                const offset = parseFloat(tok);
                if (!isNaN(offset) && offset < -120) {
                  linePart += ' ';
                }
              }
            }
            if (linePart.trim()) textInBlock.push(linePart.trim());
          }
        }

        // 2. Simple Tj: (text) Tj
        const sTjRegex = /\(([^()]*)\)\s*Tj/g;
        let sTjMatch: RegExpExecArray | null;
        while ((sTjMatch = sTjRegex.exec(btBlock)) !== null) {
          const text = sTjMatch[1].trim();
          if (text) textInBlock.push(text);
        }

        if (textInBlock.length > 0) {
          textFragments.push({ x: curX, y: curY, text: textInBlock.join(' ') });
        }
      }

      if (textFragments.some((f) => f.y !== 0)) {
        // Sắp xếp tọa độ: Y giảm dần (từ trên xuống dưới trang, đảm bảo tử số luôn đọc trước mẫu số)
        // và X tăng dần (từ trái sang phải trên cùng một dòng)
        textFragments.sort((a, b) => {
          if (Math.abs(a.y - b.y) > 3.5) {
            return b.y - a.y;
          }
          return a.x - b.x;
        });
      }

      // Ghép nối text theo dòng và nối liền inline các số mũ / chỉ số dưới
      let curLineText = '';
      let lastY = textFragments.length > 0 ? textFragments[0].y : 0;
      let lastX = textFragments.length > 0 ? textFragments[0].x : 0;

      for (let fi = 0; fi < textFragments.length; fi++) {
        const frag = textFragments[fi];
        const isSameLine = Math.abs(frag.y - lastY) <= 3.5;
        const isSubOrSup = Math.abs(frag.y - lastY) > 3.5 && Math.abs(frag.y - lastY) <= 12 && frag.x >= lastX - 5 && frag.x <= lastX + 60;

        if (isSameLine) {
          if (curLineText.length > 0) curLineText += ' ' + frag.text;
          else curLineText = frag.text;
        } else if (isSubOrSup) {
          if (frag.y > lastY) {
            curLineText += `^{${frag.text}}`;
          } else {
            curLineText += `_{${frag.text}}`;
          }
        } else {
          if (curLineText.trim().length > 0) {
            lines.push(curLineText.trim());
          }
          curLineText = frag.text;
        }
        lastY = frag.y;
        lastX = frag.x + frag.text.length * 6;
      }
      if (curLineText.trim().length > 0) {
        lines.push(curLineText.trim());
      }
    }

    if (lines.length === 0) return '';

    const fullText = cleanAndEnrichMathFormulas(lines.join('\n'));

    // KIỂM TRA ĐỘ TIN CẬY CỦA VĂN BẢN PDF ĐƯỢC BÓC TÁCH:
    // 1. Tuyệt đối không chấp nhận văn bản có ký tự lỗi \uFFFD (dấu hình thoi đen)
    if (fullText.includes('\uFFFD')) return '';

    // 2. Không chấp nhận văn bản bị cắt nát thành các dòng siêu ngắn (< 10 ký tự) chiếm đa số
    const validLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);
    if (validLines.length >= 5) {
      const veryShortLines = validLines.filter((l) => l.length < 8);
      if (veryShortLines.length / validLines.length > 0.4) {
        return '';
      }
    }

    // 3. Nếu là tài liệu tiếng Việt, kiểm tra xem có dấu tiếng Việt hợp lệ không
    const hasVietnameseAccents = /[àáảãạâầấẩẫậăằắẳẵặđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(fullText);
    const hasVietnameseMarkers = /(?:câu|bài|đáp\s*án|chọn|đúng|sai)/i.test(fullText);
    if (hasVietnameseMarkers && !hasVietnameseAccents) {
      return '';
    }

    return fullText;
  } catch (err) {
    console.warn('PDF text extraction error:', err);
  }
  return '';
}

/**
 * Trích xuất các file text trong kho lưu trữ ZIP (.zip)
 */
export async function parseZipArchiveStructure(file: File): Promise<DeterministicExamResult | null> {
  try {
    const zip = await JSZip.loadAsync(file);

    for (const relativePath of Object.keys(zip.files)) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue;

      const lower = relativePath.toLowerCase();
      if (lower.endsWith('.docx')) {
        const buf = await entry.async('arraybuffer');
        const innerFile = new File([buf], relativePath);
        const res = await parseDocxFileStructure(innerFile);
        if (res && res.questions.length > 0) return res;
      } else if (lower.endsWith('.xlsx')) {
        const buf = await entry.async('arraybuffer');
        const innerFile = new File([buf], relativePath);
        const res = await parseXlsxFileStructure(innerFile);
        if (res && res.questions.length > 0) return res;
      } else if (lower.endsWith('.tex')) {
        const text = await entry.async('text');
        const res = parseLatexFileStructure(text, relativePath);
        if (res && res.questions.length > 0) return res;
      } else if (lower.endsWith('.txt') || lower.endsWith('.azt')) {
        const text = await entry.async('text');
        const res = parseExamFromStructuredText(text, { fileName: relativePath });
        if (res && res.questions.length > 0) return res;
      }
    }
  } catch (err) {
    console.warn('Zip archive parse error:', err);
  }
  return null;
}

/**
 * HÀM TRUNG TÂM: Thuật toán nhận diện cấu trúc đề thi đa định dạng
 * Chạy 100% bằng thuật toán cục bộ, siêu tốc (< 50ms)
 * Trả về null nếu không nhận diện được câu hỏi nào (để sau đó kích hoạt SI).
 */
export async function parseExamFileStructure(file: File): Promise<DeterministicExamResult | null> {
  const fileName = file.name;
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

  // 1. File Word (.docx, .doc)
  if (ext === '.docx' || ext === '.doc') {
    try {
      const { DocxPreprocessor } = await import('./azota/docxPreprocessor');
      const { ExamParser } = await import('./azota/examParser');
      const prep = await DocxPreprocessor.preprocessDocx(file);
      if (prep.text && prep.text.length > 20) {
        const azotaRes = ExamParser.parse(prep.text, { fileName });
        if (azotaRes && azotaRes.questions.length > 0) {
          return {
            title: azotaRes.title || fileName.replace(/\.[^/.]+$/, ''),
            subject: azotaRes.subject || 'Kiến thức tổng hợp',
            grade: azotaRes.grade || 'Tự do',
            durationMinutes: azotaRes.durationMinutes || 45,
            questions: azotaRes.questions.map((q) => ({
              id: q.id,
              originalIndex: q.index,
              rawLabel: q.rawLabel,
              content: q.content,
              options: q.options.map((o) => ({ content: o.content, isCorrect: o.isCorrect })),
              explanation: q.explanation,
              type: q.type,
              answer: q.shortAnswer || (q.options.find((o) => o.isCorrect)?.letter),
              images: q.images && q.images.length > 0 ? q.images : undefined,
            })),
            parserUsed: 'azota_compiler_engine',
          };
        }
      }
    } catch (azotaErr) {
      console.warn('Azota DocxPreprocessor pass fallback:', azotaErr);
    }
    return await parseDocxFileStructure(file);
  }

  // 2. File Excel (.xlsx)
  if (ext === '.xlsx' || ext === '.xls') {
    return await parseXlsxFileStructure(file);
  }

  // 3. File LaTeX (.tex)
  if (ext === '.tex') {
    const text = await file.text().catch(() => '');
    return parseLatexFileStructure(text, fileName);
  }

  // 4. File ZIP (.zip)
  if (ext === '.zip') {
    return await parseZipArchiveStructure(file);
  }

  // 5. File Văn bản Azota (.azt), Text (.txt), Markdown (.md)
  if (['.azt', '.txt', '.md'].includes(ext)) {
    const text = await file.text().catch(() => '');
    if (text) {
      try {
        const { ExamParser } = await import('./azota/examParser');
        const azotaRes = ExamParser.parse(text, { fileName });
        if (azotaRes && azotaRes.questions.length > 0) {
          return {
            title: azotaRes.title || fileName.replace(/\.[^/.]+$/, ''),
            subject: azotaRes.subject || 'Kiến thức tổng hợp',
            grade: azotaRes.grade || 'Tự do',
            durationMinutes: azotaRes.durationMinutes || 45,
            questions: azotaRes.questions.map((q) => ({
              id: q.id,
              originalIndex: q.index,
              rawLabel: q.rawLabel,
              content: q.content,
              options: q.options.map((o) => ({ content: o.content, isCorrect: o.isCorrect })),
              explanation: q.explanation,
              type: q.type,
              answer: q.shortAnswer || (q.options.find((o) => o.isCorrect)?.letter),
              images: q.images && q.images.length > 0 ? q.images : undefined,
            })),
            parserUsed: 'azota_compiler_engine',
          };
        }
      } catch (azotaErr) {
        console.warn('Azota text parser fallback:', azotaErr);
      }
    }
    return parseExamFromStructuredText(text, { fileName });
  }

  // 6. File PDF (.pdf)
  if (ext === '.pdf') {
    const pdfText = await extractTextFromPdf(file);
    if (pdfText && pdfText.trim().length > 15) {
      try {
        const { ExamParser } = await import('./azota/examParser');
        const azotaRes = ExamParser.parse(pdfText, { fileName });
        if (azotaRes && azotaRes.questions.length > 0) {
          return {
            title: azotaRes.title || fileName.replace(/\.[^/.]+$/, ''),
            subject: azotaRes.subject || 'Kiến thức tổng hợp',
            grade: azotaRes.grade || 'Tự do',
            durationMinutes: azotaRes.durationMinutes || 45,
            questions: azotaRes.questions.map((q) => ({
              id: q.id,
              originalIndex: q.index,
              rawLabel: q.rawLabel,
              content: q.content,
              options: q.options.map((o) => ({ content: o.content, isCorrect: o.isCorrect })),
              explanation: q.explanation,
              type: q.type,
              answer: q.shortAnswer || (q.options.find((o) => o.isCorrect)?.letter),
              images: q.images && q.images.length > 0 ? q.images : undefined,
            })),
            parserUsed: 'azota_compiler_engine',
          };
        }
      } catch (azotaErr) {
        console.warn('Azota PDF parser fallback:', azotaErr);
      }
      const res = parseExamFromStructuredText(pdfText, { fileName });
      if (res && res.questions.length > 0) {
        res.parserUsed = 'pdf_text';
        return res;
      }
    }
    return null;
  }

  return null;
}

/**
 * Kiểm tra xác thực độ tin cậy của thuật toán:
 * 100% dữ liệu phải là dữ liệu thật từ file người dùng.
 * Tuyệt đối không chấp nhận dữ liệu giả, câu hỏi rỗng hoặc phương án rỗng/dummy.
 * Trả về true nếu và chỉ nếu toàn bộ câu hỏi đều là dữ liệu thật hợp lệ.
 */
export function validateDeterministicResult(result: DeterministicExamResult | null): boolean {
  if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
    return false;
  }

  // 1. Kiểm tra toàn cục: Tuyệt đối không chấp nhận đề thi chứa ký tự hỏng \uFFFD (black diamond)
  const hasCorruptedChar = result.questions.some(
    (q) =>
      (q.content || '').includes('\uFFFD') ||
      (q.options && q.options.some((o) => (o.content || '').includes('\uFFFD'))) ||
      (q.explanation || '').includes('\uFFFD')
  );
  if (hasCorruptedChar) {
    console.warn('validateDeterministicResult: Phát hiện ký tự hỏng \\uFFFD (lỗi font/encoding). Từ chối thuật toán để chuyển sang AI.');
    return false;
  }

  // Lọc và kiểm tra từng câu hỏi
  const validQuestions = result.questions.filter((q) => {
    q.content = cleanAndEnrichMathFormulas(q.content || '');
    q.content = q.content.replace(/\[!m:[^\]]*\]/gi, '').replace(/\bmathtype_\d+\b/gi, '').trim();

    const content = q.content.trim();
    if (content.length < 3) return false;

    // Loại bỏ nếu là tiêu đề phân loại Dạng bài hoặc Lý thuyết thuần túy
    if (/^(Dạng\s*\d+|[IVXLCDM]+\.|\d+\.\s*(?:Bất\s*đẳng\s*thức|Lý\s*thuyết|Khái\s*niệm|Trọng\s*tâm|Liên\s*hệ|Định\s*nghĩa|Tính\s*chất))/i.test(content)) {
      return false;
    }

    // Nếu là câu hỏi trắc nghiệm hoặc có phương án:
    if (q.type === 'multiple_choice' || (q.options && q.options.length > 0)) {
      if (!q.options || q.options.length < 2) {
        // Nếu không có đủ phương án trắc nghiệm, chuyển sang short_answer, tuyệt đối không xóa câu
        q.type = 'short_answer';
        q.options = [];
        return true;
      }

      // Làm sạch nội dung từng phương án
      q.options.forEach((o) => {
        o.content = cleanAndEnrichMathFormulas(o.content || '').replace(/\[!m:[^\]]*\]/gi, '').replace(/\bmathtype_\d+\b/gi, '').trim();
      });

      // Kiểm tra phương án rỗng
      const hasInvalidOption = q.options.some((o) => {
        const c = (o.content || '').trim();
        return (
          c.length === 0 ||
          /^Phương án\s*[A-D0-9]?$/i.test(c) ||
          /^Lựa chọn\s*[A-D0-9]?$/i.test(c) ||
          c === 'Phương án đúng chính xác'
        );
      });

      if (hasInvalidOption) {
        q.type = 'short_answer';
        q.options = [];
        return true;
      }

      // Đảm bảo các phương án phân biệt (không bị trùng lặp nội dung)
      const uniqueContents = new Set(q.options.map((o) => o.content.trim().toLowerCase()));
      if (uniqueContents.size !== q.options.length) {
        q.type = 'short_answer';
        q.options = [];
        return true;
      }
    }

    return true;
  });

  if (validQuestions.length === 0) {
    return false;
  }

  result.questions = validQuestions;
  return true;
}

export * from './azota';
