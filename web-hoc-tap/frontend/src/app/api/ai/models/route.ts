import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    account_status: 'AUTHENTICATED',
    available_models: [
      {
        id: 'gemini-3.1-flash-lite',
        name: '3.1 Flash-Lite',
        description: 'Câu trả lời nhanh nhất',
        recommended: true,
      },
      {
        id: 'fbb127bbb056c959',
        name: '3.5 Flash',
        description: 'Trợ giúp toàn diện',
      },
      {
        id: '9d8ca3786ebdfbea',
        name: '3.1 Pro',
        description: 'Toán học và lập trình nâng cao',
      },
      {
        id: '5bf011840784117a',
        name: 'Cấp độ tư duy (Tiêu chuẩn)',
        description: 'Phù hợp nhất cho hầu hết các câu hỏi',
      },
      {
        id: 'e051ce1aa80aa576',
        name: 'Cấp độ tư duy (Mở rộng)',
        description: 'Giải quyết vấn đề phức tạp',
      },
    ],
  });
}
