import mammoth from 'mammoth';
import JSZip from 'jszip';
import { cleanLeakedOleGarbage } from './mtefParser';

export interface ParsedQuestionOption {
  content: string;
  isCorrect: boolean;
  hasFormatting?: boolean;
}

export type QuestionType = 'multiple_choice' | 'essay' | 'fill_blank' | 'true_false' | 'short_answer';

export interface ParsedQuestion {
  id: string;
  rawLabel?: string;
  content: string;
  options: ParsedQuestionOption[];
  points: number;
  explanation?: string;
  type?: QuestionType;
  answer?: string;
}

export interface ParsedQuiz {
  title: string;
  description: string;
  questions: ParsedQuestion[];
}

/**
 * Strips HTML tags from text
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

interface ExtractedOptionItem {
  letter: string;
  content: string;
  isBold: boolean;
  isColored: boolean;
  isHighlighted: boolean;
  isUnderlined: boolean;
  isMarker: boolean;
  colorValue?: string;
  hasDistinctFormatting?: boolean;
}

/**
 * Inspects HTML segment for formatting traits (bold, color, highlight, underline, marker)
 */
function getOptionFormatting(htmlSegment: string): {
  isBold: boolean;
  isColored: boolean;
  isHighlighted: boolean;
  isUnderlined: boolean;
  isMarker: boolean;
  colorValue?: string;
} {
  if (!htmlSegment) {
    return { isBold: false, isColored: false, isHighlighted: false, isUnderlined: false, isMarker: false };
  }

  const isBold = /<(strong|b)\b/i.test(htmlSegment) || /font-weight\s*:\s*(bold|[6-9]00)/i.test(htmlSegment);
  const isUnderlined = /<u\b/i.test(htmlSegment) || /text-decoration\s*:\s*underline/i.test(htmlSegment);
  const isHighlighted = /<mark\b/i.test(htmlSegment) || /background(-color)?\s*:/i.test(htmlSegment);

  const colorMatch = htmlSegment.match(/(?:color\s*:\s*|color\s*=\s*["']?)(#[0-9a-f]{3,6}|rgb\([^)]+\)|[a-z]+)/i);
  const isColored = Boolean(colorMatch && !/black|#000|#000000|inherit|initial/i.test(colorMatch[1]));

  const clean = stripHtml(htmlSegment);
  const isMarker = /^[\*\[\(]?[A-D][\*\]]/i.test(clean) || clean.includes('*') || clean.toLowerCase().includes('[x]');

  return {
    isBold,
    isColored,
    isHighlighted,
    isUnderlined,
    isMarker,
    colorValue: colorMatch ? colorMatch[1] : undefined,
  };
}

/**
 * Extracts multiple options from an HTML or text line/paragraph
 * Handles side-by-side options: "A. 8 B. 10 C. 11 D. 7" with HTML styling preserved
 */
function extractOptionsFromLine(lineHtml: string): ExtractedOptionItem[] {
  const optionPrefixRegex = /(?:^|>|\s)([\*\[\(]?[A-D][\*\.\:\)\s\]])/gi;
  const matches: { index: number; segStart: number; startIndex: number; prefix: string; letter: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = optionPrefixRegex.exec(lineHtml)) !== null) {
    const rawPrefix = stripHtml(match[1]).toUpperCase();
    const letter = rawPrefix.replace(/[^A-D]/g, '');
    if (letter.length === 1) {
      const matchIndex = match.index + match[0].indexOf(match[1]);

      let segStart = matchIndex;
      const beforeStr = lineHtml.substring(0, segStart);
      const lastTags = beforeStr.match(/(?:<(?:span|mark|strong|b|em|i|u)[^>]*>)+$/i);
      if (lastTags) {
        segStart -= lastTags[0].length;
      }

      matches.push({
        index: matchIndex,
        segStart: segStart,
        startIndex: matchIndex + match[1].length,
        prefix: match[1],
        letter,
      });
    }
  }

  if (matches.length === 0) return [];

  const results: ExtractedOptionItem[] = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;
    const endIndex = nextMatch ? nextMatch.segStart : lineHtml.length;

    const rawOptionSegment = lineHtml.substring(curr.segStart, endIndex).trim();
    const rawContentSegment = lineHtml.substring(curr.startIndex, endIndex).trim();
    const cleanContent = stripHtml(rawContentSegment).replace(/[\*\.\:\)\s\]]+$/, '').trim();

    // Strip trailing opening HTML tags that belong to the NEXT option
    const cleanSegment = rawOptionSegment.replace(/(?:<(?:span|mark|strong|b|em|i|u)[^>]*>)+\s*$/i, '');
    const fmt = getOptionFormatting(cleanSegment);

    // TUYỆT ĐỐI 100% không tự ý điền dữ liệu giả như `Phương án ${curr.letter}`
    results.push({
      letter: curr.letter,
      content: cleanContent,
      ...fmt,
    });
  }

  // Nếu bất kỳ phương án nào bị rỗng (ví dụ công thức MathType/ảnh không đọc được chữ),
  // thuật toán từ chối coi đây là câu trắc nghiệm hợp lệ
  if (results.some((o) => !o.content || o.content.trim().length === 0)) {
    return [];
  }

  return results;
}

/**
 * Helper to process options array according to baseline rules
 */
function processQuestionOptions(opts: ExtractedOptionItem[]): ParsedQuestionOption[] {
  if (opts.length === 0) return [];

  const allBold = opts.length > 0 && opts.every((o) => o.isBold);
  const allUnderlined = opts.length > 0 && opts.every((o) => o.isUnderlined);
  const allHighlighted = opts.length > 0 && opts.every((o) => o.isHighlighted);
  const allColoredSame = opts.length > 0 && opts.every((o) => o.isColored && o.colorValue === opts[0].colorValue);

  opts.forEach((o) => {
    const distinctBold = o.isBold && !allBold;
    const distinctUnderline = o.isUnderlined && !allUnderlined;
    const distinctHighlight = o.isHighlighted && !allHighlighted;
    const distinctColor = o.isColored && !allColoredSame;

    o.hasDistinctFormatting = distinctBold || distinctUnderline || distinctHighlight || distinctColor || o.isMarker;
  });

  const distinctOpts = opts.filter((o) => o.hasDistinctFormatting);
  return opts.map((o) => ({
    content: o.content,
    isCorrect: distinctOpts.length === 1 && Boolean(o.hasDistinctFormatting),
  }));
}

/**
 * Extracts questions and options from HTML or text content of exam file (.docx or .txt)
 */
export function parseExamContent(inputContent: string, titleHint: string = 'Đề thi tự động'): ParsedQuiz {
  // Split paragraphs while keeping HTML structure
  const lines = inputContent
    .split(/(?:<\/p>|<br\s*\/?>|\r?\n)/i)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ParsedQuestion[] = [];
  let currentQuestion: {
    id: string;
    content: string;
    options: ExtractedOptionItem[];
    points: number;
  } | null = null;
  const answerKeyMap: Record<number, string> = {};

  // Check for answer key block at bottom (e.g. "Đáp án: 1A 2B 3C" or "1.A 2.B 3.C")
  const fullCleanText = lines.map((l) => stripHtml(l)).join(' ');
  const answerKeyRegex = /(?:Đáp án|ĐÁP ÁN|Key)\s*[:\-]?\s*([0-9A-Za-z\s\.,\-:\;\)\(]+)/i;
  const keyMatch = fullCleanText.match(answerKeyRegex);
  if (keyMatch && keyMatch[1]) {
    const keyStr = keyMatch[1];
    const keyRegex = /(\d+)[\s\.\:\)\-]*([A-D])/gi;
    let p: RegExpExecArray | null;
    while ((p = keyRegex.exec(keyStr)) !== null) {
      answerKeyMap[parseInt(p[1], 10)] = p[2].toUpperCase();
    }
  }

  // Regex patterns for Question start
  const questionRegex = /^(?:Câu|câu|Question|Bài|CH)\s*(\d+)[\.\:\s\-]+(.*)/i;
  const numberedQuestionRegex = /^(\d+)[\.\)]\s+(.*)/;

  let qIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const lineHtml = lines[i];
    const cleanLine = stripHtml(lineHtml);

    // Check Question Start
    let qMatch = cleanLine.match(questionRegex) || cleanLine.match(numberedQuestionRegex);

    if (qMatch) {
      if (currentQuestion) {
        questions.push({
          id: currentQuestion.id,
          content: currentQuestion.content,
          points: currentQuestion.points,
          options: processQuestionOptions(currentQuestion.options),
          type: currentQuestion.options.length >= 2 ? 'multiple_choice' : 'essay',
        });
      }

      qIndex++;
      const qNum = parseInt(qMatch[1], 10) || qIndex;
      const qContent = qMatch[2] ? qMatch[2].trim() : '';

      currentQuestion = {
        id: `q_${Date.now()}_${qIndex}`,
        content: qContent,
        options: [],
        points: 1.0,
      };
      continue;
    }

    // Try extracting options from the lineHtml (single or multiple A. B. C. D. per line)
    const extractedOpts = extractOptionsFromLine(lineHtml);
    if (extractedOpts.length > 0 && currentQuestion) {
      for (const opt of extractedOpts) {
        currentQuestion.options.push(opt);
      }
      continue;
    }

    // Append text to current question content or last option content
    if (currentQuestion) {
      if (currentQuestion.options.length === 0) {
        currentQuestion.content += ' ' + cleanLine;
      } else {
        const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
        lastOpt.content += ' ' + cleanLine;
        const fmt = getOptionFormatting(lineHtml);
        if (fmt.isBold) lastOpt.isBold = true;
        if (fmt.isColored) lastOpt.isColored = true;
        if (fmt.isHighlighted) lastOpt.isHighlighted = true;
        if (fmt.isUnderlined) lastOpt.isUnderlined = true;
      }
    }
  }

  // Push last question if any
  if (currentQuestion) {
    questions.push({
      id: currentQuestion.id,
      content: cleanLeakedOleGarbage(currentQuestion.content),
      points: currentQuestion.points,
      options: processQuestionOptions(currentQuestion.options).map((opt) => ({
        ...opt,
        content: cleanLeakedOleGarbage(opt.content),
      })),
      type: currentQuestion.options.length >= 2 ? 'multiple_choice' : 'essay',
    });
  }

  // Apply Answer Key Mapping if explicit Answer Key exists at bottom
  questions.forEach((q, idx) => {
    const qNum = idx + 1;
    const keyTargetLetter = answerKeyMap[qNum];

    if (keyTargetLetter) {
      q.options.forEach((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        opt.isCorrect = letter === keyTargetLetter;
      });
    }
  });

  return {
    title: titleHint.replace(/\.(docx|txt)$/i, ''),
    description: `Đề thi tự động bóc tách từ file với ${questions.length} câu hỏi`,
    questions,
  };
}

