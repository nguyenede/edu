'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DocumentLegacyViewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = (searchParams && typeof searchParams.get === 'function' ? searchParams.get('id') : null) || '6a8980105b9083ecaeffdfaa52bd5c46';
    router.replace(`/app/documents/${encodeURIComponent(id)}`);
  }, [router, searchParams]);

  return null;
}

export default function DocumentLegacyViewRedirectPage() {
  return (
    <Suspense fallback={null}>
      <DocumentLegacyViewContent />
    </Suspense>
  );
}
