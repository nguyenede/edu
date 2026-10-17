import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { unifiedStorage, STORAGE_DIR } from '@/lib/storage/unifiedStorage';
import { documentDb } from '@/lib/storage/documentDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    let fileRecord = await documentDb.getFileRecord(id);

    if (!fileRecord) {
      const directKey = id.endsWith('.json') ? `exams/${id}` : `exams/${id}.json`;
      const directContent = await unifiedStorage.getFileString(directKey);
      if (directContent) {
        try {
          const parsed = JSON.parse(directContent);
          const rawTitle = parsed.title || parsed.parsedQuiz?.title || 'Đề thi';
          fileRecord = await documentDb.saveFileRecord({
            id,
            name: `${rawTitle}.json`,
            parentId: null,
            fileType: 'json',
            mimeType: 'application/json',
            size: Buffer.byteLength(directContent, 'utf-8'),
            storageKey: directKey,
            filePath: path.join(STORAGE_DIR, directKey),
            storageType: unifiedStorage.getStorageType(),
          });
        } catch {}
      }
    }

    if (!fileRecord) {
      return NextResponse.json({ success: false, message: 'Tệp tài liệu không tồn tại' }, { status: 404 });
    }

    // Đọc nội dung file JSON thực tế từ đường dẫn trên ổ đĩa / S3
    let parsedQuiz = null;
    try {
      const fileContent = await unifiedStorage.getFileString(fileRecord.storageKey);
      if (fileContent) {
        const parsed = JSON.parse(fileContent);
        parsedQuiz = parsed.parsedQuiz || parsed;
      }
    } catch (err: any) {
      console.warn(`[File Detail API] Error reading file JSON from ${fileRecord.storageKey}:`, err.message);
    }

    return NextResponse.json({
      success: true,
      file: {
        ...fileRecord,
        parsedQuiz,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));

    if (body.name) {
      const updated = await documentDb.renameFileRecord(id, body.name);
      return NextResponse.json({ success: true, file: updated });
    }

    return NextResponse.json({ success: false, message: 'Không có dữ liệu cập nhật' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const fileRecord = await documentDb.getFileRecord(id);

    if (!fileRecord) {
      return NextResponse.json({ success: false, message: 'Tệp không tồn tại' }, { status: 404 });
    }

    const rawTitle = String(body.name || body.parsedQuiz?.title || fileRecord.name)
      .replace(/\.[^/.]+$/, '')
      .trim();
    const jsonName = `${rawTitle}.json`;
    const storageKey = fileRecord.storageKey || `exams/${id}.json`;

    const rawParsed = body.parsedQuiz || {};
    const questions: any[] = Array.isArray(rawParsed.questions)
      ? rawParsed.questions
      : Array.isArray(body.questions)
      ? body.questions
      : [];

    const durationMinutes = Number(rawParsed.durationMinutes || body.durationMinutes) || 45;
    const description = String(rawParsed.description || body.description || '').trim();

    const examPayload = {
      id,
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
        createdAt: fileRecord.createdAt,
        updatedAt: new Date().toISOString(),
      },
    };

    // 1. CẬP NHẬT NỘI DUNG FILE .JSON THỰC TẾ TRÊN Ổ ĐĨA / S3
    const jsonBuffer = Buffer.from(JSON.stringify(examPayload, null, 2), 'utf-8');
    const storageResult = await unifiedStorage.saveFile(storageKey, jsonBuffer, 'application/json');

    // 2. CẬP NHẬT DB (Chỉ cập nhật đường dẫn & metadata, không lưu JSON vào DB)
    const updatedRecord = await documentDb.saveFileRecord({
      id,
      name: jsonName,
      parentId: fileRecord.parentId,
      fileType: 'json',
      mimeType: 'application/json',
      size: storageResult.size,
      storageKey: storageResult.storageKey,
      filePath: storageResult.filePath,
      storageType: storageResult.storageType,
      createdAt: fileRecord.createdAt,
    });

    return NextResponse.json({
      success: true,
      file: {
        ...updatedRecord,
        parsedQuiz: examPayload.parsedQuiz,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const deleted = await documentDb.deleteFileRecord(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
