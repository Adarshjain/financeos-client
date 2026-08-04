import { describe, expect, it } from 'vitest';

import {
  batchFailureLabel,
  REVIEW_REASON_META,
  reviewReasonLabel,
  TRANSACTIONS_CATALOG,
} from '@/components/transactions/catalog';

describe('transactions catalog (CD-1, CD-5)', () => {
  it('defines metadata for review reasons', () => {
    expect(REVIEW_REASON_META.UNRECONCILED.label).toBe('Unreconciled');
    expect(REVIEW_REASON_META.CATEGORY_UNVERIFIED.label).toBe('Category unverified');
    expect(REVIEW_REASON_META.DUPLICATE_SUSPECT.label).toBe('Possible duplicate');
    expect(reviewReasonLabel('UNRECONCILED')).toBe('Unreconciled');
    expect(reviewReasonLabel('UNKNOWN_REASON' as any)).toBe('UNKNOWN_REASON');
  });

  it('maps batch failure labels', () => {
    expect(batchFailureLabel('NOT_FOUND')).toBe('Transaction not found');
    expect(batchFailureLabel('NOT_OWNED')).toBe('Access denied (not owned)');
    expect(batchFailureLabel('ERROR')).toBe('System error occurred');
    expect(batchFailureLabel('CUSTOM_CODE')).toBe('CUSTOM_CODE');
  });

  it('contains coveredByStatement field in TRANSACTIONS_CATALOG (CD-1)', () => {
    const field = TRANSACTIONS_CATALOG.fields.find((f) => f.name === 'coveredByStatement');
    expect(field).toBeDefined();
    expect(field?.type).toBe('boolean');
    expect(field?.role).toBe('filter');
  });

  it('contains expected fields in catalog', () => {
    const fieldNames = TRANSACTIONS_CATALOG.fields.map((f) => f.name);
    expect(fieldNames).toContain('amount');
    expect(fieldNames).toContain('date');
    expect(fieldNames).toContain('reviewType');
    expect(fieldNames).toContain('accountId');
  });
});
