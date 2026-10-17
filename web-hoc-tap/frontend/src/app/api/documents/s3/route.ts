import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const isS3Configured = Boolean(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  return NextResponse.json({
    status: 'online',
    storageType: 's3',
    format: '100% JSON',
    configured: isS3Configured,
    bucket: process.env.S3_BUCKET || 'appbaitap-exams',
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'AWS S3 Default',
  });
}
