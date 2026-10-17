import { NextRequest, NextResponse } from 'next/server';
import { documentDb } from '@/lib/storage/documentDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const targetFolderId = body.parentId !== undefined ? (body.parentId || null) : null;

    const fileRecord = await documentDb.getFileRecord(id);
    if (!fileRecord) {
      return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 });
    }

    const updated = await documentDb.saveFileRecord({
      ...fileRecord,
      parentId: targetFolderId,
    });

    return NextResponse.json({ success: true, file: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
