import { NextRequest, NextResponse } from 'next/server';

interface StandardExamPayload {
  id: string;
  name: string;
  parentId: string | null;
  fileType: 'json';
  mimeType: 'application/json';
  storageKey: string;
  size?: number | null;
  parsedQuiz: {
    title: string;
    description: string;
    durationMinutes: number;
    questions: any[];
  };
  createdAt: string;
  updatedAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = String(body.name || body.parsedQuiz?.title || 'Đề thi trắc nghiệm')
      .replace(/\.[^/.]+$/, '')
      .trim();
    const targetId = body.id || `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const jsonName = `${rawTitle}.json`;
    const storageKey = body.storageKey || `exams/teacher/${targetId}.json`;

    const rawParsed = body.parsedQuiz || {};
    const questions: any[] = Array.isArray(rawParsed.questions)
      ? rawParsed.questions
      : Array.isArray(body.questions)
      ? body.questions
      : [];

    const durationMinutes = Number(rawParsed.durationMinutes || body.durationMinutes) || 45;
    const description = String(rawParsed.description || body.description || '').trim();

    const standardExam: StandardExamPayload = {
      id: targetId,
      name: jsonName,
      parentId: body.parentId || null,
      fileType: 'json',
      mimeType: 'application/json',
      storageKey,
      parsedQuiz: {
        title: rawTitle,
        description,
        durationMinutes,
        questions,
      },
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const jsonBuffer = Buffer.from(JSON.stringify(standardExam, null, 2), 'utf-8');
    standardExam.size = jsonBuffer.length;

    // Optional direct S3 sync if S3 credentials are configured in frontend env
    const s3Bucket = process.env.S3_BUCKET || 'appbaitap-exams';
    const s3Endpoint = process.env.S3_ENDPOINT;
    const s3AccessKey = process.env.S3_ACCESS_KEY_ID;
    const s3SecretKey = process.env.S3_SECRET_ACCESS_KEY;
    const s3Region = process.env.S3_REGION || 'us-east-1';

    let s3Synced = false;
    if (s3AccessKey && s3SecretKey) {
      try {
        // Can perform S3 PUT or forward to backend S3 service
        const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3001';
        await fetch(`${backendUrl}/api/documents/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.get('authorization') ? { Authorization: req.headers.get('authorization')! } : {}),
          },
          body: JSON.stringify(standardExam),
        }).then((res) => {
          if (res.ok) s3Synced = true;
        }).catch(() => null);
      } catch (err) {
        console.warn('S3 backend sync notice:', err);
      }
    }

    return NextResponse.json({
      success: true,
      file: standardExam,
      s3Storage: {
        bucket: s3Bucket,
        key: storageKey,
        synced: s3Synced,
      },
    });
  } catch (error: any) {
    console.error('Error handling /api/documents/files:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lưu trữ tài liệu đề thi' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    files: [],
  });
}
