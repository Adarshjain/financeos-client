import React from 'react';

import { ChatSkeleton } from '@/features/chat/ChatSkeleton';

export default function DsChatConversationLoading() {
  return <ChatSkeleton conversation />;
}
