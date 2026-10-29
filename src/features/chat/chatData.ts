import { notFound } from 'next/navigation';
import { cache } from 'react';

import { loaded, signInIfSessionEnded } from '@/features/shell/loadHelpers';
import { ApiError, chatApi } from '@/lib/apiClient';

import type { Conversation, ConversationSummary } from './conversation.types';

/** The recent chats for the pane; an empty pane when the list cannot load, so the page still works. */
export async function loadChatList(): Promise<ConversationSummary[]> {
  const result = await loaded(chatApi.listConversations());
  return result.ok ? result.data : [];
}

/** One stored conversation; a missing (or another user's) conversation is a 404 page. */
export const loadConversation = cache(async (id: string): Promise<Conversation> => {
  try {
    return await chatApi.getConversation(id);
  } catch (error) {
    await signInIfSessionEnded(error);
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});
