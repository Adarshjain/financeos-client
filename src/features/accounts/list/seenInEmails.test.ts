import { describe, expect, it } from 'vitest';

import { formatDate } from '@/lib/format';

import { seenInEmailsLine } from './suggestionsModel';

describe('seenInEmailsLine', () => {
  it('gives the count and the date range', () => {
    expect(seenInEmailsLine({ evidenceMails: 12, firstSeenOn: '2026-01-02', lastSeenOn: '2026-03-09' })).toBe(
      `Seen in 12 emails from ${formatDate('2026-01-02', 'list')} to ${formatDate('2026-03-09', 'list')}`,
    );
  });
  it('uses one date when both are the same', () => {
    expect(seenInEmailsLine({ evidenceMails: 3, firstSeenOn: '2026-01-02', lastSeenOn: '2026-01-02' })).toBe(
      `Seen in 3 emails on ${formatDate('2026-01-02', 'list')}`,
    );
  });
  it('says "1 email" for one', () => {
    expect(seenInEmailsLine({ evidenceMails: 1, firstSeenOn: '2026-01-02', lastSeenOn: '2026-01-02' })).toBe(
      `Seen in 1 email on ${formatDate('2026-01-02', 'list')}`,
    );
  });
  it('falls back to the one date it has, or none', () => {
    expect(seenInEmailsLine({ evidenceMails: 2, firstSeenOn: null, lastSeenOn: '2026-03-09' })).toBe(`Seen in 2 emails on ${formatDate('2026-03-09', 'list')}`);
    expect(seenInEmailsLine({ evidenceMails: 2, firstSeenOn: '2026-03-09', lastSeenOn: null })).toBe(`Seen in 2 emails on ${formatDate('2026-03-09', 'list')}`);
    expect(seenInEmailsLine({ evidenceMails: 2, firstSeenOn: null, lastSeenOn: undefined })).toBe('Seen in 2 emails');
  });
  it('is null with no email count or no item', () => {
    expect(seenInEmailsLine({ evidenceMails: null, firstSeenOn: '2026-01-02', lastSeenOn: '2026-01-02' })).toBeNull();
    expect(seenInEmailsLine({ evidenceMails: 0 })).toBeNull();
    expect(seenInEmailsLine({})).toBeNull();
    expect(seenInEmailsLine(undefined)).toBeNull();
    expect(seenInEmailsLine(null)).toBeNull();
  });
});
