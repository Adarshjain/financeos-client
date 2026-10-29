import { describe, expect, it } from 'vitest';

import { timeInAppZone } from '@/lib/date-range';

import { groupConversations, MAX_CHATS, withNewChat, withoutChat, withQuestion, withTitle } from './chatHistoryModel';
import type { ConversationSummary } from './conversation.types';

const chat = (id: string, updatedAt: string, over: Partial<ConversationSummary> = {}): ConversationSummary => ({
  id,
  title: `Chat ${id}`,
  createdAt: updatedAt,
  updatedAt,
  questionCount: 2,
  ...over,
});

describe('groupConversations', () => {
  const today = '2026-10-26';

  it('groups by day in the app zone and labels each row', () => {
    const groups = groupConversations(
      [
        chat('a', '2026-10-26T08:35:00Z'),
        chat('b', '2026-10-25T16:18:00Z', { questionCount: 1 }),
        chat('c', '2026-10-22T05:00:00Z'),
      ],
      today,
    );
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday', 'Earlier']);
    expect(groups[0].rows[0]).toMatchObject({ title: 'Chat a', dayPrefix: 'Today ', meta: '2:05 pm · 2 questions' });
    expect(groups[1].rows[0]).toMatchObject({ dayPrefix: 'Yesterday ', meta: '9:48 pm · 1 question' });
    expect(groups[2].rows[0]).toMatchObject({ dayPrefix: '', meta: '22 Oct · 2 questions' });
  });

  it('reads the day in IST, not UTC', () => {
    // 19:00 UTC on the 25th is 00:30 IST on the 26th.
    const groups = groupConversations([chat('a', '2026-10-25T19:00:00Z')], today);
    expect(groups.map((g) => g.id)).toEqual(['today']);
    expect(groups[0].rows[0].meta).toBe('12:30 am · 2 questions');
  });

  it('leaves out empty groups and calls an untitled chat New chat', () => {
    const groups = groupConversations([chat('a', '2026-10-26T08:35:00Z', { title: null })], today);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows[0].title).toBe('New chat');
  });
});

describe('history updates', () => {
  const list = Array.from({ length: MAX_CHATS }, (_, i) => chat(`c${i}`, '2026-10-26T08:00:00Z'));

  it('puts a new chat first and drops the oldest beyond ten', () => {
    const next = withNewChat(list, 'new', new Date('2026-10-26T09:00:00Z'));
    expect(next).toHaveLength(MAX_CHATS);
    expect(next[0]).toMatchObject({ id: 'new', title: null, questionCount: 1 });
    expect(next.some((c) => c.id === `c${MAX_CHATS - 1}`)).toBe(false);
  });

  it('does not add a chat twice', () => {
    expect(withNewChat(list, 'c3')).toBe(list);
  });

  it('a question moves its chat to the front with one more question', () => {
    const next = withQuestion(list, 'c4', new Date('2026-10-26T10:00:00Z'));
    expect(next[0]).toMatchObject({ id: 'c4', questionCount: 3, updatedAt: '2026-10-26T10:00:00.000Z' });
    expect(next).toHaveLength(list.length);
    expect(next.filter((c) => c.id === 'c4')).toHaveLength(1);
    expect(withQuestion(list, 'nope')).toBe(list);
  });

  it('sets a title and removes a chat', () => {
    expect(withTitle(list, 'c1', 'Renamed')[1].title).toBe('Renamed');
    expect(withoutChat(list, 'c1').map((c) => c.id)).not.toContain('c1');
  });
});

describe('timeInAppZone', () => {
  it('reads the clock in IST with two digits', () => {
    expect(timeInAppZone('2026-10-26T18:30:00Z')).toBe('00:00');
    expect(timeInAppZone('2026-10-26T03:35:00Z')).toBe('09:05');
  });
});
