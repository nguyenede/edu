import { NextRequest, NextResponse } from 'next/server';

function splitTextIntoChunks(text: string, maxLength = 140): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).trim().length <= maxLength) {
      currentChunk = (currentChunk + ' ' + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (sentence.length > maxLength) {
        // Split long sentence by comma or words
        const words = sentence.split(/\s+/);
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= maxLength) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        currentChunk = wordChunk;
      } else {
        currentChunk = sentence.trim();
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');

  if (!text) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // Clean text and take up to 1000 characters
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[*#`_~|]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .slice(0, 1000)
    .trim();

  if (!cleanText) {
    return new NextResponse('Empty text after clean', { status: 400 });
  }

  const chunks = splitTextIntoChunks(cleanText, 140);
  if (chunks.length === 0) {
    return new NextResponse('Empty chunks', { status: 400 });
  }

  try {
    const audioBuffers: Uint8Array[] = [];

    for (const chunk of chunks) {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(
        chunk
      )}`;

      const res = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        audioBuffers.push(new Uint8Array(buffer));
      }
    }

    if (audioBuffers.length === 0) {
      return new NextResponse('Failed to fetch TTS chunks', { status: 502 });
    }

    // Concatenate all chunks into a single MP3 audio stream
    const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const b of audioBuffers) {
      combined.set(b, offset);
      offset += b.length;
    }

    return new NextResponse(combined, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    return new NextResponse(error.message || 'TTS Error', { status: 500 });
  }
}
