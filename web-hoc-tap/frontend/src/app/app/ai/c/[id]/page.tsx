'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import AiChatView from '@/components/AiChatView';

export default function ConversationPage() {
  const params = useParams();
  const id =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : undefined;

  return <AiChatView initialSessionId={id} />;
}
