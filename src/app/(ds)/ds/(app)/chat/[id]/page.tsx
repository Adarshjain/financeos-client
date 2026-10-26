import React from 'react';

import { loadChatList, loadConversation } from '@/features/chat/chatData';
import { ChatScreen } from '@/features/chat/ChatScreen';
import { todayInAppZone } from '@/lib/date-range';

/** /ds/chat/[id]: one stored conversation, fetched with the chat list in parallel. */
export default async function DsChatConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initial, conversations] = await Promise.all([loadConversation(id), loadChatList()]);
  return <ChatScreen key={id} conversations={conversations} today={todayInAppZone()} initial={initial} />;
}
