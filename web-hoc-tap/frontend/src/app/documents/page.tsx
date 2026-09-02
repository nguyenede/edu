'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectDocuments() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/documents');
  }, [router]);
  return null;
}
