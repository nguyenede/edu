import { NextRequest, NextResponse } from 'next/server';
import { documentDb } from '@/lib/storage/documentDb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    const [folders, files] = await Promise.all([
      documentDb.listFolders(folderId !== null ? folderId : undefined),
      documentDb.listFiles(folderId !== null ? folderId : undefined),
    ]);

    return NextResponse.json({
      success: true,
      folders,
      files,
    });
  } catch (error: any) {
    console.error('[API /api/documents] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi lấy danh sách tài liệu' },
      { status: 500 }
    );
  }
}
