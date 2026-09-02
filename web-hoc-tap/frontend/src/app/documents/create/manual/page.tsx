'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyManualRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents/create/manual');
  }, [router]);
  return null;
}
