import { NextRequest, NextResponse } from 'next/server';
import { documentDb } from '@/lib/storage/documentDb';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, message: 'Tên thư mục không được để trống' }, { status: 400 });
    }

    const folder = await documentDb.saveFolder({ id, name });
    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const deleted = await documentDb.deleteFolder(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
