import type { ChatBlocks } from './chat.types';

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
}

export interface ChatStep {
  action: string;
  label?: string;
  summary: string;
  detail?: string | null;
  rowCount?: number | null;
  durationMs?: number | null;
  success?: boolean;
  error?: string | null;
}

export type AnswerStatus = 'COMPLETE' | 'FAILED' | 'STOPPED';

export interface AssistantPayload {
  answer?: string;
  clarify?: string;
  clarifyOptions?: string[];
  blocks?: ChatBlocks;
  steps: ChatStep[];
  durationMs?: number;
  status: AnswerStatus;
  error?: string;
}

export interface DraftResult {
  action: 'saved' | 'saved-home' | 'updated' | 'deleted' | 'undone';
  reportId?: string;
  reportName?: string;
  widgetId?: string;
  dashboardId?: string;
}

/** A message as the server stores and returns it. */
export interface StoredMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  createdAt: string;
  text?: string;
  answer?: AssistantPayload;
  draftResult: DraftResult | null;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

/** One line of a conversation as the UI shows it. */
export type ChatRecord =
  | { kind: 'user'; id: string; text: string; /** When it was sent (ISO instant). */ createdAt?: string }
  | {
      kind: 'assistant';
      id: string;
      status: 'running' | AnswerStatus;
      /** Live progress text while running. */
      statusText?: string;
      steps: ChatStep[];
      answer?: string;
      clarify?: string;
      clarifyOptions?: string[];
      blocks?: ChatBlocks;
      durationMs?: number;
      error?: string;
      /** The server has the question: some event arrived, or the answer is stored. Only then can a retry ask it to re-run. */
      stored?: boolean;
      /** Set once the server has stored the answer; needed to save a draft result. */
      messageId?: string;
      draftResult?: DraftResult | null;
    };
