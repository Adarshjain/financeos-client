import { describe, expect, it } from 'vitest';

import type { TableColumn } from '@/lib/reports.types';

import { upcomingKindLabel } from './upcomingModel';

describe('upcomingKindLabel', () => {
  it('names each obligation kind', () => {
    expect(upcomingKindLabel({ kind: 'card_bill' }, undefined)).toBe('Card bill');
    expect(upcomingKindLabel({ kind: 'emi' }, undefined)).toBe('EMI');
    expect(upcomingKindLabel({ kind: 'lending_return' }, undefined)).toBe('Lending');
    expect(upcomingKindLabel({ kind: 'statement_expected' }, undefined)).toBe('Statement');
  });

  it('the server\'s own value label wins when the column carries one', () => {
    const column = { key: 'kind', label: 'Kind', type: 'string', valueLabels: { emi: 'Loan EMI' } } as TableColumn;
    expect(upcomingKindLabel({ kind: 'emi' }, column)).toBe('Loan EMI');
    expect(upcomingKindLabel({ kind: 'card_bill' }, column)).toBe('Card bill');
  });

  it('a missing or unknown kind has no label', () => {
    expect(upcomingKindLabel({}, undefined)).toBeNull();
    expect(upcomingKindLabel({ kind: 'mystery' }, undefined)).toBeNull();
  });
});
