import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actionHref,
  appTodayPlus,
  canDismiss,
  canSnooze,
  formatBadge,
  headerCounts,
  INBOX_SECTIONS,
  isBillAction,
  primaryActions,
  severityStripeClass,
  SNOOZE_PRESETS,
  summarise,
} from '../inbox.helpers';
import { action, DISMISS, item, SNOOZE } from './fixtures';

describe('summarise', () => {
  it('counts rows per section; badge is act_now + needs_look only', () => {
    const s = summarise([
      item({ key: '1', section: 'act_now' }),
      item({ key: '2', section: 'act_now' }),
      item({ key: '3', section: 'needs_look' }),
      item({ key: '4', section: 'info' }),
      item({ key: '5', section: 'info' }),
      item({ key: '6', section: 'info' }),
    ]);
    expect(s).toEqual({ actNow: 2, needsLook: 1, info: 3, badge: 3 });
  });

  it('counts a summary row as one row (not its count)', () => {
    expect(summarise([item({ key: 's', rowType: 'summary', section: 'needs_look', count: 42 })])).toEqual({
      actNow: 0, needsLook: 1, info: 0, badge: 1,
    });
  });

  it('empty list is all zeros', () => {
    expect(summarise([])).toEqual({ actNow: 0, needsLook: 0, info: 0, badge: 0 });
  });
});

describe('headerCounts', () => {
  it('is null without a summary', () => {
    expect(headerCounts(undefined)).toBeNull();
  });
  it('joins act and look parts', () => {
    expect(headerCounts({ actNow: 4, needsLook: 2, info: 9, badge: 6 })).toBe('4 to act · 2 to look');
  });
  it('shows only the non-zero part', () => {
    expect(headerCounts({ actNow: 3, needsLook: 0, info: 0, badge: 3 })).toBe('3 to act');
    expect(headerCounts({ actNow: 0, needsLook: 5, info: 0, badge: 5 })).toBe('5 to look');
  });
  it('"Nothing urgent" when only info rows exist; null when nothing at all', () => {
    expect(headerCounts({ actNow: 0, needsLook: 0, info: 2, badge: 0 })).toBe('Nothing urgent');
    expect(headerCounts({ actNow: 0, needsLook: 0, info: 0, badge: 0 })).toBeNull();
  });
});

describe('formatBadge', () => {
  it.each([
    [null, null],
    [undefined, null],
    [0, null],
    [-3, null],
    [1, '1'],
    [99, '99'],
    [100, '99+'],
    [1000, '99+'],
  ])('%s -> %s', (n, out) => {
    expect(formatBadge(n as number | null | undefined)).toBe(out);
  });
});

describe('appTodayPlus and snooze presets (IST)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('adds days to the IST business date', () => {
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
    expect(appTodayPlus(0)).toBe('2026-10-08');
    expect(appTodayPlus(1)).toBe('2026-10-09');
    expect(appTodayPlus(3)).toBe('2026-10-11');
    expect(appTodayPlus(7)).toBe('2026-10-15');
  });

  it('uses IST, not UTC, around midnight (20:00Z is already tomorrow in IST)', () => {
    vi.setSystemTime(new Date('2026-10-08T20:00:00Z'));
    expect(appTodayPlus(0)).toBe('2026-10-09');
    expect(appTodayPlus(1)).toBe('2026-10-10');
  });

  it('rolls over month and year ends', () => {
    vi.setSystemTime(new Date('2026-12-30T06:00:00Z'));
    expect(appTodayPlus(3)).toBe('2027-01-02');
    vi.setSystemTime(new Date('2026-02-26T06:00:00Z'));
    expect(appTodayPlus(7)).toBe('2026-03-05');
  });

  it('presets are tomorrow, +3 and +7 days', () => {
    expect(SNOOZE_PRESETS).toEqual([
      { label: 'Tomorrow', days: 1 },
      { label: 'In 3 days', days: 3 },
      { label: 'Next week', days: 7 },
    ]);
  });
});

describe('row helpers', () => {
  it('section order and titles', () => {
    expect(INBOX_SECTIONS).toEqual([
      { key: 'act_now', title: 'Act now' },
      { key: 'needs_look', title: 'Needs a look' },
      { key: 'info', title: 'Info' },
    ]);
  });

  it('severity stripe: critical rose, warning amber, anything else slate', () => {
    expect(severityStripeClass('critical')).toBe('bg-rose-500');
    expect(severityStripeClass('warning')).toBe('bg-amber-500');
    expect(severityStripeClass('info')).toMatch(/slate/);
    expect(severityStripeClass('whatever')).toMatch(/slate/);
  });

  it('isBillAction only for mark_paid, confirm_payment, set_details', () => {
    for (const t of ['mark_paid', 'confirm_payment', 'set_details']) expect(isBillAction(t)).toBe(true);
    for (const t of ['open', 'snooze', 'dismiss', 'review', 'reconnect']) expect(isBillAction(t)).toBe(false);
  });

  it('primaryActions drops snooze and dismiss, keeps order', () => {
    const it = item({ key: 'k', actions: [action({ type: 'mark_paid' }), SNOOZE, action({ type: 'open' }), DISMISS] });
    expect(primaryActions(it).map((a) => a.type)).toEqual(['mark_paid', 'open']);
  });

  it('canSnooze needs an item row with a snooze action', () => {
    expect(canSnooze(item({ key: 'a', actions: [SNOOZE] }))).toBe(true);
    expect(canSnooze(item({ key: 'b', rowType: 'summary', actions: [SNOOZE] }))).toBe(false);
    expect(canSnooze(item({ key: 'c', actions: [DISMISS] }))).toBe(false);
  });

  it('canDismiss needs a dismiss action (summary rows included)', () => {
    expect(canDismiss(item({ key: 'a', actions: [DISMISS] }))).toBe(true);
    expect(canDismiss(item({ key: 'b', rowType: 'summary', actions: [DISMISS] }))).toBe(true);
    expect(canDismiss(item({ key: 'c', actions: [SNOOZE] }))).toBe(false);
  });

  it('actionHref prefers the action href, then the row href, else null', () => {
    const row = item({ key: 'k', href: '/row' });
    expect(actionHref(action({ type: 'open', href: '/act' }), row)).toBe('/act');
    expect(actionHref(action({ type: 'open' }), row)).toBe('/row');
    expect(actionHref(action({ type: 'open' }), item({ key: 'k' }))).toBeNull();
    expect(actionHref(action({ type: 'open', href: null }), item({ key: 'k', href: null }))).toBeNull();
  });
});
