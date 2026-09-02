'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectQuizzes() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/quizzes');
  }, [router]);
  return null;
}
