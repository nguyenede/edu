import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'gemini-3.1-flash-lite', thinkingMode = 'auto' } = body;

    const formattedMessages = Array.isArray(messages)
      ? messages
          .filter((m: { content?: string; text?: string }) => Boolean((m.content || m.text || '').trim()))
          .map((m: { role?: string; sender?: string; content?: string; text?: string }) => ({
            role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
            content: (m.content || m.text || '').trim(),
          }))
      : [];

    const lastUserMessage = formattedMessages.filter((m) => m.role === 'user').pop()?.content || '';
    const questionCountMatch = lastUserMessage.match(/(\d+)\s*(?:câu|cau|questions?)/i);
    const requestedCount = questionCountMatch ? parseInt(questionCountMatch[1], 10) : null;

    const isExamIntent =
      /(?:tạo|làm|soạn|biên soạn|generate|create|cho|xin)\s*(?:cho\s*tôi\s*)?(?:bộ\s*)?(?:đề|bài tập|trắc nghiệm|quiz|test|câu hỏi)/i.test(lastUserMessage) ||
      /(?:đề thi|đề kiểm tra|bài kiểm tra|bài tập|trắc nghiệm|chuyên đề)\b/i.test(lastUserMessage) ||
      /(?:kiểm tra\s+\d+|kiểm tra\s+15|kiểm tra\s+1\s*tiết|giữa\s*kì|học\s*kì|sgk|sách giáo khoa)/i.test(lastUserMessage) ||
      /(?:giải phương trình|hệ phương trình|bất phương trình|phương trình bậc)/i.test(lastUserMessage) ||
      /(?:câu|cau)\s*trắc nghiệm/i.test(lastUserMessage);

    let systemPrompt = '';
    let selectedModel = model;

    if (isExamIntent) {
      const targetCount = Math.max(1, Math.min(requestedCount || 10, 50));
      selectedModel = model || 'gemini-3.1-flash-lite';

      systemPrompt = `BẠN LÀ CHUYÊN GIA BIÊN SOẠN ĐỀ THI TRẮC NGHIỆM GIÁO DỤC CHUẨN BỘ GIÁO DỤC & ĐÀO TẠO VIỆT NAM.

NHIỆM VỤ TỐI THƯỢNG:
Biên soạn một bộ đề thi trắc nghiệm khách quan đầy đủ gồm CHÍNH XÁC ĐÚNG ${targetCount} CÂU HỎI theo đúng chủ đề, khối lớp và bài học trong yêu cầu của người dùng.

QUY TẮC BẮT BUỘC TUÂN THỦ 100%:
1. NGÔN NGỮ: 100% TIẾNG VIỆT.
2. CHUẨN XÁC CHƯƠNG TRÌNH SGK & CẤP LỚP:
   - Bám sát chương trình Giáo dục phổ thông (SGK Kết nối tri thức, Cánh diều, Chân trời sáng tạo).
   - Nếu là "giải phương trình lớp 9": tập trung vào phương trình bậc nhất một ẩn, phương trình tích, phương trình chứa ẩn ở mẫu, phương trình bậc hai cơ bản, căn bậc hai theo SGK Toán 9. Dùng LaTeX $...$ cho công thức toán.
   - Nếu là "bài kiểm tra lịch sử bài 1 sgk": biên soạn chuẩn xác các sự kiện, mốc thời gian, nhân vật, ý nghĩa lịch sử của Bài 1 trong SGK Lịch sử.
   - Các câu hỏi phải chuyên sâu, phân hóa tốt (Nhận biết, Thông hiểu, Vận dụng).
3. KHỐI SUY NGHĨ: <think>Phân tích chủ đề, cấp lớp và biên soạn đủ ${targetCount} câu hỏi trắc nghiệm...</think>
4. BẮT BUỘC TRẢ VỀ ĐỦ ${targetCount} CÂU HỎI TRONG THẺ <action type="create_exam">:
Mảng "questions" PHẢI CÓ CHÍNH XÁC ĐỦ ${targetCount} OBJECT (từ id: 1 đến id: ${targetCount}).
TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ TẠO 1 HAY 2 CÂU MẪU. PHẢI VIẾT ĐỦ TOÀN BỘ ${targetCount} CÂU HỎI.

QUY TẮC BẮT BUỘC VỀ DỮ LIỆU CÂU HỎI & PHƯƠNG ÁN (TUYỆT ĐỐI 100% NỘI DUNG THẬT):
- TUYỆT ĐỐI 100% KHÔNG TẠO DỮ LIỆU GIẢ: Nghiêm cấm mọi hình thức placeholder như "Phương án A", "Phương án B", "Phương án C", "Phương án D", "Lựa chọn 1", "Câu hỏi 1", v.v.
- QUY TẮC CÔNG THỨC TOÁN & PHÂN SỐ: Viết công thức toán LaTeX ($...$). Phân số BẮT BUỘC viết dạng \\frac{tử_số}{mẫu_số}. TỬ SỐ Ở TRÊN (ngoặc nhọn thứ nhất), MẪU SỐ Ở DƯỚI (ngoặc nhọn thứ hai). TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC THỨ TỰ (1/3 là \\frac{1}{3}, (2x-1)/(x+1) là \\frac{2x-1}{x+1}).
- TIẾNG VIỆT & UNICODE (NFC): Dùng 100% Unicode NFC dựng sẵn, không dùng combining characters (như Haˋmso^ˊ).
- TÍNH DUY NHẤT CỦA 4 PHƯƠNG ÁN: 4 phương án trong "options" BẮT BUỘC có nội dung/giá trị khác biệt nhau hoàn toàn (TUYỆT ĐỐI KHÔNG ĐƯỢC TRÙNG LẶP).
- TÍNH CHÍNH XÁC: "answer" BẮT BUỘC phải là nội dung chính xác của phương án đúng (hoặc ký tự A/B/C/D tương ứng). Duy nhất 1 đáp án đúng.
- KIỂM SOÁT ĐA PHƯƠNG TIỆN: TUYỆT ĐỐI KHÔNG tạo câu hỏi có cụm từ "như hình vẽ bên", "bảng biến thiên sau" nếu không có dữ liệu hình ảnh hoặc bảng Markdown table kèm theo. Nếu có bảng biến thiên, BẮT BUỘC vẽ dạng Markdown table trong "question".

CẤU TRÚC BẮT BUỘC:
<action type="create_exam">{
  "title": "Đề thi [Chủ đề] - ${targetCount} câu",
  "total_questions": ${targetCount},
  "questions": [
    {
      "id": 1,
      "question": "Nội dung câu hỏi số 1 với công thức toán LaTeX $...$ nếu có...",
      "options": ["Nội dung phương án A thật", "Nội dung phương án B thật", "Nội dung phương án C thật", "Nội dung phương án D thật"],
      "answer": "Nội dung phương án đúng hoặc ký tự A/B/C/D"
    },
    ... (TIẾP TỤC ĐẦY ĐỦ CHO ĐẾN CÂU SỐ ${targetCount})
    {
      "id": ${targetCount},
      "question": "Nội dung câu hỏi số ${targetCount} với công thức toán LaTeX $...$ nếu có...",
      "options": ["Nội dung phương án A thật", "Nội dung phương án B thật", "Nội dung phương án C thật", "Nội dung phương án D thật"],
      "answer": "Nội dung phương án đúng hoặc ký tự A/B/C/D"
    }
  ]
}</action>
Tôi đã biên soạn hoàn tất bộ đề thi gồm ${targetCount} câu hỏi chuẩn xác cho bạn.`;
    } else {
      systemPrompt = `BẠN LÀ CHATCOI - TRỢ LÝ AI TỰ HÀNH (AUTONOMOUS AGENT) THÔNG MINH, TẠO ĐỀ THI VÀ TÀI LIỆU HỌC TẬP TỰ ĐỘNG THEO YÊU CẦU CỦA NGƯỜI DÙNG.

QUY TẮC BẮT BUỘC:
1. NGÔN NGỮ: TUYỆT ĐỐI 100% TRẢ LỜI BẰNG TIẾNG VIỆT.
2. TUYỆT ĐỐI 100% KHÔNG SINH DỮ LIỆU GIẢ: Mọi câu hỏi và phương án trắc nghiệm phải có nội dung kiến thức thật 100%, có công thức toán học LaTeX ($...$) chuẩn xác. Nghiêm cấm đặt "Phương án A/B/C/D" hay placeholder vô nghĩa.
3. KHỐI SUY NGHĨ (THINKING): Luôn bắt đầu phản hồi bằng thẻ <think>...</think> ngắn gọn.
4. KHI TẠO ĐỀ THI / BÀI TẬP: Tạo đầy đủ các câu hỏi trắc nghiệm trong thẻ <action type="create_exam">{"title": "...", "questions": [...]}</action>. Mỗi câu hỏi phải có "question", "options" (mảng 4 phương án nội dung thật), "answer" (đáp án đúng), "explanation" (giải thích chi tiết).
5. KHI TẠO / BẮT ĐẦU GAME (LIVE QUIZ): <action type="launch_game">{"quizTitle": "...", "mode": "CHAOS", "questions": [...]}</action>.
6. KHI TẠO THƯ MỤC: <action type="create_folder">{"name": "...", "parentId": null}</action>.
7. KHI TẠO LỚP HỌC: <action type="create_class">{"name": "...", "grade": "...", "subject": "..."}</action>.
8. TRÌNH BÀY: Dùng tiếng Việt chuẩn, định dạng Markdown đẹp mắt, công thức toán trong dấu $.`;
    }

    const mapModelName = (m: string) => {
      if (!m) return 'gemini-3.5-flash-lite';
      if (m.includes('3.8')) return 'gemini-3.8-flash';
      if (m.includes('3.5-flash-lite') || m.includes('lite')) return 'gemini-3.5-flash-lite';
      if (m.includes('3.5')) return 'gemini-3.5-flash';
      return 'gemini-3.5-flash-lite';
    };

    selectedModel = mapModelName(selectedModel);

    let targetUrl = process.env.AI_API_ENDPOINT;
    let authHeader = '';

    if (!targetUrl) {
      if (process.env.GEMINI_API_KEY) {
        targetUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        authHeader = `Bearer ${process.env.GEMINI_API_KEY}`;
      } else {
        targetUrl = 'http://localhost:6660/v1/chat/completions';
      }
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...formattedMessages,
        ],
        max_tokens: 16384,
        temperature: isExamIntent ? 0.3 : 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Máy chủ AI Gateway báo lỗi (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Error proxying AI request:', error);
    return NextResponse.json(
      { error: `Không thể kết nối đến máy chủ AI (http://localhost:6660): ${message}. Vui lòng kiểm tra lại AI Gateway!` },
      { status: 500 }
    );
  }
}
