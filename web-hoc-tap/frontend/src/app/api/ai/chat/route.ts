import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'gemini-3.1-pro', thinkingMode = 'auto' } = body;

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
      /(?:tạo|làm|soạn|biên soạn|generate|create)\s*(?:cho\s*tôi\s*)?(?:bộ\s*)?(?:đề|bài tập|trắc nghiệm|quiz|test)/i.test(lastUserMessage) ||
      /(?:đề thi|trắc nghiệm)\s*.*(?:câu|cau)/i.test(lastUserMessage) ||
      /(?:câu|cau)\s*trắc nghiệm/i.test(lastUserMessage);

    let systemPrompt = '';
    let selectedModel = model;

    if (isExamIntent) {
      const targetCount = Math.max(1, Math.min(requestedCount || 10, 50));
      selectedModel = 'gemini-3.1-flash-lite'; // Use fast model with huge output capacity for full exam lists

      systemPrompt = `BẠN LÀ CHUYÊN GIA BIÊN SOẠN ĐỀ THI TRẮC NGHIỆM TỰ ĐỘNG CHUẨN XÁC 100%.

NHIỆM VỤ TỐI THƯỢNG:
Biên soạn một bộ đề thi trắc nghiệm đầy đủ gồm CHÍNH XÁC ĐÚNG ${targetCount} CÂU HỎI theo chủ đề người dùng yêu cầu.

QUY TẮC BẮT BUỘC TUÂN THỦ 100%:
1. NGÔN NGỮ: 100% TIẾNG VIỆT.
2. KHỐI SUY NGHĨ: <think>Phân tích chủ đề và chuẩn bị biên soạn ${targetCount} câu hỏi trắc nghiệm...</think>
3. BẮT BUỘC TRẢ VỀ ĐỦ ${targetCount} CÂU HỎI TRONG THẺ <action type="create_exam">:
Mảng "questions" PHẢI CÓ CHÍNH XÁC ĐỦ ${targetCount} OBJECT (từ id: 1 đến id: ${targetCount}).
TUYỆT ĐỐI KHÔNG ĐƯỢC CHỈ TẠO 1 HAY 2 CÂU MẪU. PHẢI VIẾT ĐỦ TOÀN BỘ ${targetCount} CÂU HỎI.

CẤU TRÚC BẮT BUỘC:
<action type="create_exam">{
  "title": "Đề thi [Chủ đề] - ${targetCount} câu",
  "total_questions": ${targetCount},
  "questions": [
    {
      "id": 1,
      "question": "Nội dung câu hỏi số 1...",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "answer": "Phương án đúng chính xác"
    },
    ... (TIẾP TỤC ĐẦY ĐỦ CHO ĐẾN CÂU SỐ ${targetCount})
    {
      "id": ${targetCount},
      "question": "Nội dung câu hỏi số ${targetCount}...",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "answer": "Phương án đúng chính xác"
    }
  ]
}</action>
Tôi đã biên soạn hoàn tất bộ đề thi gồm ${targetCount} câu hỏi cho bạn.`;
    } else {
      systemPrompt = `BẠN LÀ CHATCOI - TRỢ LÝ AI TỰ HÀNH (AUTONOMOUS AGENT) THÔNG MINH, TẠO ĐỀ THI VÀ TÀI LIỆU HỌC TẬP TỰ ĐỘNG THEO YÊU CẦU CỦA NGƯỜI DÙNG.

QUY TẮC BẮT BUỘC:
1. NGÔN NGỮ: TUYỆT ĐỐI 100% TRẢ LỜI BẰNG TIẾNG VIỆT.
2. KHỐI SUY NGHĨ (THINKING): Luôn bắt đầu phản hồi bằng thẻ <think>...</think> ngắn gọn.
3. KHI TẠO ĐỀ THI: Tạo đầy đủ các câu hỏi trắc nghiệm trong thẻ <action type="create_exam">{"title": "...", "questions": [...]}</action>.
4. KHI TẠO / BẮT ĐẦU GAME (LIVE QUIZ): <action type="launch_game">{"quizTitle": "...", "mode": "CHAOS", "questions": [...]}</action>.
5. KHI TẠO THƯ MỤC: <action type="create_folder">{"name": "...", "parentId": null}</action>.
6. KHI TẠO LỚP HỌC: <action type="create_class">{"name": "...", "grade": "...", "subject": "..."}</action>.
7. TRÌNH BÀY: Dùng tiếng Việt chuẩn, định dạng Markdown đẹp mắt.`;
    }

    const response = await fetch('http://localhost:6660/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
        { error: `AI Gateway error (${response.status}): ${errorText}` },
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
      { error: `Không thể kết nối đến máy chủ AI (localhost:6660): ${message}` },
      { status: 500 }
    );
  }
}
