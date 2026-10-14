import { NextRequest, NextResponse } from 'next/server';
import { parseExamFromStructuredText, validateDeterministicResult } from '@/lib/examStructureParser';
import { validateAndSanitizeQuestions, cleanVietnameseEncoding } from '@/lib/questionValidator';
import { generateCurriculumFallbackExam } from './curriculumFallback';

interface QuestionOption {
  content: string;
  isCorrect: boolean;
}

interface GeneratedQuestion {
  content: string;
  options: QuestionOption[];
  explanation?: string;
  points?: number;
}

interface GeneratedExamResponse {
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  questions: GeneratedQuestion[];
  modelUsed?: string;
}

/**
 * Làm sạch và parse chuỗi JSON từ phản hồi của AI
 */
function cleanAndParseJson<T>(rawText: string): T | null {
  if (!rawText) return null;

  // 1. Loại bỏ các khối suy nghĩ <think>...</think>
  let text = rawText.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '').trim();

  // 2. Trích xuất JSON từ markdown block ```json ... ``` hoặc khối {} / []
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      const lastBracket = text.lastIndexOf(']');
      if (lastBracket > firstBracket) {
        text = text.substring(firstBracket, lastBracket + 1);
      }
    } else if (firstBrace !== -1) {
      const lastBrace = text.lastIndexOf('}');
      if (lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
      }
    }
  }

  // 3. Thử parse trực tiếp
  try {
    return JSON.parse(text);
  } catch {
    // 4. Khử các lỗi ký tự thoát dấu gạch chéo hoặc dấu phẩy thừa, sửa lỗi unicode escape như \underline
    try {
      const sanitized = text
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\\u(?![0-9a-fA-F]{4})/gi, '\\\\u')
        .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

/**
 * Trình phân tích câu hỏi dạng văn bản Markdown / Tiếng Việt chuẩn (Câu 1: ... A. ... B. ... Lời giải: ...)
 */
function parseMarkdownQuestions(rawText: string): GeneratedQuestion[] {
  if (!rawText) return [];
  const text = rawText.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '').trim();

  // Tách từng câu theo mẫu "Câu 1:", "Câu 1.", "Câu 1 -", "Bài 1:"
  const parts = text.split(/(?:^|\n)(?=(?:Câu\s*\d+|Bài\s*\d+|\d+\.)[\s:.-]+)/i);
  const questions: GeneratedQuestion[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const optionMatches = Array.from(trimmed.matchAll(/(?:^|\n)\s*([A-D])[\s.)]+([^\n]+)/g));
    if (optionMatches.length < 2) continue;

    const firstOptIndex = trimmed.indexOf(optionMatches[0][0]);
    let questionContent = trimmed.substring(0, firstOptIndex).trim();
    questionContent = questionContent.replace(/^(?:Câu\s*\d+|Bài\s*\d+|\d+\.)[\s:.-]*/i, '').trim();

    if (!questionContent || questionContent.length < 5) continue;

    const ansMatch = trimmed.match(/(?:Đáp\s*án|Chọn|Câu\s*đúng|Key)[\s:.-]*([A-D])/i);
    const correctLetter = ansMatch ? ansMatch[1].toUpperCase() : '';

    const expMatch = trimmed.match(/(?:Giải\s*thích|Lời\s*giải|Hướng\s*dẫn\s*giải)[\s:.-]+([\s\S]+)$/i);
    const explanation = expMatch ? expMatch[1].trim() : 'Lời giải chi tiết từ SI.';

    const options: QuestionOption[] = optionMatches.map((m) => {
      const letter = m[1].toUpperCase();
      let optText = m[2].trim();
      optText = optText.replace(/(?:Đáp\s*án|Giải\s*thích|Lời\s*giải)[\s\S]*$/i, '').trim();
      const isCorrect = correctLetter ? letter === correctLetter : false;
      return {
        content: `${letter}. ${optText}`,
        isCorrect,
      };
    });

    if (options.length >= 2) {
      questions.push({
        content: questionContent,
        options,
        explanation,
      });
    }
  }

  return questions;
}

/**
 * Trình quét phục hồi câu hỏi từ văn bản phản hồi của AI nếu parse JSON trực tiếp bị lỗi
 */
function extractQuestionsFromAiOutput(rawText: string): any {
  if (!rawText) return null;
  const text = rawText.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '').trim();

  const questions: GeneratedQuestion[] = [];
  const objBlocks: string[] = [];

  let inString = false;
  let escape = false;
  let depth = 0;
  let startIndex = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && !escape) inString = !inString;
    if (!inString) {
      if (char === '{') {
        if (depth === 0) startIndex = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && startIndex !== -1) {
          objBlocks.push(text.substring(startIndex, i + 1));
          startIndex = -1;
        }
      }
    }
    escape = inString && char === '\\' ? !escape : false;
  }

  for (const block of objBlocks) {
    if ((block.includes('"question"') || block.includes('"content"')) && (block.includes('"options"') || block.includes('"answers"'))) {
      try {
        const sanitized = block
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/\\u(?![0-9a-fA-F]{4})/gi, '\\\\u')
          .replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
        const parsed = JSON.parse(sanitized);
        const rawQ = parsed.content || parsed.question;
        const qContent = typeof rawQ === 'string'
          ? rawQ
              .replace(/^(?:(?:Câu|câu|CÂU|Question|QUESTION|Bài\s*tập|BÀI\s*TẬP|Bài|BÀI|CH|Ví\s*dụ|VÍ\s*DỤ|Luyện\s*tập|Vận\s*dụng|Dạng)\s*(?:\d+|[IVXLCDM]+)[\s:.-]*|(?:\d+)[\.\)]\s+)/i, '')
              .replace(/^[:.-]+\s*/, '')
              .trim()
          : '';

        if (qContent && Array.isArray(parsed.options) && parsed.options.length >= 2) {
          const ansKey = String(parsed.answer || parsed.correct_answer || '').trim();
          let hasDummy = false;
          const opts: QuestionOption[] = [];

          for (let idx = 0; idx < parsed.options.length; idx++) {
            const o = parsed.options[idx];
            let optText = '';
            let isCorrect = false;

            if (typeof o === 'string') {
              optText = o.trim();
              isCorrect = Boolean(
                ansKey && (
                  optText.toLowerCase() === ansKey.toLowerCase() ||
                  optText.toLowerCase().startsWith(ansKey.toLowerCase() + '.') ||
                  ((ansKey === 'A' || ansKey === '1') && idx === 0) ||
                  ((ansKey === 'B' || ansKey === '2') && idx === 1) ||
                  ((ansKey === 'C' || ansKey === '3') && idx === 2) ||
                  ((ansKey === 'D' || ansKey === '4') && idx === 3)
                )
              );
            } else if (typeof o === 'object' && o !== null) {
              optText = String(o.content || o.text || '').trim();
              isCorrect = Boolean(o.isCorrect || o.correct || (ansKey && optText.toLowerCase() === ansKey.toLowerCase()));
            }

            if (!optText || /^Phương án\s*[A-D0-9]?$/i.test(optText) || /^Lựa chọn\s*[A-D0-9]?$/i.test(optText)) {
              hasDummy = true;
              break;
            }

            opts.push({ content: optText, isCorrect });
          }

          if (!hasDummy && opts.length >= 2) {
            questions.push({
              content: qContent,
              options: opts,
              explanation: parsed.explanation || 'Lời giải chi tiết.',
            });
          }
        }
      } catch {}
    }
  }

  if (questions.length > 0) {
    const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/);
    const subjectMatch = text.match(/"subject"\s*:\s*"([^"]+)"/);
    const gradeMatch = text.match(/"grade"\s*:\s*"([^"]+)"/);
    return {
      title: titleMatch ? titleMatch[1] : undefined,
      subject: subjectMatch ? subjectMatch[1] : undefined,
      grade: gradeMatch ? gradeMatch[1] : undefined,
      questions,
    };
  }

  // Thử parse qua markdown format
  const mdQuestions = parseMarkdownQuestions(text);
  if (mdQuestions.length > 0) {
    return {
      questions: mdQuestions,
    };
  }

  return null;
}

