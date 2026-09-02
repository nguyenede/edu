'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyOcrRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents/create/ocr');
  }, [router]);
  return null;
}
