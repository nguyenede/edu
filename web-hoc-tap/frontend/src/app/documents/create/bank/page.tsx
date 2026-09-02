'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyBankRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents/create/bank');
  }, [router]);
  return null;
}
