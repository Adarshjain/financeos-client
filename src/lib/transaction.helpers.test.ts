import { describe, expect, it } from 'vitest';

import { sanitizeCreateLinkRequest } from './transaction.helpers';

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
