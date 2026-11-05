import { describe, expect, it } from 'vitest';

import { detectionText, importingMessage, lockedText, unlockMessage } from './npsGmailModel';

const base = { key: 'k1', pranLast4: '1234', statementCount: 3 };

describe('detectionText', () => {
  it('names the PRAN, holder, count and months', () => {
    expect(detectionText({ ...base, holderName: 'Ravi', firstPeriodStart: '2025-01-01', lastPeriodEnd: '2025-03-31' })).toBe(
      'NPS account found in Gmail (••1234, Ravi) · 3 statements · Jan 2025 – Mar 2025. Whose is it?',
    );
  });
  it('copes with no holder, no dates and one statement', () => {
    expect(detectionText({ ...base, statementCount: 1 })).toBe('NPS account found in Gmail (••1234) · 1 statement. Whose is it?');
  });
});

describe('messages', () => {
  it('importing', () => {
    expect(importingMessage(3)).toBe('Importing 3 statements…');
    expect(importingMessage(1)).toBe('Importing 1 statement…');
    expect(importingMessage(0)).toBe('Account added');
  });
  it('locked', () => {
    expect(lockedText(2)).toBe('2 NPS statements need a password');
    expect(lockedText(1)).toBe('1 NPS statement needs a password');
  });
  it('unlock result; danger when nothing opened', () => {
    expect(unlockMessage({ opened: 2, stillLocked: 1 })).toEqual({ text: 'Opened 2, 1 still locked' });
    expect(unlockMessage({ opened: 0, stillLocked: 3 })).toEqual({ text: 'Opened 0, 3 still locked', tone: 'danger' });
  });
});
