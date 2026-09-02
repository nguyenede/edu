'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectNotifications() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/notifications');
  }, [router]);
  return null;
}
