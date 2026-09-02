import { NextRequest, NextResponse } from 'next/server';

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
}

function cleanAndParseJson<T>(rawText: string): T | null {
  if (!rawText) return null;

  // 1. Remove <think>...</think> blocks
  let text = rawText.replace(/<think[\s\S]*?(?:<\/think>|$)/gi, '').trim();

  // 2. Extract JSON from ```json ... ``` codeblocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    // Look for outermost { ... } or [ ... ]
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.substring(firstBrace, lastBrace + 1);
    }
  }

  // 3. Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // 4. Try sanitizing unescaped characters or trailing commas
    try {
      const sanitized = text
        .replace(/,\s*([}\]])/g, '$1') // remove trailing commas
        .replace(/\\(?!["\\/bfnrtu])/g, '\\\\'); // fix invalid escapes
      return JSON.parse(sanitized);
    } catch (e) {
      console.error('Failed to parse JSON from AI response:', e, 'Raw:', text.slice(0, 300));
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode = 'topic', // 'topic' | 'ocr' | 'suggest' | 'bank'
      subject = 'Toán',
      grade = '12',
      topic = '',
      numQuestions = 10,
      difficulty = 'Thông hiểu',
      imageBase64 = null,
      customPrompt = '',
    } = body;

    let systemPrompt = '';
    let userContent: any = '';

    if (mode === 'ocr' && imageBase64) {
      // AI Vision Multimodal OCR Mode
      systemPrompt = `BẠN LÀ CHUYÊN GIA AI OCR NHẬN DIỆN VÀ BÓC TÁCH ĐỀ THI TỪ HÌNH ẢNH.
Nhiệm vụ: Phân tích hình ảnh đề thi được cung cấp và trích xuất TOÀN BỘ các câu hỏi trắc nghiệm kèm các phương án trả lời.
NẾU hình ảnh có sẵn đáp án được khoanh/đánh dấu, hãy đặt isCorrect = true cho đáp án đó. Nếu không có đánh dấu, hãy tự giải và xác định đáp án đúng chính xác nhất.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT (không kèm lời dẫn, không bọc markdown):
{
  "title": "Đề thi bóc tách từ hình ảnh OCR",
  "subject": "${subject}",
  "grade": "${grade}",
  "durationMinutes": 45,
  "questions": [
    {
      "content": "Nội dung câu hỏi...",
      "explanation": "Lời giải hoặc giải thích ngắn...",
      "options": [
        {"content": "Nội dung phương án A", "isCorrect": false},
        {"content": "Nội dung phương án B", "isCorrect": true},
        {"content": "Nội dung phương án C", "isCorrect": false},
        {"content": "Nội dung phương án D", "isCorrect": false}
      ]
    }
  ]
}`;

      userContent = [
        {
          type: 'text',
          text: `Hãy nhận diện toàn bộ đề thi trong bức ảnh này, trích xuất tất cả câu hỏi trắc nghiệm thành định dạng JSON chuẩn. Môn học dự kiến: ${subject}, Khối lớp: ${grade}.`,
        },
        {
          type: 'image_url',
          image_url: {
            url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ];
    } else if (mode === 'suggest') {
      // Single Question Suggestion Mode
      systemPrompt = `BẠN LÀ CHUYÊN GIA SOẠN CÂU HỎI TRẮC NGHIỆM GIÁO DỤC VIỆT NAM.
Nhiệm vụ: Tạo 1 câu hỏi trắc nghiệm chất lượng cao theo yêu cầu với 4 phương án A, B, C, D (trong đó CHÍNH XÁC 1 phương án đúng) kèm lời giải chi tiết.

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT:
{
  "content": "Nội dung câu hỏi...",
  "explanation": "Lời giải chi tiết...",
  "options": [
    {"content": "Phương án A", "isCorrect": false},
    {"content": "Phương án B", "isCorrect": true},
    {"content": "Phương án C", "isCorrect": false},
    {"content": "Phương án D", "isCorrect": false}
  ]
}`;

      userContent = `Hãy tạo 1 câu hỏi trắc nghiệm môn ${subject} lớp ${grade}. Mức độ: ${difficulty}. Yêu cầu / Chủ đề: "${customPrompt || topic || 'Kiến thức trọng tâm'}".`;
    } else {
      // Full Exam Generation Mode ('topic' or 'bank')
      const targetCount = Math.max(1, Math.min(Number(numQuestions) || 10, 50));
      systemPrompt = `BẠN LÀ CHUYÊN GIA BIÊN SOẠN ĐỀ THI TRẮC NGHIỆM GIÁO DỤC CHUẨN BỘ GIÁO DỤC & ĐÀO TẠO VIỆT NAM.
Quy tắc biên soạn:
1. Tạo CHÍNH XÁC ${targetCount} câu hỏi trắc nghiệm môn ${subject} khối ${grade}.
2. Mức độ nhận thức: ${difficulty}.
3. Chủ đề kiến thức: "${topic || 'Tổng hợp kiến thức trọng tâm'}".
4. Mỗi câu hỏi BẮT BUỘC có đúng 4 phương án lựa chọn, trong đó DUY NHẤT 1 phương án có "isCorrect": true.
5. Nội dung câu hỏi và đáp án rõ ràng, chuẩn xác theo chương trình SGK mới, có công thức toán/lý/hóa (dùng LaTeX $...$ nếu cần).

BẮT BUỘC TRẢ VỀ ĐỊNH DẠNG JSON DUY NHẤT (không bọc text ngoài JSON):
{
  "title": "Đề thi ${subject} lớp ${grade} - ${topic || 'Ôn tập'} (${targetCount} câu)",
  "subject": "${subject}",
  "grade": "${grade}",
  "durationMinutes": ${targetCount <= 10 ? 15 : targetCount <= 25 ? 45 : 90},
  "questions": [
    {
      "content": "Câu hỏi 1...",
      "explanation": "Giải thích chi tiết đáp án...",
      "options": [
        {"content": "Đáp án A", "isCorrect": false},
        {"content": "Đáp án B", "isCorrect": true},
        {"content": "Đáp án C", "isCorrect": false},
        {"content": "Đáp án D", "isCorrect": false}
      ]
    }
  ]
}`;

      userContent = `Hãy biên soạn bộ đề thi gồm đúng ${targetCount} câu hỏi trắc nghiệm môn ${subject} lớp ${grade} với chủ đề "${topic}". Mức độ nhận thức: ${difficulty}.`;
    }

    // Call Local AI Gateway / LLM Server
    const response = await fetch('http://localhost:6660/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-3.1-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 16384,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI Gateway error (${response.status}): ${errText}`);
    }

    const aiResult = await response.json();
    const rawAiText = aiResult.choices?.[0]?.message?.content || '';

    const parsedData = cleanAndParseJson<any>(rawAiText);

    if (!parsedData) {
      throw new Error('AI không trả về cấu trúc JSON câu hỏi hợp lệ.');
    }

    if (mode === 'suggest') {
      return NextResponse.json({
        success: true,
        question: parsedData,
      });
    }

    // Exam format validation & normalization
    const normalizedQuestions: GeneratedQuestion[] = Array.isArray(parsedData.questions)
      ? parsedData.questions.map((q: any, idx: number) => {
          let opts: QuestionOption[] = Array.isArray(q.options)
            ? q.options.map((o: any) => ({
                content: typeof o === 'string' ? o : o.content || '',
                isCorrect: Boolean(o.isCorrect),
              }))
            : [];

          // Ensure at least 1 option is marked correct
          if (!opts.some((o) => o.isCorrect) && opts.length > 0) {
            opts[0].isCorrect = true;
          }

          // Ensure at least 4 options
          while (opts.length < 4) {
            opts.push({
              content: `Phương án ${String.fromCharCode(65 + opts.length)}`,
              isCorrect: false,
            });
          }

          return {
            content: q.content || `Câu hỏi ${idx + 1}`,
            explanation: q.explanation || '',
            options: opts,
            points: Math.round((10 / (parsedData.questions.length || 10)) * 100) / 100,
          };
        })
      : [];

    if (normalizedQuestions.length === 0) {
      throw new Error('AI không sinh ra được danh sách câu hỏi hợp lệ.');
    }

    const examResponse: GeneratedExamResponse = {
      title: parsedData.title || `Đề thi ${subject} lớp ${grade} - ${topic || 'Chuyên đề'}`,
      subject: parsedData.subject || subject,
      grade: parsedData.grade || grade,
      durationMinutes: Number(parsedData.durationMinutes) || (normalizedQuestions.length <= 15 ? 30 : 60),
      questions: normalizedQuestions,
    };

    return NextResponse.json({
      success: true,
      exam: examResponse,
    });
  } catch (error: any) {
    console.error('Error generating AI exam:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi xử lý tạo đề thi bằng AI',
      },
      { status: 500 }
    );
  }
}
