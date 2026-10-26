import React from 'react';

import type { ChatReportDraft } from './chat.types';
import { ChatReportDraftCard } from './ChatReportDraftCard';
import type { DraftResult } from './conversation.types';

export interface ChatReportDraftSlotProps {
  draft: ChatReportDraft;
  /** What happened to the draft when the conversation was last open (saved, updated, deleted). */
  draftResult?: DraftResult | null;
  conversationId: string | null;
  messageId?: string;
}

/** Where a report draft shows in an answer. */
export function ChatReportDraftSlot(props: ChatReportDraftSlotProps) {
  return <ChatReportDraftCard {...props} />;
}
