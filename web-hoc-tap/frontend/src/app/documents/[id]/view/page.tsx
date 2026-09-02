'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyDocViewRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/app/documents/${encodeURIComponent(id)}/view`);
    } else {
      router.replace('/app/documents');
    }
  }, [router, id]);

  return null;
}
