import { describe, expect, it } from 'vitest';

import { getDerivedRoleLabel } from '../transaction.helpers';

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

