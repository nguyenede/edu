'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyDocumentsCreateRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents/create');
  }, [router]);

  return null;
}
