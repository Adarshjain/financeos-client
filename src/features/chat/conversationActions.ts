'use server';

import { chatApi } from '@/lib/apiClient';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';

import type { Conversation, ConversationSummary, DraftResult } from './conversation.types';

/** The last ten conversations, newest first. */
export const listConversations = action('conversation.listConversations', createDomainAction(
  { fallbackError: "Couldn't load conversations. Try again." },
  async (): Promise<ConversationSummary[]> => chatApi.listConversations(),
));

export const getConversation = action('conversation.getConversation', createDomainAction(
  { fallbackError: "Couldn't load the conversation. Try again." },
  async (id: string): Promise<Conversation> => chatApi.getConversation(id),
));

export const renameConversation = action('conversation.renameConversation', createDomainAction(
  { fallbackError: "Couldn't rename the conversation. Try again." },
  async (id: string, title: string): Promise<ConversationSummary> => chatApi.renameConversation(id, title),
));

export const deleteConversation = action('conversation.deleteConversation', createDomainAction(
  { fallbackError: "Couldn't delete the conversation. Try again." },
  async (id: string): Promise<void> => chatApi.deleteConversation(id),
));

/** Remembers what happened to a report draft so it still reads right when the conversation is reopened. */
export const saveDraftResult = action('conversation.saveDraftResult', createDomainAction(
  { fallbackError: "Couldn't save the draft result. Try again." },
  async (conversationId: string, messageId: string, draftResult: DraftResult): Promise<void> =>
    chatApi.saveDraftResult(conversationId, messageId, draftResult),
));
