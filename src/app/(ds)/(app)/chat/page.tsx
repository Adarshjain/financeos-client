import React from 'react';

import { loadChatList } from '@/features/chat/chatData';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { todayInAppZone } from '@/lib/date-range';

/** /chat: a new chat. `?q=` is read here, on the server, and the screen sends it once. */
export default async function DsChatPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const question = (Array.isArray(q) ? q[0] : q)?.trim();
  const conversations = await loadChatList();
  return <ChatScreen conversations={conversations} today={todayInAppZone()} autoSend={question || undefined} />;
}
