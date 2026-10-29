import React from 'react';

import { loadChatList } from '@/features/chat/chatData';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { parseChatUrl } from '@/features/chat/chatUrl';
import type { SearchParams } from '@/features/shell/searchParams';
import { todayInAppZone } from '@/lib/date-range';

export const metadata = { title: 'Ask the data' };

/** /chat: a new chat. `?q=` is read here, on the server, and the screen sends it once. */
export default async function DsChatPage({ searchParams }: { searchParams: SearchParams }) {
  const { question } = parseChatUrl(await searchParams);
  const conversations = await loadChatList();
  return <ChatScreen conversations={conversations} today={todayInAppZone()} autoSend={question} />;
}