/**
 * Parses file object (.docx or .txt) using native JSZip Word document.xml reader
 * for 100% accurate color and highlight extraction!
 */
import { parseDocxFileStructure } from './examStructureParser';

export async function parseDocxFile(file: File): Promise<ParsedQuiz> {
  const fileName = file.name;
  try {
    const res = await parseDocxFileStructure(file);
    if (res && res.questions.length > 0) {
      return {
        title: res.title || fileName.replace(/\.[^/.]+$/, ''),
        description: `Đề thi bóc tách từ file với ${res.questions.length} câu hỏi`,
        questions: res.questions.map((q, idx) => ({
          id: q.id || `q_${idx + 1}`,
          rawLabel: q.rawLabel,
          content: q.content,
          options: q.options || [],
          points: q.points || 1.0,
          explanation: q.explanation,
          type: q.type,
          answer: q.answer,
        })),
      };
    }
  } catch (e) {
    console.warn('parseDocxFileStructure fallback:', e);
  }

  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docXml = await zip.file('word/document.xml')?.async('text');

      if (docXml) {
        const pRegex = /<w:p\b[\s\S]*?<\/w:p>/g;
        let pMatch: RegExpExecArray | null;
        const htmlLines: string[] = [];

        while ((pMatch = pRegex.exec(docXml)) !== null) {
          const pXml = pMatch[0];
          const rRegex = /<w:r\b[\s\S]*?<\/w:r>/g;
          let rMatch: RegExpExecArray | null;
          let pHtml = '';

          while ((rMatch = rRegex.exec(pXml)) !== null) {
            const rXml = rMatch[0];
            const tMatch = rXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/);
            if (tMatch) {
              let text = tMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"');

              const rPrMatch = rXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/);
              if (rPrMatch) {
                const rPr = rPrMatch[0];
                const colorMatch = rPr.match(/<w:color\b[^>]*w:val=["']([^"']+)["']/);
                const hlMatch = rPr.match(/<w:highlight\b[^>]*w:val=["']([^"']+)["']/);
                const isBold = rPr.includes('<w:b/>') || rPr.includes('<w:b ') || rPr.includes('<w:bCs');
                const isUnderline = rPr.includes('<w:u ') || rPr.includes('<w:u/>');

                if (colorMatch && colorMatch[1] !== 'auto') {
                  text = `<span style="color:#${colorMatch[1]}">${text}</span>`;
                }
                if (hlMatch) {
                  text = `<mark>${text}</mark>`;
                }
                if (isUnderline) {
                  text = `<u>${text}</u>`;
                }
                if (isBold) {
                  text = `<strong>${text}</strong>`;
                }
              }
              pHtml += text;
            }
          }
          if (pHtml.trim()) {
            htmlLines.push(`<p>${pHtml}</p>`);
          }
        }

        const generatedHtml = htmlLines.join('\n');
        return parseExamContent(generatedHtml, fileName);
      }
    } catch (err) {
      console.error('JSZip docx parse error, falling back to mammoth:', err);
    }

    // Fallback to mammoth if JSZip fails
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return parseExamContent(result.value, fileName);
  } else {
    const text = await file.text();
    return parseExamContent(text, fileName);
  }
}
