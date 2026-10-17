import { NextRequest, NextResponse } from 'next/server';
import { unifiedStorage } from '@/lib/storage/unifiedStorage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const rawPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path);
    const file = await unifiedStorage.getFile(rawPath);

    if (!file) {
      return NextResponse.json({ success: false, message: 'File not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
