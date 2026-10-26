'use server';

import { chatApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';

import type { Conversation, ConversationSummary, DraftResult } from './conversation.types';

/** The last ten conversations, newest first. */
export const listConversations = createDomainAction(
  { fallbackError: 'Failed to load conversations' },
  async (): Promise<ConversationSummary[]> => chatApi.listConversations(),
);

export const getConversation = createDomainAction(
  { fallbackError: 'Failed to load the conversation' },
  async (id: string): Promise<Conversation> => chatApi.getConversation(id),
);

export const renameConversation = createDomainAction(
  { fallbackError: 'Failed to rename the conversation' },
  async (id: string, title: string): Promise<ConversationSummary> => chatApi.renameConversation(id, title),
);

export const deleteConversation = createDomainAction(
  { fallbackError: 'Failed to delete the conversation' },
  async (id: string): Promise<void> => chatApi.deleteConversation(id),
);

/** Remembers what happened to a report draft so it still reads right when the conversation is reopened. */
export const saveDraftResult = createDomainAction(
  { fallbackError: 'Failed to save the draft result' },
  async (conversationId: string, messageId: string, draftResult: DraftResult): Promise<void> =>
    chatApi.saveDraftResult(conversationId, messageId, draftResult),
);
