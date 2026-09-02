'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectClasses() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/classes');
  }, [router]);
  return null;
}
