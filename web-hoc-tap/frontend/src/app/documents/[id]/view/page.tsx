'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyDocViewRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/documents/${encodeURIComponent(id)}`);
    } else {
      router.replace('/documents');
    }
  }, [router, id]);

  return null;
}
