import { describe, expect, it } from 'vitest';

import { formatDate } from '@/lib/format';

import { archiveAllTitle, archiveEmailLine } from './archiveAllModel';

describe('archiveAllTitle', () => {
  it('counts the emails', () => {
    expect(archiveAllTitle(12)).toBe('Archive 12 emails?');
    expect(archiveAllTitle(1)).toBe('Archive 1 email?');
    expect(archiveAllTitle(0)).toBe('Archive 0 emails?');
  });
  it('has a plain title without a count', () => {
    expect(archiveAllTitle(null)).toBe('Archive emails?');
    expect(archiveAllTitle(undefined)).toBe('Archive emails?');
    expect(archiveAllTitle(-1)).toBe('Archive emails?');
  });
});

describe('archiveEmailLine', () => {
  const base = { subject: 'Your statement is ready', senderAddress: 'alerts@bank.test', internalDate: '2026-10-10T10:00:00Z', discoveredAt: '2026-10-11T10:00:00Z' };
  it('gives the full subject, sender and the email date', () => {
    expect(archiveEmailLine(base)).toEqual({ subject: 'Your statement is ready', sender: 'alerts@bank.test', date: formatDate('2026-10-10T10:00:00Z', 'list') });
  });
  it('falls back to the discovered date, and to words for a missing subject or sender', () => {
    expect(archiveEmailLine({ ...base, internalDate: null }).date).toBe(formatDate('2026-10-11T10:00:00Z', 'list'));
    expect(archiveEmailLine({ ...base, subject: null, senderAddress: undefined })).toMatchObject({ subject: '(no subject)', sender: 'Unknown sender' });
    expect(archiveEmailLine({ ...base, subject: '  ', senderAddress: ' ' })).toMatchObject({ subject: '(no subject)', sender: 'Unknown sender' });
  });
});
