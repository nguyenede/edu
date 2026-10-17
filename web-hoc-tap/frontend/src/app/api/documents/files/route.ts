import { NextRequest, NextResponse } from 'next/server';
import { unifiedStorage } from '@/lib/storage/unifiedStorage';
import { documentDb } from '@/lib/storage/documentDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId') || searchParams.get('folderId');
    const files = await documentDb.listFiles(parentId !== null ? parentId : undefined);
    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = String(body.name || body.parsedQuiz?.title || 'Đề thi trắc nghiệm')
      .replace(/\.[^/.]+$/, '')
      .trim();
    const targetId = body.id || `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const jsonName = `${rawTitle}.json`;
    const storageKey = `exams/${targetId}.json`;

    const rawParsed = body.parsedQuiz || {};
    const questions: any[] = Array.isArray(rawParsed.questions)
      ? rawParsed.questions
      : Array.isArray(body.questions)
      ? body.questions
      : [];

    const durationMinutes = Number(rawParsed.durationMinutes || body.durationMinutes) || 45;
    const description = String(rawParsed.description || body.description || '').trim();

    // Standard Clean Exam JSON Payload to store on disk or S3
    const examPayload = {
      id: targetId,
      title: rawTitle,
      description,
      durationMinutes,
      questionsCount: questions.length,
      questions,
      parsedQuiz: {
        title: rawTitle,
        description,
        durationMinutes,
        questions,
      },
      metadata: {
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // 1. LƯU THÀNH FILE .JSON THỰC TẾ TRÊN Ổ ĐĨA / S3
    const jsonBuffer = Buffer.from(JSON.stringify(examPayload, null, 2), 'utf-8');
    const storageResult = await unifiedStorage.saveFile(storageKey, jsonBuffer, 'application/json');

    // 2. LƯU VÀO DB: CHỈ LƯU METADATA & ĐƯỜNG DẪN FILE (filePath, storageKey)
    // TUYỆT ĐỐI KHÔNG LƯU CỤC JSON / parsedQuiz TRONG DB
    const fileRecord = await documentDb.saveFileRecord({
      id: targetId,
      name: jsonName,
      parentId: body.parentId || body.folderId || null,
      fileType: 'json',
      mimeType: 'application/json',
      size: storageResult.size,
      storageKey: storageResult.storageKey,
      filePath: storageResult.filePath,
      storageType: storageResult.storageType,
      createdAt: body.createdAt,
    });

    console.log(`[Files API] Saved exam JSON to ${storageResult.storageType.toUpperCase()} file: ${storageResult.filePath} (${storageResult.size} bytes). Recorded path in DB.`);

    return NextResponse.json({
      success: true,
      file: {
        ...fileRecord,
        parsedQuiz: examPayload.parsedQuiz, // Return to caller for immediate UI rendering
      },
      storage: {
        storageKey: storageResult.storageKey,
        filePath: storageResult.filePath,
        storageType: storageResult.storageType,
        url: storageResult.url,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Files API] Error saving document:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lưu trữ tệp đề thi' },
      { status: 500 }
    );
  }
}
