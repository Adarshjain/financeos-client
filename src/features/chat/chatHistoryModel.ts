import { relativeDay } from '@/features/accounts/list/accountsListModel';
import { todayInAppZone } from '@/lib/date-range';
import { formatCount, formatDate, formatTime } from '@/lib/format';

import type { ConversationSummary } from './conversation.types';

/** The server keeps this many chats per user; a new chat removes the oldest. */
export const MAX_CHATS = 10;

export const UNTITLED_CHAT = 'New chat';

export type HistoryGroupId = 'today' | 'yesterday' | 'earlier';

export interface HistoryRow {
  id: string;
  title: string;
  /** "Today " or "Yesterday " (shown on phone only), else empty. */
  dayPrefix: string;
  /** "14:05 · 2 questions" for today and yesterday, "22 Oct · 2 questions" before. */
  meta: string;
}

export interface HistoryGroup {
  id: HistoryGroupId;
  label: string;
  rows: HistoryRow[];
}

export function questionsLabel(count: number): string {
  return formatCount(count, ['question', 'questions']);
}

/** Today / Yesterday / Earlier, in the app zone, newest first within each. */
export function groupConversations(list: ConversationSummary[], today: string = todayInAppZone()): HistoryGroup[] {
  const groups: HistoryGroup[] = [
    { id: 'today', label: 'Today', rows: [] },
    { id: 'yesterday', label: 'Yesterday', rows: [] },
    { id: 'earlier', label: 'Earlier', rows: [] },
  ];
  for (const c of list) {
    const day = todayInAppZone(new Date(c.updatedAt));
    const rel = relativeDay(day, today);
    const group = groups[rel === 'today' ? 0 : rel === 'yesterday' ? 1 : 2];
    const when = group.id === 'earlier' ? formatDate(day, 'list', { today }) : formatTime(c.updatedAt);
    group.rows.push({
      id: c.id,
      title: c.title?.trim() || UNTITLED_CHAT,
      dayPrefix: group.id === 'today' ? 'Today ' : group.id === 'yesterday' ? 'Yesterday ' : '',
      meta: `${when} · ${questionsLabel(c.questionCount)}`,
    });
  }
  return groups.filter((g) => g.rows.length > 0);
}

/** A chat the server just created goes first; the oldest beyond ten drop, as on the server. */
export function withNewChat(list: ConversationSummary[], id: string, now: Date = new Date()): ConversationSummary[] {
  if (list.some((c) => c.id === id)) return list;
  const at = now.toISOString();
  return [{ id, title: null, createdAt: at, updatedAt: at, questionCount: 1 }, ...list].slice(0, MAX_CHATS);
}

/** A question sent in a chat that already exists: its count goes up and it moves to the front (newest first, like the server). */
export function withQuestion(list: ConversationSummary[], id: string, now: Date = new Date()): ConversationSummary[] {
  const row = list.find((c) => c.id === id);
  if (!row) return list;
  return [{ ...row, questionCount: row.questionCount + 1, updatedAt: now.toISOString() }, ...list.filter((c) => c.id !== id)];
}

export function withTitle(list: ConversationSummary[], id: string, title: string): ConversationSummary[] {
  return list.map((c) => (c.id === id ? { ...c, title } : c));
}

export function withoutChat(list: ConversationSummary[], id: string): ConversationSummary[] {
  return list.filter((c) => c.id !== id);
}
