import { describe, expect, it } from 'vitest';

import { REVIEW_REASON_META, REVIEW_REASONS, reviewReasonLabel } from './catalog';

describe('review reason catalog', () => {
  it('labels NOT_ON_STATEMENT "Not on statement" with the warning variant', () => {
    expect(REVIEW_REASON_META.NOT_ON_STATEMENT.variant).toBe('warning');
    expect(reviewReasonLabel('NOT_ON_STATEMENT')).toBe('Not on statement');
    expect(REVIEW_REASONS).toContain('NOT_ON_STATEMENT');
  });

  it('keeps the older reasons for rows that still carry them', () => {
    expect(reviewReasonLabel('UNRECONCILED')).toBe('Unreconciled');
    expect(reviewReasonLabel('DUPLICATE_SUSPECT')).toBe('Possible duplicate');
    expect(reviewReasonLabel('DATE_CORRECTED')).toBe('Date corrected');
  });
});
