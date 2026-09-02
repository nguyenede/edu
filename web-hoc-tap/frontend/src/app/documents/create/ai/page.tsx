'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyAiRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents/create/ai');
  }, [router]);
  return null;
}
