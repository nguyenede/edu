'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectHelp() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/help');
  }, [router]);
  return null;
}
