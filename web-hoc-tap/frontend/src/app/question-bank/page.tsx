'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectQuestionBank() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/app/question-bank');
  }, [router]);
  return null;
}
