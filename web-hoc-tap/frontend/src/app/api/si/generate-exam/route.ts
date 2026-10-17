import { NextRequest, NextResponse } from 'next/server';
import {
  parseExamFromStructuredText,
  validateDeterministicResult,
  detectSubjectFromText,
  detectGradeFromText,
} from '@/lib/examStructureParser';
import { validateAndSanitizeQuestions, cleanVietnameseEncoding, validateEducationalDocument } from '@/lib/questionValidator';

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
  const combined = `${fileName || ''} ${text || ''}`.trim();

  let subject = '';
  const detectedSub = detectSubjectFromText(combined);
  if (detectedSub && detectedSub !== 'Kiến thức tổng hợp') {
    subject = detectedSub;
  }

  let grade = '';
  const detectedG = detectGradeFromText(combined);
  if (detectedG && detectedG !== 'Tự do') {
    grade = detectedG;
  }

  const cleanFileName = (fileName || '').replace(/\.[^/.]+$/, '').trim();
  const title = cleanFileName ? `Bài kiểm tra: ${cleanFileName}` : (subject ? `Đề kiểm tra môn ${subject}` : 'Đề kiểm tra kiến thức');

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
      : (customPrompt || topic || (mode === 'suggest' ? 'Kiến thức trọng tâm' : 'Kiến thức bài học'));

    let resolvedSubject = subject && subject.trim() ? subject.trim() : '';
    let resolvedGrade = grade && grade.trim() ? grade.trim() : '';
    let resolvedTitle = '';

    const combinedSearchText = `${fileName || ''} ${documentText || ''} ${effectiveMergedTopic || ''} ${topic || ''}`.trim();

    if (!resolvedSubject) {
      const detectedSub = detectSubjectFromText(combinedSearchText);
      if (detectedSub && detectedSub !== 'Kiến thức tổng hợp') {
        resolvedSubject = detectedSub;
      }
    }

    if (!resolvedGrade) {
      const detectedG = detectGradeFromText(combinedSearchText);
      if (detectedG && detectedG !== 'Tự do') {
        resolvedGrade = detectedG;
      }
    }

    if (fileName) {
      resolvedTitle = `Bài kiểm tra: ${fileName.replace(/\.[^/.]+$/, '').trim()}`;
    } else if (effectiveMergedTopic && effectiveMergedTopic.length <= 60 && !effectiveMergedTopic.includes('\n')) {
      resolvedTitle = `Đề trắc nghiệm: ${effectiveMergedTopic.trim()}`;
    }

    const startTime = Date.now();

    // 0. ƯU TIÊN: Kiểm tra xem văn bản tài liệu (chỉ trong chế độ document/file) có chứa sẵn danh sách đề thi hoàn chỉnh không
    const candidateStructuredText = (mode === 'document' || mode === 'file') && documentText && documentText.trim().length > 50
      ? documentText
      : '';

    if (candidateStructuredText) {
      // Kiểm tra tính hợp lệ của tài liệu trước: Nếu là danh sách hành chính hoặc vô nghĩa -> Không tạo đề
      const docCheck = validateEducationalDocument(candidateStructuredText, fileName);
      if (!docCheck.isValid) {
        return NextResponse.json({
          success: false,
          error: docCheck.reason || 'Tài liệu không chứa nội dung bài học hoặc câu hỏi thi hợp lệ.',
        }, { status: 400 });
      }

      try {
        const directParsed = parseExamFromStructuredText(candidateStructuredText, {
          title: resolvedTitle,
          fileName,
        });
        if (
          directParsed &&
          validateDeterministicResult(directParsed) &&
          (directParsed.questions.length >= 3 || directParsed.questions.some((q) => q.options && q.options.length >= 2))
        ) {
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
          console.log('[generate-exam API] Tài liệu là bài giảng/lý thuyết hoặc chưa đủ cấu trúc trắc nghiệm hoàn chỉnh -> Kích hoạt SI chuyển giao...');
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

    if ((mode === 'ocr' || mode === 'image') && imageBase64) {
      // 1. Chế độ bóc tách ảnh đề thi hoặc file PDF qua Vision/Document AI
      systemPrompt = `BẠN LÀ CHUYÊN GIA AI OCR BÓC TÁCH ĐỀ THI TỪ HÌNH ẢNH / TÀI LIỆU PDF CHUẨN XÁC 100%.
Nhiệm vụ: Trích xuất trung thực và chính xác toàn bộ câu hỏi, bài tập, công thức toán học và đáp án từ hình ảnh hoặc tài liệu PDF đề thi.

QUY TẮC BẮT BUỘC TUÂN THỦ:
1. TUYỆT ĐỐI 100% KHÔNG TẠO DỮ LIỆU GIẢ:
   - TUYỆT ĐỐI KHÔNG BAO GIỜ tự bịa ra "Phương án A", "Phương án B", "Phương án C", "Phương án D" hoặc các placeholder vô nghĩa.
   - TUYỆT ĐỐI KHÔNG BAO GIỜ trả về các token nội bộ như [!m:$mathtype_X$], mathtype_X, [img:$img_X$]. Mọi công thức toán học BẮT BUỘC phục hồi sang LaTeX chuẩn ($v \\ge 60$, $x < 5$, $a \\le b$).
   - Bắt buộc trích xuất đúng từng chữ, số, công thức toán có trong ảnh/tài liệu.
   - Nếu trong ảnh/tài liệu là câu hỏi trắc nghiệm: trích xuất đúng nội dung từng phương án lựa chọn và đáp án đúng.
   - Nếu trong ảnh/tài liệu là câu hỏi tự luận (Bài 1, Bài 2...): Giữ nguyên câu hỏi tự luận và lời giải (nếu có trên tài liệu), KHÔNG tự ý chế ra các phương án A/B/C/D giả.
   - QUY TẮC PHÂN TÍCH SÂU: Lời giải (explanation) BẮT BUỘC phân tích chi tiết từng bước, giải thích vì sao đáp án đúng và vì sao các phương án còn lại sai.
2. TỰ ĐỘNG NHẬN DIỆN MÔN HỌC & KHỐI LỚP:
   - "subject": Xác định đúng môn học từ nội dung câu hỏi trong ảnh/tài liệu (Toán, Vật lý, Hóa học, Tiếng Anh...).
   - "title": Đặt tiêu đề phản ánh đúng nội dung bài học / đề thi trong ảnh/tài liệu.
   - "grade": Khối lớp chuẩn xác (Lớp 1 đến Lớp 12).
4. PHÁT HIỆN HÌNH ẢNH / TÀI LIỆU KHÔNG HỢP LỆ (BẮT BUỘC):
   - Nếu bức ảnh/tài liệu KHÔNG PHẢI là đề thi, bài tập hoặc bài học giáo dục (ví dụ: ảnh cá nhân, ảnh phong cảnh, hóa đơn, danh sách điểm danh, ảnh mờ không đọc được chữ hoặc tài liệu vô nghĩa):
   - TUYỆT ĐỐI 100% KHÔNG ĐƯỢC TỰ BỊA RA CÂU HỎI HAY ĐỀ THI GIẢ!
   - BẮT BUỘC trả về JSON:
   {
     "error": "INVALID_DOCUMENT",
     "message": "Hình ảnh hoặc tài liệu không chứa câu hỏi đề thi hoặc nội dung học tập hợp lệ."
   }
3. CHỈ TRẢ VỀ JSON DUY NHẤT HỢP LỆ THEO CẤU TRÚC:
{
  "title": "${resolvedTitle || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Đề thi trích xuất từ tài liệu')}",
  "subject": "${resolvedSubject ? resolvedSubject : 'Tên môn học chuẩn xác'}",
  "grade": "${resolvedGrade ? (resolvedGrade.startsWith('Lớp') ? resolvedGrade : `Lớp ${resolvedGrade}`) : 'Khối lớp chuẩn xác'}",
  "durationMinutes": 45,
  "questions": [
    {
      "content": "Nội dung câu hỏi trích xuất từ tài liệu...",
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
          text: `Hãy đọc kỹ tài liệu/hình ảnh đề thi được cung cấp:\n- Trích xuất toàn bộ câu hỏi và bài tập có trong tài liệu với 100% nội dung thật, bảo toàn công thức toán LaTeX ($...$).\n- Nhận diện đúng phương án A, B, C, D và đáp án đúng.\n- Tuyệt đối không sinh dữ liệu giả hay tự bịa "Phương án A/B/C/D".\n- Trả về JSON đúng cấu trúc yêu cầu.`,
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
      const gradeText = resolvedGrade ? (resolvedGrade.startsWith('Lớp') ? resolvedGrade : `Lớp ${resolvedGrade}`) : '';

      systemPrompt = `BẠN LÀ CHUYÊN GIA AI GIÁO DỤC PHÂN TÍCH VÀ BIÊN SOẠN ĐỀ THI TỪ TÀI LIỆU (${fileName || 'file'}).

QUY TẮC TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ 100%):
1. NHẬN DIỆN CHÍNH XÁC MÔN HỌC & CẤP HỌC / KHỐI LỚP (GDPT 2018):
   - Đọc kỹ tài liệu và đối chiếu với Chương trình Giáo dục Phổ thông 2018 của Bộ GD&ĐT Việt Nam:
   - "subject": Xác định đúng tên môn học của tài liệu (Ví dụ: "Toán", "Vật lý", "Hóa học", "Sinh học", "Ngữ văn", "Lịch sử", "Địa lý", "Tiếng Anh", "Tin học", "Kinh tế & Pháp luật"...). TUYỆT ĐỐI KHÔNG để "Kiến thức tổng hợp" nếu tài liệu thuộc một môn học cụ thể.
   - "grade": Xác định đúng khối lớp thực tế của bài học (Ví dụ: "Lớp 9", "Lớp 8", "Lớp 7", "Lớp 6", "Lớp 10", "Lớp 11", "Lớp 12"...).
     + TUYỆT ĐỐI KHÔNG tự tiện nâng cấp độ lên "Lớp 12" nếu bài học thuộc cấp THCS (Lớp 6, 7, 8, 9) hoặc Tiểu học (Lớp 1-5).
     + Ví dụ: Tài liệu về "Bất đẳng thức và tính chất", "Căn bậc hai", "Hệ hai phương trình", "Đường tròn" là bài học của LỚP 9. BẮT BUỘC gán "grade": "Lớp 9" và biên soạn câu hỏi đúng chuẩn kiến thức Lớp 9!
   - "title": Đặt tiêu đề ngắn gọn, phản ánh đúng tên bài học và môn học của tài liệu.

2. BÁM SÁT 100% NỘI DUNG VÀ PHẠM VI BÀI HỌC TRONG TÀI LIỆU:
   - Toàn bộ các câu hỏi trắc nghiệm PHẢI tập trung CHÍNH XÁC vào các kiến thức, khái niệm trọng tâm, tính chất, định lý, công thức và dạng bài tập có trong bài học/tài liệu được cung cấp.
   - TUYỆT ĐỐI KHÔNG ra đề vượt quá phạm vi kiến thức của bài học và cấp học tương ứng (Ví dụ: Bài học Bất đẳng thức Toán 9 chỉ hỏi về tính chất liên hệ thứ tự với phép cộng/nhân, quy tắc so sánh cơ bản; CẤM TUYỆT ĐỐI không đưa bất đẳng thức tích phân hay đạo hàm THPT, cấm đưa bất đẳng thức Cauchy-Schwarz nâng cao ngoài SGK vào).
   - Nếu tài liệu đã có sẵn câu hỏi/bài tập: Bóc tách và trích xuất TOÀN BỘ các câu hỏi từ tài liệu (không được bỏ sót câu nào).
   - Nếu tài liệu là lý thuyết/bài giảng: Biên soạn các câu hỏi trắc nghiệm kiểm tra sâu các khái niệm lý thuyết và bài tập áp dụng trực tiếp của chính bài học đó.

3. TIÊU CHUẨN CÂU HỎI TRẮC NGHIỆM & TUYỆT ĐỐI KHÔNG TẠO DỮ LIỆU GIẢ:
   - TUYỆT ĐỐI KHÔNG BAO GIỜ tự bịa ra "Phương án A", "Phương án B", "Phương án C", "Phương án D" hoặc các placeholder vô nghĩa.
   - Nội dung mỗi phương án BẮT BUỘC phải là nội dung kiến thức, công thức toán hoặc đáp án cụ thể.
   - Đúng 4 phương án A, B, C, D phân biệt hoàn toàn (TUYỆT ĐỐI KHÔNG TRÙNG LẶP).
   - DUY NHẤT 1 PHƯƠNG ÁN ĐÚNG KHỚP 100% VỚI LỜI GIẢI ("isCorrect": true).
   - CÔNG THỨC TOÁN & LATEX: Mọi công thức toán học BẮT BUỘC viết dưới dạng LaTeX chuẩn ($...$).
   - QUY TẮC PHÂN SỐ: Viết dạng \\frac{tử_số}{mẫu_số}. TỬ SỐ Ở TRÊN, MẪU SỐ Ở DƯỚI. TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC (1/3 là \\frac{1}{3}).
   - CHUẨN HÓA TIẾNG VIỆT: Dùng 100% Unicode NFC dựng sẵn.
   - Lời giải (explanation) BẮT BUỘC phân tích chi tiết từng bước, giải thích vì sao đáp án đúng và vì sao các phương án khác sai.

4. PHÁT HIỆN TÀI LIỆU KHÔNG HỢP LỆ (BẮT BUỘC):
   - Nếu tài liệu được cung cấp KHÔNG PHẢI là bài học, bài giảng, đề thi hoặc nội dung kiến thức giáo dục (ví dụ: chỉ là danh sách học sinh, danh sách điểm danh, bảng chấm công, hóa đơn, giấy tờ hành chính, văn bản ngẫu nhiên, vô nghĩa hoặc không có kiến thức học tập):
   - TUYỆT ĐỐI 100% KHÔNG ĐƯỢC TỰ BỊA RA ĐỀ THI HAY BẤT KỲ CÂU HỎI GIẢ NÀO!
   - Thay vào đó, BẮT BUỘC chỉ trả về JSON thông báo lỗi sau:
   {
     "error": "INVALID_DOCUMENT",
     "message": "Tài liệu không chứa nội dung bài học, đề thi hoặc kiến thức giáo dục hợp lệ để tạo đề thi."
   }

CHỈ TRẢ VỀ JSON DUY NHẤT:
{
  "title": "${resolvedTitle || 'Đề kiểm tra kiến thức theo tài liệu'}",
  "subject": "${resolvedSubject ? resolvedSubject : 'Tên môn học chuẩn xác'}",
  "grade": "${gradeText ? gradeText : 'Khối lớp chuẩn xác (Ví dụ: Lớp 9, Lớp 10...)'}",
  "durationMinutes": ${docTargetCount <= 10 ? 15 : docTargetCount <= 25 ? 45 : 90},
  "questions": [
    {
      "content": "Nội dung câu hỏi cụ thể bám sát bài học trong tài liệu...",
      "explanation": "Lời giải chi tiết từng bước...",
      "options": [
        {"content": "Phương án 1", "isCorrect": false},
        {"content": "Phương án đúng", "isCorrect": true},
        {"content": "Phương án 3", "isCorrect": false},
        {"content": "Phương án 4", "isCorrect": false}
      ]
    }
  ]
}`;

      userContent = `Hãy đọc kỹ tài liệu, nhận diện đúng môn học, khối lớp và bóc tách hoặc biên soạn thành ĐỦ ít nhất ${docTargetCount} câu hỏi trắc nghiệm chất lượng cao bám sát 100% nội dung bài học trong tài liệu:\n\n${cleanDocText}`;
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
      const userProvidedDesc = (topic || effectiveMergedTopic || '').trim();
      const gradeText = resolvedGrade ? (resolvedGrade.startsWith('Lớp') ? resolvedGrade : `Lớp ${resolvedGrade}`) : '';

      let gradeNote = '';
      if (resolvedGrade) {
        const gradeNum = parseInt(resolvedGrade) || 0;
        if (gradeNum >= 1 && gradeNum <= 5) {
          gradeNote = `\n- LƯU Ý CẤP HỌC: Trình độ TIỂU HỌC (${gradeText}). Ngôn từ đơn giản, trong sáng, phù hợp lứa tuổi.`;
        } else if (gradeNum >= 6 && gradeNum <= 9) {
          gradeNote = `\n- LƯU Ý CẤP HỌC: Trình độ TRUNG HỌC CƠ SỞ (THCS - ${gradeText}). Bám sát đúng chương trình THCS, TUYỆT ĐỐI KHÔNG đưa kiến thức THPT vào.`;
        } else if (gradeNum >= 10 && gradeNum <= 12) {
          gradeNote = `\n- LƯU Ý CẤP HỌC: Trình độ TRUNG HỌC PHỔ THÔNG (THPT - ${gradeText}).`;
        } else {
          gradeNote = `\n- LƯU Ý CẤP HỌC: Trình độ ${gradeText}.`;
        }
      }

      systemPrompt = `BẠN LÀ CHUYÊN GIA AI GIÁO DỤC BIÊN SOẠN BỘ CÂU HỎI TRẮC NGHIỆM ĐÁP ỨNG CHÍNH XÁC YÊU CẦU CỦA NGƯỜI DÙNG.

QUY TẮC TỐI THƯỢNG (BẮT BUỘC TUÂN THỦ 100%):
1. NHẬN DIỆN CHÍNH XÁC CẤP HỌC & KHỐI LỚP THEO CHƯƠNG TRÌNH GDPT 2018:
   - Hãy phân tích tên bài học / chủ đề người dùng yêu cầu: "${userProvidedDesc}".
   - Đối chiếu với chương trình Giáo dục Phổ thông (GDPT 2018) của Bộ Giáo dục và Đào tạo Việt Nam:
     + Xác định đúng MÔN HỌC (Ví dụ: "Toán", "Vật lý", "Hóa học", "Sinh học", "Ngữ văn", "Lịch sử", "Địa lý", "Tiếng Anh", "Tin học", "Kinh tế & Pháp luật"...). Tuyệt đối không để "Kiến thức tổng hợp" nếu chủ đề thuộc môn học cụ thể.
     + Xác định đúng KHỐI LỚP (Ví dụ: "Lớp 9", "Lớp 8", "Lớp 7", "Lớp 6", "Lớp 10", "Lớp 11", "Lớp 12"...).
     + TUYỆT ĐỐI KHÔNG tự động nâng lên "Lớp 12" hay "Tốt nghiệp THPT"! Nếu bài học thuộc cấp THCS (Lớp 6, 7, 8, 9) hoặc Tiểu học (Lớp 1-5), BẮT BUỘC biên soạn câu hỏi đúng trình độ, ngôn từ và phạm vi kiến thức của cấp học đó!${gradeNote}
     ${resolvedSubject ? `+ Môn học chỉ định: ${resolvedSubject}` : ''}
     ${gradeText ? `+ Khối lớp chỉ định: ${gradeText}` : ''}

2. BÁM SÁT 100% NỘI DUNG VÀ PHẠM VI CỦA BÀI HỌC:
   - Toàn bộ ${targetCount} câu hỏi trắc nghiệm PHẢI tập trung CHÍNH XÁC vào đúng bài học, khái niệm trọng tâm, tính chất, định lý, công thức và dạng bài tập đặc trưng của bài học đó.
   - VÍ DỤ: Chủ đề "Bài 5: Bất đẳng thức và tính chất" (Toán 9 / GDPT 2018):
     * Khái niệm bất đẳng thức: vế trái, vế phải, các dấu <, >, <=, >=.
     * Bất đẳng thức và phép cộng: Cho a < b, cộng cả hai vế với số c được a + c < b + c (cùng chiều).
     * Bất đẳng thức và phép nhân:
       - Nhân với số dương c > 0: ac < bc (cùng chiều).
       - Nhân với số âm c < 0: ac > bc (đổi chiều bất đẳng thức).
     * Tính chất bắc cầu: a < b và b < c suy ra a < c.
     * Dạng bài so sánh biểu thức: cho a < b, so sánh a + 3 và b + 3; so sánh -2a và -2b; so sánh 3a - 1 và 3b - 1...
     * TUYỆT ĐỐI KHÔNG sinh câu hỏi bất đẳng thức tích phân hay đạo hàm của lớp 12, KHÔNG sinh bất đẳng thức Schur, Cauchy 3 số nâng cao đại học làm sai lệch mục tiêu của bài học!
   - Tuyệt đối không tự ý gượng ép sang môn học khác (trừ khi người dùng yêu cầu).

3. QUY CHUẨN CÔNG THỨC TOÁN HỌC & PHÂN SỐ (MATH/LATEX):
   - Mọi biểu thức toán học BẮT BUỘC viết dưới dạng LaTeX chuẩn ($inline$ hoặc $$display$$).
   - ĐỊNH DẠNG PHÂN SỐ/PHÂN THỨC: BẮT BUỘC viết đúng cú pháp \\\\frac{tử_số}{mẫu_số} hoặc \\\\dfrac{tử_số}{mẫu_số}.
   - TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC THỨ TỰ: TỬ SỐ PHẢI Ở TRÊN (ngoặc nhọn thứ nhất), MẪU SỐ PHẢI Ở DƯỚI (ngoặc nhọn thứ hai) (ví dụ: 1/3 là \\\\frac{1}{3}).

4. CHUẨN HÓA TIẾNG VIỆT & UNICODE (NFC):
   - Toàn bộ văn bản tiếng Việt BẮT BUỘC dùng mã Unicode dựng sẵn (NFC).

5. TIÊU CHÍ BỘ CÂU HỎI & TÍNH DUY NHẤT CỦA 4 PHƯƠNG ÁN:
   - Biên soạn CHÍNH XÁC ĐỦ ${targetCount} CÂU HỎI trắc nghiệm chất lượng cao.
   - Đúng 4 phương án A, B, C, D phân biệt hoàn toàn (TUYỆT ĐỐI KHÔNG TRÙNG LẶP).
   - DUY NHẤT 1 phương án có "isCorrect": true, khớp 100% với lời giải.
   - "explanation": Lời giải thích chi tiết, phân tích sâu từng bước và chỉ rõ căn cứ tính chất/định lý nào để chọn đáp án.

6. KIỂM SOÁT ĐA PHƯƠNG TIỆN:
   - TUYỆT ĐỐI KHÔNG sinh câu hỏi có cụm từ "như hình vẽ bên", "đồ thị dưới đây" nếu không có hình ảnh.
   - Nếu có bảng biến thiên: BẮT BUỘC vẽ bảng biến thiên đầy đủ bằng Markdown table ngay trong câu hỏi.
   - Mọi câu hỏi phải tự thân hoàn chỉnh (self-contained).

7. TIÊU ĐỀ ĐỀ THI:
   - "title": Đặt tên đề thi ngắn gọn, súc tích, phản ánh ĐÚNG 100% chủ đề theo mô tả của người dùng (Ví dụ: "Đề trắc nghiệm: Bài 5 - Bất đẳng thức và tính chất"). TUYỆT ĐỐI KHÔNG tự động gắn tiền tố "Đề thi Toán lớp 12" nếu người dùng không yêu cầu môn Toán lớp 12!
   - "subject": Xác định đúng tên môn học.
   - "grade": Xác định đúng khối lớp.

ĐỊNH DẠNG ĐẦU RA BẮT BUỘC: CHỈ TRẢ VỀ JSON DUY NHẤT:
{
  "title": "Tiêu đề đề thi bám sát mô tả của người dùng",
  "subject": "${resolvedSubject ? resolvedSubject : 'Tên môn học chuẩn xác'}",
  "grade": "${gradeText ? gradeText : 'Khối lớp chuẩn xác (Ví dụ: Lớp 9, Lớp 10...)'}",
  "durationMinutes": ${targetCount <= 10 ? 15 : targetCount <= 25 ? 45 : 90},
  "questions": [
    {
      "content": "Nội dung câu hỏi 1...",
      "explanation": "Lời giải thích...",
      "options": [
        {"content": "Đáp án 1", "isCorrect": false},
        {"content": "Đáp án đúng chính xác", "isCorrect": true},
        {"content": "Đáp án 3", "isCorrect": false},
        {"content": "Đáp án 4", "isCorrect": false}
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
${resolvedSubject ? `- Môn học: ${resolvedSubject}` : '- Môn học: Tự động xác định đúng môn học tương ứng với bài học'}
${gradeText ? `- Khối lớp: ${gradeText}` : '- Khối lớp: Tự động xác định đúng khối lớp của bài học theo chương trình GDPT 2018 (Ví dụ: Lớp 9)'}
${difficulty ? `- Mức độ nhận thức: ${difficulty}` : '- Mức độ: Phong phú, hợp lý'}
${detailedNotes ? `- Ghi chú thêm: ${detailedNotes}` : ''}

Hãy đọc kỹ mô tả trên và tạo CHÍNH XÁC ĐỦ ${targetCount} câu hỏi trắc nghiệm bám sát 100% nội dung bài học. Không được lạc đề sang nội dung khác hoặc cấp học khác!`;
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
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-3.7-flash',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
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

    if (parsedData?.error === 'INVALID_DOCUMENT' || (parsedData?.error && !parsedData?.questions?.length)) {
      return NextResponse.json(
        {
          success: false,
          error: parsedData.message || parsedData.error || 'Tài liệu không chứa nội dung bài học hoặc câu hỏi thi hợp lệ.',
        },
        { status: 400 }
      );
    }

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
    let finalSubject = parsedData.subject || resolvedSubject || '';
    if ((!finalSubject || finalSubject === 'Kiến thức tổng hợp') && resolvedSubject) {
      finalSubject = resolvedSubject;
    }
    if (!finalSubject || finalSubject === 'Kiến thức tổng hợp') {
      const detectFromContent = detectSubjectFromText((parsedData.title || '') + ' ' + (sanitizedQuestions[0]?.content || ''));
      if (detectFromContent && detectFromContent !== 'Kiến thức tổng hợp') {
        finalSubject = detectFromContent;
      } else {
        finalSubject = 'Kiến thức tổng hợp';
      }
    }

    let finalGrade = parsedData.grade || (resolvedGrade ? (resolvedGrade.startsWith('Lớp') ? resolvedGrade : `Lớp ${resolvedGrade}`) : '') || '';
    if ((!finalGrade || finalGrade === 'Tự do' || finalGrade === '12' || finalGrade === 'Lớp 12') && resolvedGrade && resolvedGrade !== '12') {
      finalGrade = resolvedGrade.startsWith('Lớp') ? resolvedGrade : `Lớp ${resolvedGrade}`;
    }

    // Kiểm tra chéo với nội dung tiêu đề, mô tả và câu hỏi thực tế
    const detectGradeFromContent = detectGradeFromText(
      (parsedData.title || '') + ' ' + combinedSearchText + ' ' + (sanitizedQuestions[0]?.content || '')
    );
    if (detectGradeFromContent && detectGradeFromContent !== 'Tự do' && detectGradeFromContent !== '12') {
      // Nếu bài học thuộc THCS hoặc Tiểu học (Lớp 1-9), tuyệt đối không để AI giữ nhãn Lớp 12
      if (!resolvedGrade || finalGrade === '12' || finalGrade === 'Lớp 12' || finalGrade === 'Tự do') {
        finalGrade = `Lớp ${detectGradeFromContent}`;
      }
    } else if (!finalGrade || finalGrade === 'Tự do') {
      if (detectGradeFromContent && detectGradeFromContent !== 'Tự do') {
        finalGrade = `Lớp ${detectGradeFromContent}`;
      } else {
        finalGrade = 'Tự do';
      }
    }
    if (/^\d{1,2}$/.test(finalGrade.trim())) {
      finalGrade = `Lớp ${finalGrade.trim()}`;
    }

    const examResponse: GeneratedExamResponse = {
      title: cleanVietnameseEncoding(parsedData.title || defaultTitle),
      subject: cleanVietnameseEncoding(finalSubject),
      grade: cleanVietnameseEncoding(finalGrade),
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