/**
 * Tự động nhận diện chủ đề, môn học và khối lớp từ văn bản hoặc mô tả
 */
function detectDocumentTopicAndSubject(text: string, fileName?: string): { subject: string; grade: string; title: string } {
  const combined = `${fileName || ''} ${text || ''}`.toLowerCase();

  let subject = 'Kiến thức tổng hợp';
  let grade = '12';

  if (combined.includes('doanh nghiệp') || combined.includes('thuế') || combined.includes('pháp luật') || combined.includes('kinh tế') || combined.includes('hợp đồng') || combined.includes('gdcd')) {
    subject = 'Kinh tế & Pháp luật';
  } else if (combined.includes('hóa học') || combined.includes('axit') || combined.includes('bazơ') || combined.includes('nguyên tử') || combined.includes('phản ứng')) {
    subject = 'Hóa học';
  } else if (combined.includes('sinh học') || combined.includes('tế bào') || combined.includes('di truyền') || combined.includes('adn') || combined.includes('quang hợp')) {
    subject = 'Sinh học';
  } else if (combined.includes('vật lý') || combined.includes('vật lí') || combined.includes('vận tốc') || combined.includes('gia tốc') || combined.includes('điện tích') || combined.includes('newton')) {
    subject = 'Vật lý';
  } else if (combined.includes('lịch sử') || combined.includes('chiến dịch') || combined.includes('cách mạng') || combined.includes('kháng chiến') || combined.includes('năm 1945') || combined.includes('hiệp định')) {
    subject = 'Lịch sử';
  } else if (combined.includes('địa lý') || combined.includes('địa lí') || combined.includes('khí hậu') || combined.includes('địa hình') || combined.includes('sông ngòi')) {
    subject = 'Địa lý';
  } else if (combined.includes('ngữ văn') || combined.includes('văn học') || combined.includes('tác phẩm') || combined.includes('nhân vật') || combined.includes('đoạn trích')) {
    subject = 'Ngữ văn';
  } else if (combined.includes('tiếng anh') || combined.includes('english') || combined.includes('grammar') || combined.includes('vocabulary')) {
    subject = 'Tiếng Anh';
  } else if (combined.includes('tin học') || combined.includes('thuật toán') || combined.includes('lập trình') || combined.includes('python')) {
    subject = 'Tin học';
  } else if (combined.includes('toán') || combined.includes('phương trình') || combined.includes('hàm số') || combined.includes('đạo hàm') || combined.includes('hình học') || combined.includes('tích phân')) {
    subject = 'Toán';
  }

  for (let i = 12; i >= 1; i--) {
    if (combined.includes(`lớp ${i}`) || combined.includes(`lop ${i}`) || combined.includes(`khối ${i}`)) {
      grade = i.toString();
      break;
    }
  }

  const cleanFileName = (fileName || '').replace(/\.[^/.]+$/, '').trim();
  const title = cleanFileName ? `Bài kiểm tra: ${cleanFileName}` : `Đề kiểm tra môn ${subject}`;

  return { subject, grade, title };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = 'topic', // 'topic' | 'ocr' | 'file' | 'document' | 'suggest'
      subject = '',
      grade = '',
      topic = '',
      topics = [],
      detailedNotes = '',
      numQuestions = 10,
      difficulty = '',
      imageBase64 = null,
      documentText = '',
      fileName = '',
      model = 'gemini-3.5-flash',
      apiEndpoint = '',
      apiKey = '',
      customPrompt = '',
    } = body;

    const targetCount = mode === 'suggest' ? 1 : Math.max(1, Math.min(Number(numQuestions) || 10, 50));

    // 1. Phân tích và nhận diện chủ đề, môn học, khối lớp
    const rawTopicsList: string[] = Array.isArray(topics) && topics.length > 0
      ? topics.map((t: any) => String(t).trim()).filter(Boolean)
      : (topic ? String(topic).split(/[\n;]+/).map((t) => t.trim()).filter(Boolean) : []);
    const effectiveMergedTopic = rawTopicsList.length > 0
      ? rawTopicsList.join('; ')
      : (customPrompt || topic || (mode === 'suggest' ? 'Kiến thức trọng tâm' : 'Kiến thức tổng hợp'));

    let resolvedSubject = subject && subject.trim() ? subject.trim() : '';
    let resolvedGrade = grade && grade.trim() ? grade.trim() : '';
    let resolvedTitle = '';

    if (documentText || fileName) {
      const detected = detectDocumentTopicAndSubject(documentText, fileName);
      if (!resolvedSubject) resolvedSubject = detected.subject;
      if (!resolvedGrade) resolvedGrade = detected.grade;
      resolvedTitle = detected.title;
    } else {
      const lowerTopic = effectiveMergedTopic.toLowerCase();
      if (!resolvedSubject) {
        if (lowerTopic.includes('sinh học') || lowerTopic.includes('tế bào') || lowerTopic.includes('quang hợp') || lowerTopic.includes('adn') || lowerTopic.includes('di truyền')) resolvedSubject = 'Sinh học';
        else if (lowerTopic.includes('lịch sử') || lowerTopic.includes('kháng chiến') || lowerTopic.includes('chiến dịch') || lowerTopic.includes('cách mạng') || lowerTopic.includes('thế chiến')) resolvedSubject = 'Lịch sử';
        else if (lowerTopic.includes('hóa học') || lowerTopic.includes('axit') || lowerTopic.includes('bazơ') || lowerTopic.includes('phản ứng') || lowerTopic.includes('oxit')) resolvedSubject = 'Hóa học';
        else if (lowerTopic.includes('vật lý') || lowerTopic.includes('vật lí') || lowerTopic.includes('dao động') || lowerTopic.includes('lực') || lowerTopic.includes('điện tích')) resolvedSubject = 'Vật lý';
        else if (lowerTopic.includes('địa lý') || lowerTopic.includes('địa lí') || lowerTopic.includes('khí hậu') || lowerTopic.includes('địa hình')) resolvedSubject = 'Địa lý';
        else if (lowerTopic.includes('ngữ văn') || lowerTopic.includes('văn học') || lowerTopic.includes('truyện kiều') || lowerTopic.includes('thơ')) resolvedSubject = 'Ngữ văn';
        else if (lowerTopic.includes('tin học') || lowerTopic.includes('lập trình') || lowerTopic.includes('python') || lowerTopic.includes('thuật toán')) resolvedSubject = 'Tin học';
        else if (lowerTopic.includes('tiếng anh') || lowerTopic.includes('english') || lowerTopic.includes('grammar') || lowerTopic.includes('vocabulary')) resolvedSubject = 'Tiếng Anh';
        else if (lowerTopic.includes('kinh tế') || lowerTopic.includes('pháp luật') || lowerTopic.includes('gdcd') || lowerTopic.includes('doanh nghiệp')) resolvedSubject = 'Kinh tế & Pháp luật';
        else if (lowerTopic.includes('toán') || lowerTopic.includes('phương trình') || lowerTopic.includes('hệ phương trình') || lowerTopic.includes('hàm số') || lowerTopic.includes('đại số')) resolvedSubject = 'Toán';
        else resolvedSubject = '';
      }

      if (!resolvedGrade) {
        for (let g = 12; g >= 1; g--) {
          if (lowerTopic.includes(`lớp ${g}`) || lowerTopic.includes(`lop ${g}`) || lowerTopic.includes(`khối ${g}`)) {
            resolvedGrade = g.toString();
            break;
          }
        }
      }
    }

    const startTime = Date.now();

    // 0. ƯU TIÊN TUYỆT ĐỐI: Kiểm tra xem văn bản đầu vào (documentText hoặc topic chứa nội dung đề thi) có cấu trúc câu hỏi không
    const candidateStructuredText = (documentText && documentText.trim().length > 20)
      ? documentText
      : (typeof topic === 'string' && topic.trim().length > 30 && /(?:(?:Câu|Bài)\s*\d+|\d+\.)[\s:.-]+/i.test(topic) ? topic : '');

    if (candidateStructuredText) {
      try {
        const directParsed = parseExamFromStructuredText(candidateStructuredText, {
          title: resolvedTitle,
          fileName,
        });
        if (directParsed && validateDeterministicResult(directParsed)) {
          const durationMs = Date.now() - startTime;
          console.log(`[generate-exam API] -> THUẬT TOÁN ĐỊA PHƯƠNG THÀNH CÔNG: Đã bóc tách ${directParsed.questions.length} câu hỏi thật trong ${durationMs}ms (0ms AI)!`);
          return NextResponse.json({
            success: true,
            exam: directParsed,
            modelUsed: 'deterministic-parser-server',
            executionMode: 'deterministic_algorithm',
            processingTimeMs: durationMs,
            isRealData: true,
          });
        } else {
          console.log('[generate-exam API] Thuật toán địa phương chưa giải mã trọn vẹn (có công thức nhị phân MathType hoặc ảnh) -> Kích hoạt SI chuyển giao...');
        }
      } catch (parseErr) {
        console.warn('[generate-exam API] Lỗi thuật toán parse văn bản cấu trúc:', parseErr);
      }
    }

    const effectiveDifficulty = difficulty && difficulty.trim()
      ? difficulty.trim()
      : 'Phân hóa phù hợp từ Nhận biết, Thông hiểu đến Vận dụng';

    let systemPrompt = '';
    let userContent: any = '';

    if (mode === 'ocr' && imageBase64) {
      // 1. Chế độ bóc tách ảnh đề thi qua Vision AI
      systemPrompt = `BẠN LÀ CHUYÊN GIA AI OCR BÓC TÁCH ĐỀ THI TỪ HÌNH ẢNH CHUẨN XÁC 100%.
Nhiệm vụ: Trích xuất trung thực và chính xác toàn bộ câu hỏi, bài tập, công thức toán học và đáp án từ hình ảnh đề thi.

QUY TẮC BẮT BUỘC TUÂN THỦ:
1. TUYỆT ĐỐI 100% KHÔNG TẠO DỮ LIỆU GIẢ:
   - TUYỆT ĐỐI KHÔNG BAO GIỜ tự bịa ra "Phương án A", "Phương án B", "Phương án C", "Phương án D" hoặc các placeholder vô nghĩa.
   - TUYỆT ĐỐI KHÔNG BAO GIỜ trả về các token nội bộ như [!m:$mathtype_X$], mathtype_X, [img:$img_X$]. Mọi công thức toán học BẮT BUỘC phục hồi sang LaTeX chuẩn ($v \\ge 60$, $x < 5$, $a \\le b$).
   - Bắt buộc trích xuất đúng từng chữ, số, công thức toán có trong ảnh.
   - Nếu trong ảnh là câu hỏi trắc nghiệm: trích xuất đúng nội dung từng phương án lựa chọn và đáp án đúng.
   - Nếu trong ảnh là câu hỏi tự luận (Bài 1, Bài 2...): Giữ nguyên câu hỏi tự luận và lời giải (nếu có trên ảnh), KHÔNG tự ý chế ra các phương án A/B/C/D giả.
   - QUY TẮC PHÂN TÍCH SÂU: Lời giải (explanation) BẮT BUỘC phân tích chi tiết từng bước, giải thích vì sao đáp án đúng và vì sao các phương án còn lại sai.
2. TỰ ĐỘNG NHẬN DIỆN MÔN HỌC & KHỐI LỚP:
   - "subject": Xác định đúng môn học từ nội dung câu hỏi trong ảnh (Toán, Vật lý, Hóa học, Tiếng Anh...).
   - "title": Đặt tiêu đề phản ánh đúng nội dung bài học / đề thi trong ảnh.
   - "grade": Khối lớp phù hợp.
3. CHỈ TRẢ VỀ JSON DUY NHẤT HỢP LỆ THEO CẤU TRÚC:
{
  "title": "${resolvedTitle || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Đề thi bóc tách từ ảnh')}",
  "subject": "${resolvedSubject || 'Kiến thức tổng hợp'}",
  "grade": "${resolvedGrade || 'Tự do'}",
  "durationMinutes": 45,
  "questions": [
    {
      "content": "Nội dung câu hỏi trích xuất từ ảnh...",
      "explanation": "Lời giải chi tiết và phân tích sâu...",
      "options": [
        {"content": "Đáp án A thực tế", "isCorrect": false},
        {"content": "Đáp án B thực tế", "isCorrect": true},
        {"content": "Đáp án C thực tế", "isCorrect": false},
        {"content": "Đáp án D thực tế", "isCorrect": false}
      ]
    }
  ]
}`;

      userContent = [
        {
          type: 'text',
          text: `Hãy đọc kỹ bức ảnh đề thi được cung cấp:\n- Trích xuất toàn bộ câu hỏi và bài tập có trong ảnh với 100% nội dung thật, bảo toàn công thức toán LaTeX ($...$).\n- Tuyệt đối không sinh dữ liệu giả hay tự bịa "Phương án A/B/C/D".\n- Trả về JSON đúng cấu trúc yêu cầu.`,
        },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ];
    } else if (mode === 'document' || mode === 'file' || documentText) {
      // 2. Chế độ phân tích & sinh đề từ tài liệu
      const cleanDocText = (documentText || '').slice(0, 45000);
      const docTargetCount = Math.max(10, Math.min(Number(numQuestions) || 15, 50));
      systemPrompt = `BẠN LÀ CHUYÊN GIA AI GIÁO DỤC PHÂN TÍCH VÀ BIÊN SOẠN ĐỀ THI TỪ TÀI LIỆU (${fileName || 'file'}).
QUY TẮC BẮT BUỘC TUÂN THỦ:
1. ĐỌC NỘI DUNG VÀ TỰ ĐỘNG NHẬN DIỆN CHÍNH XÁC MÔN HỌC & CHỦ ĐỀ:
   - "subject": Xác định đúng tên môn học/lĩnh vực thực tế của tài liệu (Ví dụ: "Kinh tế & Pháp luật", "Tiếng Anh", "Hóa học", "Sinh học", "Lịch sử", "Địa lý", "Vật lý", "Tin học", "Toán học"...).
   - "title": Đặt tiêu đề đề thi phản ánh đúng chủ đề cụ thể của tài liệu.
   - "grade": Khối lớp hoặc trình độ học vấn phù hợp ("Lớp 10", "Lớp 11", "Lớp 12", "Đại học"...).
2. SỐ LƯỢNG VÀ CHẤT LƯỢNG CÂU HỎI TRẮC NGHIỆM:
   - Nếu tài liệu đã chứa sẵn danh sách câu hỏi / bài tập: Hãy bóc tách và trích xuất TOÀN BỘ tất cả các câu hỏi có trong tài liệu (không được bỏ sót câu nào).
   - TUYỆT ĐỐI 100% KHÔNG TẠO DỮ LIỆU GIẢ:
     + Tuyệt đối không bao giờ trả về "Phương án A", "Phương án B", "Phương án C", "Phương án D" hoặc các placeholder vô nghĩa.
     + Nội dung mỗi phương án BẮT BUỘC phải là nội dung kiến thức, công thức toán hoặc đáp án cụ thể từ tài liệu.
     + 4 PHƯƠNG ÁN BẮT BUỘC KHÁC NHAU HOÀN TOÀN (TUYỆT ĐỐI KHÔNG TRÙNG LẶP).
     + DUY NHẤT 1 PHƯƠNG ÁN ĐÚNG KHỚP 100% VỚI LỜI GIẢI.
     + Nếu tài liệu có công thức toán học, BẮT BUỘC viết dưới dạng LaTeX chuẩn (ví dụ: \\\\ge 50, \\\\le, \\\\sqrt{...}, \\\\frac{tử}{mẫu}).
     + QUY TẮC PHÂN SỐ: Viết dạng \\\\frac{tử_số}{mẫu_số}. TỬ SỐ Ở TRÊN, MẪU SỐ Ở DƯỚI. TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC (1/3 là \\\\frac{1}{3}, (2x-1)/(x+1) là \\\\frac{2x-1}{x+1}).
     + CHUẨN HÓA TIẾNG VIỆT: Dùng 100% Unicode NFC dựng sẵn, không dùng combining characters (như Haˋmso^ˊ).
     + KIỂM SOÁT ĐA PHƯƠNG TIỆN: Không tạo câu hỏi thiếu hình vẽ/bảng biến thiên; nếu có bảng biến thiên bắt buộc vẽ dạng Markdown table.
   - TUYỆT ĐỐI KHÔNG BAO GIỜ trả về các token nội bộ như [!m:$mathtype_X$], mathtype_X, [img:$img_X$]. Mọi công thức toán học BẮT BUỘC phục hồi sang LaTeX chuẩn ($v \\ge 60$, $x < 5$, $a \\le b$).
   - QUY TẮC PHÂN TÍCH SÂU: Lời giải (explanation) BẮT BUỘC phân tích chi tiết từng bước, giải thích vì sao đáp án đúng và vì sao các phương án khác sai. Mỗi câu hỏi trắc nghiệm BẮT BUỘC có các phương án lựa chọn cụ thể và lời giải chi tiết (explanation).

CHỈ TRẢ VỀ JSON DUY NHẤT:
{
  "title": "${resolvedTitle || 'Đề kiểm tra kiến thức theo tài liệu'}",
  "subject": "${resolvedSubject}",
  "grade": "${resolvedGrade}",
  "durationMinutes": ${docTargetCount <= 10 ? 15 : docTargetCount <= 25 ? 45 : 90},
  "questions": [
    {
      "content": "Nội dung câu hỏi cụ thể từ tài liệu...",
      "explanation": "Lời giải chi tiết...",
      "options": [
        {"content": "v \\\\ge 50", "isCorrect": true},
        {"content": "v > 50", "isCorrect": false},
        {"content": "v \\\\le 50", "isCorrect": false},
        {"content": "v < 50", "isCorrect": false}
      ]
    }
  ]
}`;

      userContent = `Hãy đọc kỹ tài liệu, nhận diện đúng chủ đề và bóc tách hoặc biên soạn thành ĐỦ ít nhất ${docTargetCount} câu hỏi trắc nghiệm chất lượng cao bao quát toàn diện nội dung tài liệu:\n\n${cleanDocText}`;
    } else if (mode === 'suggest') {
      // 3. Chế độ gợi ý 1 câu hỏi đơn lẻ
      systemPrompt = `BẠN LÀ CHUYÊN GIA BIÊN SOẠN CÂU HỎI TRẮC NGHIỆM GIÁO DỤC CHUẨN XÁC.
Nhiệm vụ: Biên soạn đúng 1 câu hỏi trắc nghiệm chất lượng cao bám sát 100% nội dung yêu cầu của người dùng.
${resolvedSubject ? `- Môn học: ${resolvedSubject}` : ''}
${resolvedGrade ? `- Khối lớp: ${resolvedGrade}` : ''}

QUY TẮC BẮT BUỘC:
1. Bám sát CHÍNH XÁC nội dung, từ khóa hoặc câu hỏi mà người dùng đã nhập: "${effectiveMergedTopic}".
2. TUYỆT ĐỐI KHÔNG tự ý chuyển sang môn Toán, không tự chèn công thức hình học hay bài toán trừ khi người dùng yêu cầu môn Toán!
3. Có đúng 4 phương án A, B, C, D (DUY NHẤT 1 đáp án đúng isCorrect: true).
4. Kèm lời giải thích (explanation) chi tiết, chính xác.

CHỈ TRẢ VỀ JSON DUY NHẤT:
{
  "content": "Nội dung câu hỏi hoàn chỉnh...",
  "explanation": "Lời giải chi tiết...",
  "options": [
    {"content": "Đáp án mẫu 1", "isCorrect": false},
    {"content": "Đáp án đúng chính xác", "isCorrect": true},
    {"content": "Đáp án mẫu 3", "isCorrect": false},
    {"content": "Đáp án mẫu 4", "isCorrect": false}
  ]
}`;

      userContent = `Người dùng đang soạn câu hỏi trắc nghiệm với nội dung/từ khóa: "${effectiveMergedTopic}".
${resolvedSubject ? `Môn học: ${resolvedSubject}` : ''}
${resolvedGrade ? `Khối lớp: ${resolvedGrade}` : ''}
Hãy tạo 1 câu hỏi trắc nghiệm hoàn chỉnh, chuẩn xác bám sát 100% nội dung trên.`;
    } else {
      // 4. Chế độ tạo đề theo chủ đề / mô tả (100% sinh bằng AI bám sát mô tả của người dùng)
      let gradeNote = '';
      if (resolvedGrade) {
        const gradeNum = parseInt(resolvedGrade) || 0;
        if (gradeNum >= 1 && gradeNum <= 5) {
          gradeNote = `\nLƯU Ý CẤP HỌC: Trình độ học sinh TIỂU HỌC (LỚP ${resolvedGrade}). Ngôn từ đơn giản, trong sáng, phù hợp lứa tuổi.`;
        } else if (gradeNum >= 6 && gradeNum <= 9) {
          gradeNote = `\nLƯU Ý CẤP HỌC: Trình độ TRUNG HỌC CƠ SỞ (THCS - LỚP ${resolvedGrade}).`;
        } else if (gradeNum >= 10 && gradeNum <= 12) {
          gradeNote = `\nLƯU Ý CẤP HỌC: Trình độ TRUNG HỌC PHỔ THÔNG (THPT - LỚP ${resolvedGrade}).`;
        } else {
          gradeNote = `\nLƯU Ý CẤP HỌC: Trình độ ${resolvedGrade}.`;
        }
      }

      const userProvidedDesc = (topic || effectiveMergedTopic || '').trim();

      systemPrompt = `BẠN LÀ CHUYÊN GIA AI BIÊN SOẠN BỘ CÂU HỎI TRẮC NGHIỆM ĐÁP ỨNG CHÍNH XÁC YÊU CẦU CỦA NGƯỜI DÙNG.

QUY TẮC TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ 100%):
1. BÁM SÁT 100% NỘI DUNG VÀ MÔ TẢ CỦA NGƯỜI DÙNG:
   - Hãy đọc kỹ toàn bộ nội dung mô tả của người dùng bên dưới.
   - Các câu hỏi trắc nghiệm PHẢI tập trung CHÍNH XÁC vào đúng chủ đề, lĩnh vực, tình huống hoặc danh sách kiến thức mà người dùng đã mô tả.
   - TUYỆT ĐỐI KHÔNG tự ý bóp méo, KHÔNG gượng ép sang môn học khác (ví dụ: người dùng mô tả về một tựa game, thể thao, lịch sử, đời sống, văn hóa, công nghệ, thương hiệu, phim ảnh... thì BẮT BUỘC biên soạn các câu hỏi thuần túy về kiến thức/nội dung của chủ đề đó, TUYỆT ĐỐI KHÔNG biến thành bài toán hay chèn công thức toán học vào trừ khi người dùng thực sự yêu cầu môn Toán).
   - Nếu người dùng cung cấp sẵn đoạn văn bản, dàn ý hoặc danh sách câu hỏi trong phần mô tả, hãy bám sát và khai thác trực tiếp từ nội dung đó để tạo câu hỏi trắc nghiệm.
   - Nếu người dùng có chọn môn học cụ thể (${resolvedSubject || 'không bắt buộc'}) hoặc khối lớp cụ thể (${resolvedGrade || 'không bắt buộc'}), hãy kết hợp chuẩn xác với mô tả.${gradeNote}

2. QUY CHUẨN CÔNG THỨC TOÁN HỌC & PHÂN SỐ (MATH/LATEX):
   - Mọi biểu thức toán học BẮT BUỘC viết dưới dạng LaTeX chuẩn ($inline$ hoặc $$display$$).
   - ĐỊNH DẠNG PHÂN SỐ/PHÂN THỨC: BẮT BUỘC viết đúng cú pháp \\\\frac{tử_số}{mẫu_số} hoặc \\\\dfrac{tử_số}{mẫu_số}.
   - TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC THỨ TỰ: TỬ SỐ PHẢI Ở TRÊN (ngoặc nhọn thứ nhất), MẪU SỐ PHẢI Ở DƯỚI (ngoặc nhọn thứ hai).
     + Ví dụ: 1 phần 3 PHẢI LÀ \\\\frac{1}{3}, TUYỆT ĐỐI KHÔNG VIẾT THÀNH \\\\frac{3}{1}.
     + Ví dụ: Phân thức (2x-1)/(x+1) BẮT BUỘC LÀ \\\\frac{2x-1}{x+1}, TUYỆT ĐỐI KHÔNG ĐỔI THÀNH \\\\frac{x+1}{2x-1}.

3. CHUẨN HÓA TIẾNG VIỆT & UNICODE (NFC):
   - Toàn bộ văn bản tiếng Việt BẮT BUỘC dùng mã Unicode dựng sẵn (NFC).
   - Tuyệt đối không để tách rời nguyên âm và dấu thanh (như Haˋmso^ˊ).

4. TIÊU CHÍ BỘ CÂU HỎI & TÍNH DUY NHẤT CỦA 4 PHƯƠNG ÁN:
   - Biên soạn CHÍNH XÁC ĐỦ ${targetCount} CÂU HỎI trắc nghiệm chất lượng.
   - "content": Nội dung câu hỏi rõ ràng, trực diện, tự thân hoàn chỉnh.
   - "options": Đúng 4 phương án A, B, C, D (mảng 4 phần tử có content).
   - TÍNH DUY NHẤT: 4 phương án A, B, C, D BẮT BUỘC có giá trị phân biệt tuyệt đối (TUYỆT ĐỐI KHÔNG TRÙNG LẶP NỘI DUNG GIỮA CÁC PHƯƠNG ÁN).
   - TÍNH CHÍNH XÁC: DUY NHẤT 1 phương án có "isCorrect": true, 3 phương án còn lại "isCorrect": false. Nội dung phương án đúng PHẢI KHỚP 100% VỚI LỜI GIẢI.
   - "explanation": Lời giải thích chi tiết, phân tích sâu từng bước và chỉ rõ vì sao đáp án đúng và vì sao các phương án khác sai.

5. KIỂM SOÁT ĐA PHƯƠNG TIỆN (HÌNH VẼ, ĐỒ THỊ, BẢNG BIẾN THIÊN):
   - TUYỆT ĐỐI KHÔNG sinh câu hỏi có cụm từ "như hình vẽ bên", "đồ thị dưới đây" nếu không có hình ảnh.
   - Nếu muốn hỏi về bảng biến thiên: BẮT BUỘC vẽ bảng biến thiên đầy đủ bằng Markdown table (các dòng x, f'(x) hoặc y', f(x) hoặc y) ngay trong câu hỏi.
   - Mọi câu hỏi phải tự thân hoàn chỉnh (self-contained), học sinh giải được 100% trực tiếp từ đề bài.

6. TIÊU ĐỀ ĐỀ THI:
   - "title": Đặt tên đề thi ngắn gọn, súc tích, phản ánh ĐÚNG 100% chủ đề theo mô tả của người dùng (Ví dụ: "Đề trắc nghiệm: [Tên chủ đề theo mô tả]"). TUYỆT ĐỐI KHÔNG tự động gắn tiền tố "Đề thi Toán lớp 12" nếu người dùng không yêu cầu môn Toán lớp 12!
   - "subject": "${resolvedSubject || 'Kiến thức tổng hợp'}",
   - "grade": "${resolvedGrade || 'Tự do'}".

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC: CHỈ TRẢ VỀ JSON DUY NHẤT:
{
  "title": "Tiêu đề đề thi bám sát mô tả của người dùng",
  "subject": "${resolvedSubject || 'Kiến thức tổng hợp'}",
  "grade": "${resolvedGrade || 'Tự do'}",
  "durationMinutes": ${targetCount <= 10 ? 15 : targetCount <= 25 ? 45 : 90},
  "questions": [
    {
      "content": "Nội dung câu hỏi 1...",
      "explanation": "Lời giải thích...",
      "options": [
        {"content": "Đáp án mẫu 1", "isCorrect": false},
        {"content": "Đáp án đúng chính xác", "isCorrect": true},
        {"content": "Đáp án mẫu 3", "isCorrect": false},
        {"content": "Đáp án mẫu 4", "isCorrect": false}
      ]
    }
  ]
}
`;

      userContent = `NỘI DUNG MÔ TẢ ĐỀ THI TỪ NGƯỜI DÙNG:
"""
${userProvidedDesc}
"""

YÊU CẦU THIẾT LẬP:
- Số lượng câu hỏi cần tạo: ĐỦ ${targetCount} CÂU HỎI TRẮC NGHIỆM
${resolvedSubject ? `- Môn học: ${resolvedSubject}` : '- Môn học: Bám sát theo đúng chủ đề trong mô tả'}
${resolvedGrade ? `- Khối lớp: Lớp ${resolvedGrade}` : '- Khối lớp: Tự do / Phù hợp theo chủ đề'}
${difficulty ? `- Mức độ nhận thức: ${difficulty}` : '- Mức độ: Phong phú, hợp lý'}
${detailedNotes ? `- Ghi chú thêm: ${detailedNotes}` : ''}

Hãy đọc kỹ mô tả trên và tạo CHÍNH XÁC ĐỦ ${targetCount} câu hỏi trắc nghiệm bám sát 100% nội dung mô tả của người dùng. Không được lạc đề sang nội dung khác!`;
    }

    // 2. Gọi trực tiếp API Gateway (100% bằng AI)
    let targetUrl = apiEndpoint || process.env.AI_API_ENDPOINT;
    let authHeader = apiKey ? `Bearer ${apiKey}` : '';
    let selectedModel = model || 'gemini-3.5-flash';

    // Model mapping helper: Ưu tiên mô hình Gemini Flash ổn định nhất từ Google
    const mapModelName = (m: string) => {
      if (!m) return 'gemini-3.5-flash';
      if (m.includes('3.5') && !m.includes('lite')) return 'gemini-3.5-flash';
      if (m.includes('3.7')) return 'gemini-3.7-flash';
      if (m.includes('3.6')) return 'gemini-3.6-flash';
      if (m.includes('3.8')) return 'gemini-3.8-flash';
      if (m.includes('lite')) return 'gemini-3.5-flash-lite';
      return 'gemini-3.5-flash';
    };

    selectedModel = mapModelName(selectedModel);

    // Xác định xem payload có phải là file PDF dạng base64 không
    const isPdfBase64 = typeof imageBase64 === 'string' && (imageBase64.includes('application/pdf') || imageBase64.startsWith('JVBERi0'));

    let rawAiText = '';

    // Hàm gọi AI hỗ trợ Google native generateContent endpoint (siêu tốc, ổn định) và OpenAI endpoint dự phòng
    const executeAiCall = async (modelName: string): Promise<string> => {
      const geminiKey = apiKey || process.env.GEMINI_API_KEY;

      // 1. Nếu có GEMINI_API_KEY và không có targetUrl tùy chỉnh riêng: DÙNG GOOGLE NATIVE API (SIÊU NHANH, KHÔNG BỊ 503)
      if (geminiKey && !targetUrl) {
        const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000);

        const parts: any[] = [];

        // Nếu có ảnh hoặc PDF base64 đính kèm
        if (imageBase64) {
          const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '').trim();
          const mimeType = isPdfBase64
            ? 'application/pdf'
            : imageBase64.includes('image/png')
            ? 'image/png'
            : imageBase64.includes('image/webp')
            ? 'image/webp'
            : 'image/jpeg';

          parts.push({
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          });
        }

        const userPromptText = Array.isArray(userContent)
          ? userContent.find((p: any) => p.type === 'text')?.text || 'Bóc tách và nhận diện câu hỏi từ hình ảnh/tài liệu này.'
          : String(userContent || '');

        parts.push({
          text: `${systemPrompt}\n\n${userPromptText}\n\nLƯU Ý ĐẶC BIỆT VỀ ĐỊNH DẠNG JSON:\n- BẮT BUỘC chỉ trả về 1 JSON Object duy nhất hợp lệ theo cấu trúc yêu cầu.\n- Mọi công thức toán học LaTeX bên trong chuỗi JSON BẮT BUỘC phải dùng 2 dấu gạch chéo \\\\ (ví dụ \\\\frac{a}{b}, \\\\sqrt{x}, \\\\times).`,
        });

        try {
          const nativeRes = await fetch(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!nativeRes.ok) {
            const errText = await nativeRes.text();
            throw new Error(`Google Gemini Native API (${nativeRes.status}): ${errText}`);
          }

          const nativeData = await nativeRes.json();
          const resParts = nativeData.candidates?.[0]?.content?.parts || [];
          const textPart = resParts.find((p: any) => !p.thought && p.text) || resParts[resParts.length - 1];
          const extracted = textPart?.text || '';
          if (!extracted) {
            throw new Error(`Google Native API trả về rỗng cho mô hình ${modelName}`);
          }
          return extracted;
        } catch (err: any) {
          clearTimeout(timeoutId);
          throw err;
        }
      }

      // 2. Dự phòng: gọi qua endpoint tương thích OpenAI
      let ep = targetUrl || (geminiKey ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' : 'http://localhost:6660/v1/chat/completions');
      let auth = authHeader || (geminiKey ? `Bearer ${geminiKey}` : '');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);

      const response = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth ? { Authorization: auth } : {}),
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `${systemPrompt}\n\nLƯU Ý ĐẶC BIỆT VỀ ĐỊNH DẠNG JSON:\n- BẮT BUỘC chỉ trả về 1 JSON Object duy nhất hợp lệ.\n- Mọi công thức toán học LaTeX bên trong chuỗi JSON BẮT BUỘC phải dùng 2 dấu gạch chéo \\\\ (ví dụ \\\\frac{a}{b}, \\\\sqrt{x}, \\\\times, \\\\beta) để không làm lỗi cú pháp JSON.`,
            },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 16384,
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Gateway (${response.status}): ${errorText}`);
      }

      const aiResult = await response.json();

      if (aiResult.error || (Array.isArray(aiResult) && aiResult[0]?.error)) {
        const errObj = aiResult.error || aiResult[0]?.error;
        throw new Error(`Google API Error (${errObj.code || 500}): ${errObj.message || 'Lỗi từ dịch vụ SI'}`);
      }

      const rawText = aiResult.choices?.[0]?.message?.content;
      if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
        throw new Error(`Mô hình AI ${modelName} trả về phản hồi rỗng`);
      }

      return rawText;
    };

    const candidateModels = [
      selectedModel,
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError: any = null;
    for (const m of candidateModels) {
      try {
        console.log(`Đang thử mô hình AI: ${m}...`);
        rawAiText = await executeAiCall(m);
        if (rawAiText && rawAiText.trim().length > 0) {
          selectedModel = m;
          lastError = null;
          console.log(`Mô hình ${m} phản hồi thành công!`);
          break;
        }
      } catch (err: any) {
        console.warn(`Mô hình ${m} gặp sự cố (${err.message}). Tự động đổi sang mô hình tiếp theo...`);
        lastError = err;
        // Nếu lỗi 503 hoặc 429 hoặc timeout, chuyển ngay sang model tiếp theo trong danh sách mà không đợi
        continue;
      }
    }

    // Nếu lượt đầu tiên tất cả các mô hình đều gặp sự cố quá tải, thử lại nhanh với 2 mô hình ổn định nhất sau 1.5s
    if (!rawAiText && lastError) {
      console.log('Tất cả các mô hình đang cao tải, tự động đợi 1.5s và thử lại với cụm mô hình dự phòng...');
      await new Promise((r) => setTimeout(r, 1500));
      for (const m of ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.7-flash']) {
        try {
          rawAiText = await executeAiCall(m);
          if (rawAiText && rawAiText.trim().length > 0) {
            selectedModel = m;
            lastError = null;
            break;
          }
        } catch (e: any) {
          lastError = e;
        }
      }
    }

    if (lastError || !rawAiText) {
      console.warn('Toàn bộ mô hình AI Google gặp sự cố quá tải. Kích hoạt bộ sinh đề thi chuẩn kiến thức dự phòng...');
      if (mode === 'topic' || mode === 'suggest' || mode === 'manual' || mode === 'bank') {
        try {
          const fallbackExam = generateCurriculumFallbackExam({
            subject: resolvedSubject || 'Toán học',
            grade: resolvedGrade || '10',
            topic: effectiveMergedTopic || topic || 'Kiến thức trọng tâm',
            targetCount,
          });

          const sanitizedFallback = validateAndSanitizeQuestions(fallbackExam.questions);
          if (sanitizedFallback.length > 0) {
            const fallbackResponse: GeneratedExamResponse = {
              title: cleanVietnameseEncoding(fallbackExam.title),
              subject: cleanVietnameseEncoding(fallbackExam.subject),
              grade: cleanVietnameseEncoding(fallbackExam.grade),
              durationMinutes: sanitizedFallback.length <= 15 ? 45 : 90,
              questions: sanitizedFallback,
              modelUsed: 'kiyo-curriculum-standard-fallback',
            };

            return NextResponse.json({
              success: true,
              exam: fallbackResponse,
              question: sanitizedFallback[0],
              source: 'curriculum_fallback',
              fallbackNotice: 'Đề thi đã được khởi tạo chuẩn kiến thức (do Google AI đang quá tải). Giáo viên có thể tùy chỉnh hoặc thêm câu hỏi ngay.',
            });
          }
        } catch (fbErr) {
          console.error('Error generating fallback curriculum exam:', fbErr);
        }
      }

      console.error('All AI model attempts failed:', lastError);
      const isTimeout = lastError?.name === 'AbortError';
      const isHighDemand = lastError?.message?.includes('503') || lastError?.message?.includes('high demand');
      
      let friendlyMessage = `Không thể kết nối đến máy chủ SI: ${lastError?.message || 'Lỗi mạng'}. Hệ thống 100% không làm giả dữ liệu. Vui lòng thử lại!`;
      if (isTimeout) {
        friendlyMessage = 'Quá thời gian phản hồi từ máy chủ SI (Timeout). Vui lòng thử lại với số lượng câu hỏi ít hơn hoặc thử lại sau vài giây.';
      } else if (isHighDemand) {
        friendlyMessage = 'Máy chủ Google AI hiện đang có lượng truy cập đột biến (503 High Demand). Đang tự động hạ tải, vui lòng bấm "Thử lại" sau vài giây!';
      }

      return NextResponse.json(
        {
          success: false,
          error: friendlyMessage,
        },
        { status: 503 }
      );
    }

    // 3. Phân tích kết quả do AI sinh ra
    let parsedData = cleanAndParseJson<any>(rawAiText);

    // Chuẩn hóa cấu trúc mảng hoặc các key bao bọc khác từ AI
    if (Array.isArray(parsedData)) {
      parsedData = { questions: parsedData };
    } else if (parsedData && typeof parsedData === 'object') {
      if (!Array.isArray(parsedData.questions)) {
        const candidateArr = parsedData.items || parsedData.data || parsedData.quiz || parsedData.questions_list || parsedData.exam?.questions || parsedData.data?.questions;
        if (Array.isArray(candidateArr)) {
          parsedData.questions = candidateArr;
        }
      }
    }

    if (mode === 'suggest' && parsedData && parsedData.content && Array.isArray(parsedData.options)) {
      parsedData = {
        title: `Gợi ý câu hỏi môn ${resolvedSubject}`,
        subject: resolvedSubject,
        grade: resolvedGrade,
        durationMinutes: 5,
        questions: [parsedData],
      };
    }

    if (!parsedData || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      // Thử bộ quét phục hồi nếu AI trả về JSON bị lỗi ký tự escape
      const recovered = extractQuestionsFromAiOutput(rawAiText);
      if (recovered && Array.isArray(recovered.questions) && recovered.questions.length > 0) {
        parsedData = recovered;
      } else {
        const mdQuestions = parseMarkdownQuestions(rawAiText);
        if (mdQuestions.length > 0) {
          parsedData = {
            title: resolvedTitle || 'Đề trắc nghiệm do SI biên soạn',
            subject: resolvedSubject || 'Kiến thức tổng hợp',
            grade: resolvedGrade || 'Tự do',
            durationMinutes: 45,
            questions: mdQuestions,
          };
        }
      }
    }

    if (!parsedData || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'SI đã phản hồi nhưng không thể phân tích cấu trúc câu hỏi trắc nghiệm hợp lệ. Vui lòng thử lại với mô tả chi tiết hơn hoặc chọn mô hình khác.',
          rawSnippet: rawAiText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    // 4. Chuẩn hóa & kiểm định tính hợp lệ của câu hỏi từ AI (100% dữ liệu thực, tuân thủ mọi quy chuẩn)
    const sanitizedQuestions = validateAndSanitizeQuestions(parsedData.questions);

    if (sanitizedQuestions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'SI không tạo được nội dung câu hỏi trắc nghiệm đạt quy chuẩn chất lượng (trùng lặp phương án, sai cấu trúc phân số hoặc khuyết tài nguyên hình ảnh). Hệ thống 100% không làm giả dữ liệu. Vui lòng thử lại với mô tả chi tiết hơn!',
          rawSnippet: rawAiText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const userTopicPreview = cleanVietnameseEncoding((effectiveMergedTopic || topic || '').slice(0, 50).trim());
    const defaultTitle = resolvedTitle || (fileName ? fileName.replace(/\.[^/.]+$/, '') : (userTopicPreview ? `Đề trắc nghiệm: ${userTopicPreview}` : 'Đề thi trắc nghiệm'));
    const examResponse: GeneratedExamResponse = {
      title: cleanVietnameseEncoding(parsedData.title || defaultTitle),
      subject: cleanVietnameseEncoding(parsedData.subject || resolvedSubject || 'Kiến thức tổng hợp'),
      grade: cleanVietnameseEncoding(parsedData.grade || resolvedGrade || 'Tự do'),
      durationMinutes: Number(parsedData.durationMinutes) || (sanitizedQuestions.length <= 15 ? 45 : 90),
      questions: sanitizedQuestions,
      modelUsed: selectedModel,
    };

    const totalTimeMs = Date.now() - startTime;
    console.log(`[generate-exam API] -> SI (AI ${selectedModel}) HOÀN TẤT trong ${totalTimeMs}ms, biên soạn được ${sanitizedQuestions.length} câu.`);
    return NextResponse.json({
      success: true,
      exam: examResponse,
      question: sanitizedQuestions[0],
      source: 'ai_gateway',
      model: selectedModel,
      executionMode: 'si_ai',
      processingTimeMs: totalTimeMs,
    });
  } catch (error: any) {
    console.error('Error in generate-exam API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi xử lý tạo đề thi bằng SI',
      },
      { status: 500 }
    );
  }
}
