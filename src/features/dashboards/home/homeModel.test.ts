import { describe, expect, it } from 'vitest';

import { firstName, greetingFor, greetingLine, latestSync, needsYouText, statusLine, syncedAgo } from './homeModel';

// 2026-10-13 is a Tuesday. The app zone is IST (UTC+5:30), whatever the browser's zone is.
const at = (utc: string) => new Date(`2026-10-13T${utc}:00Z`);

describe('greetingFor', () => {
  it.each([
    ['00:30', 'Good morning'], // 06:00 IST
    ['05:59', 'Good morning'], // 11:29 IST
    ['06:30', 'Good afternoon'], // 12:00 IST
    ['11:29', 'Good afternoon'], // 16:59 IST
    ['11:30', 'Good evening'], // 17:00 IST
    ['18:29', 'Good evening'], // 23:59 IST
  ])('reads the hour in IST: %s UTC is %s', (utc, expected) => {
    expect(greetingFor(at(utc))).toBe(expected);
  });

  it('is morning again from midnight IST', () => {
    // 18:30 UTC on the 13th is 00:00 IST on the 14th: morning.
    expect(greetingFor(at('18:30'))).toBe('Good morning');
  });
});

describe('greetingLine', () => {
  it('addresses the user by first name', () => {
    expect(greetingLine(at('07:00'), 'Arjun Mehta')).toBe('Good afternoon, Arjun');
  });

  it('is just the greeting without a name', () => {
    expect(greetingLine(at('07:00'), null)).toBe('Good afternoon');
    expect(greetingLine(at('07:00'), '   ')).toBe('Good afternoon');
    expect(firstName(undefined)).toBeUndefined();
  });
});

describe('syncedAgo', () => {
  const now = at('07:00');
  it.each([
    ['2026-10-13T06:59:30Z', 'synced just now'],
    ['2026-10-13T06:56:00Z', 'synced 4 min ago'],
    ['2026-10-13T04:00:00Z', 'synced 3 h ago'],
    ['2026-10-10T07:00:00Z', 'synced 3 d ago'],
  ])('%s reads %s', (iso, expected) => expect(syncedAgo(iso, now)).toBe(expected));

  it('has nothing to say without a time', () => {
    expect(syncedAgo(null, now)).toBeUndefined();
    expect(syncedAgo('not a date', now)).toBeUndefined();
  });
});

describe('latestSync', () => {
  it('is the most recent sync across mailboxes, ignoring ones that never synced', () => {
    expect(latestSync([{ lastSyncedAt: '2026-10-12T10:00:00Z' }, { lastSyncedAt: null }, { lastSyncedAt: '2026-10-13T06:00:00Z' }])).toBe('2026-10-13T06:00:00Z');
    expect(latestSync([{ lastSyncedAt: null }])).toBeUndefined();
    expect(latestSync([])).toBeUndefined();
  });
});

describe('needsYouText', () => {
  it('counts, singular and plural, and is silent at zero or unknown', () => {
    expect(needsYouText(2)).toBe('2 things need you');
    expect(needsYouText(1)).toBe('1 thing needs you');
    expect(needsYouText(0)).toBeUndefined();
    expect(needsYouText(undefined)).toBeUndefined();
  });
});

describe('statusLine', () => {
  const now = at('07:00');
  it('joins the day, what needs you and the last sync', () => {
    expect(statusLine({ now, needsYou: 2, lastSyncedAt: '2026-10-13T06:56:00Z' })).toBe('Tuesday 13 Oct · 2 things need you · synced 4 min ago');
  });

  it('leaves out each part that has no data', () => {
    expect(statusLine({ now })).toBe('Tuesday 13 Oct');
    expect(statusLine({ now, needsYou: 0, lastSyncedAt: '2026-10-13T06:56:00Z' })).toBe('Tuesday 13 Oct · synced 4 min ago');
    expect(statusLine({ now, needsYou: 3 })).toBe('Tuesday 13 Oct · 3 things need you');
  });
});
