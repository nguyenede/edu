import { NextRequest, NextResponse } from 'next/server';
import { unifiedStorage } from '@/lib/storage/unifiedStorage';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'images'; // 'images' | 'documents'

    if (!file) {
      return NextResponse.json({ success: false, message: 'Vui lòng chọn file' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop() || 'bin';
    const cleanId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const storageKey = `${type}/${cleanId}.${ext}`;

    const result = await unifiedStorage.saveFile(storageKey, buffer, file.type || 'application/octet-stream');

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: result.size,
        storageKey: result.storageKey,
        filePath: result.filePath,
        storageType: result.storageType,
        url: result.url,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Lỗi tải file' }, { status: 500 });
  }
}
