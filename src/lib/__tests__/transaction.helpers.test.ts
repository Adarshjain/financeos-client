import { describe, expect, it } from 'vitest';

import { getDerivedRoleLabel, sanitizeCreateLinkRequest } from '../transaction.helpers';

const base = {
  type: 'TRANSFER' as const,
  members: [
    { transactionId: 't1', isAnchor: true },
    { transactionId: 't2', isAnchor: false },
  ],
};

describe('sanitizeCreateLinkRequest', () => {
  it('keeps only the fields the API expects', () => {
    const out = sanitizeCreateLinkRequest({
      ...base,
      // extra keys a caller might carry along
      ...({ id: 'nope', createdAt: 'nope' } as object),
    });
    expect(Object.keys(out).sort()).toEqual(['members', 'type']);
  });

  it('trims a note', () => {
    expect(sanitizeCreateLinkRequest({ ...base, note: '  refund  ' }).note).toBe(
      'refund',
    );
  });

  it('omits an absent, empty or whitespace-only note', () => {
    expect(sanitizeCreateLinkRequest(base).note).toBeUndefined();
    expect(sanitizeCreateLinkRequest({ ...base, note: '' }).note).toBeUndefined();
    expect(sanitizeCreateLinkRequest({ ...base, note: '   ' }).note).toBeUndefined();
    expect(sanitizeCreateLinkRequest({ ...base, note: null }).note).toBeUndefined();
  });

  // The removed guard compared `note` against React's Flight sentinel for
  // `undefined`. Nothing reachable produced it, and it silently discarded the
  // note of any user who genuinely typed that string.
  it('preserves a note that literally reads "$undefined"', () => {
    expect(
      sanitizeCreateLinkRequest({ ...base, note: '$undefined' }).note,
    ).toBe('$undefined');
  });

  it('forwards alignRefundCategories only when it is an explicit boolean', () => {
    expect(
      sanitizeCreateLinkRequest({ ...base, alignRefundCategories: true })
        .alignRefundCategories,
    ).toBe(true);
    expect(
      sanitizeCreateLinkRequest({ ...base, alignRefundCategories: false })
        .alignRefundCategories,
    ).toBe(false);
    expect('alignRefundCategories' in sanitizeCreateLinkRequest(base)).toBe(false);
    expect(
      'alignRefundCategories' in
        sanitizeCreateLinkRequest({
          ...base,
          ...({ alignRefundCategories: undefined } as object),
        }),
    ).toBe(false);
  });

  it('passes members and type through unchanged', () => {
    const out = sanitizeCreateLinkRequest({ ...base, note: 'x' });
    expect(out.type).toBe('TRANSFER');
    expect(out.members).toEqual(base.members);
  });
});

describe('getDerivedRoleLabel (CD-8)', () => {
  it('derives correct labels for TRANSFER', () => {
    expect(getDerivedRoleLabel('TRANSFER', true)).toBe('Transfer out');
    expect(getDerivedRoleLabel('TRANSFER', false)).toBe('Transfer in');
  });

  it('derives correct labels for CC_PAYMENT', () => {
    expect(getDerivedRoleLabel('CC_PAYMENT', true)).toBe('Card bill payment');
    expect(getDerivedRoleLabel('CC_PAYMENT', false)).toBe('Payment credited');
  });

  it('derives correct labels for REFUND', () => {
    expect(getDerivedRoleLabel('REFUND', true)).toBe('Refunded purchase');
    expect(getDerivedRoleLabel('REFUND', false)).toBe('Refund');
  });

  it('derives correct labels for REVERSAL', () => {
    expect(getDerivedRoleLabel('REVERSAL', true)).toBe('Reversed');
    expect(getDerivedRoleLabel('REVERSAL', false)).toBe('Reversal');
  });

  it('derives correct labels for FEE', () => {
    expect(getDerivedRoleLabel('FEE', true)).toBe('Parent charge');
    expect(getDerivedRoleLabel('FEE', false)).toBe('Fee');
  });

  it('derives correct labels for EMI', () => {
    expect(getDerivedRoleLabel('EMI', true)).toBe('Purchase (EMI)');
    expect(getDerivedRoleLabel('EMI', false)).toBe('Installment');
  });

  it('falls back gracefully for unknown link types', () => {
    expect(getDerivedRoleLabel('UNKNOWN' as any, true)).toBe('Parent');
    expect(getDerivedRoleLabel('UNKNOWN' as any, false)).toBe('Counterpart');
  });
});

