import { describe, expect, it } from 'vitest';

import type { TableColumn } from '@/lib/reports.types';
import { formatDate, formatMoney } from '@/lib/utils';

import { cardLayout, cardMetaLine } from '../tableCards.helpers';

const date: TableColumn = { key: 'date', label: 'Date', type: 'date' };
const description: TableColumn = { key: 'description', label: 'Description', type: 'string' };
const account: TableColumn = { key: 'account', label: 'Account', type: 'string' };
const kind: TableColumn = { key: 'kind', label: 'Kind', type: 'enum', valueLabels: { bank_account: 'Bank account' } };
const excluded: TableColumn = { key: 'excluded', label: 'Excluded', type: 'boolean' };
const quantity: TableColumn = { key: 'quantity', label: 'Quantity', type: 'number', format: 'number' };
const price: TableColumn = { key: 'price', label: 'Price', type: 'number', format: 'currency' };
const amount: TableColumn = { key: 'amount', label: 'Amount', type: 'number', format: 'currency' };
const units: TableColumn = { key: 'units', label: 'Units', type: 'number' };

describe('cardLayout', () => {
  it('titles the card with the first string column, skipping a leading date', () => {
    expect(cardLayout([date, description, account, amount]).title).toBe(description);
  });

  it('falls back to the first enum column without a string column', () => {
    expect(cardLayout([date, kind, amount]).title).toBe(kind);
  });

  it('falls back to the first date without a string or enum column', () => {
    expect(cardLayout([date, amount]).title).toBe(date);
  });

  it('else to the first column that is not the figure (a loan schedule)', () => {
    const emi: TableColumn = { key: 'installment', label: 'EMI #', type: 'number', format: 'number' };
    const layout = cardLayout([emi, amount]);
    expect(layout.title).toBe(emi);
    expect(layout.value).toBe(amount);
    expect(layout.meta).toEqual([]);
  });

  it('has no title when the only column is the figure', () => {
    expect(cardLayout([amount]).title).toBeNull();
  });

  it('takes the named value column when it is displayed', () => {
    expect(cardLayout([description, quantity, price], 'quantity').value).toBe(quantity);
  });

  it('ignores a value key that is not a column', () => {
    expect(cardLayout([description, quantity, price], 'missing').value).toBe(price);
  });

  it('defaults the value to the last currency column', () => {
    expect(cardLayout([description, price, amount, quantity]).value).toBe(amount);
  });

  it('else the last number column', () => {
    expect(cardLayout([description, quantity, units]).value).toBe(units);
  });

  it('has no value without a number column', () => {
    expect(cardLayout([date, description]).value).toBeNull();
  });

  it('keeps every other column, in order, for the meta line', () => {
    expect(cardLayout([date, description, account, kind, amount]).meta).toEqual([date, account, kind]);
  });
});

describe('cardMetaLine', () => {
  const meta = [date, account, kind, excluded, price];

  it('formats each value like the table and joins them with a middle dot', () => {
    expect(
      cardMetaLine({ date: '2026-10-05', account: 'HDFC', kind: 'bank_account', excluded: true, price: 12.5 }, meta),
    ).toBe([formatDate('2026-10-05'), 'HDFC', 'Bank account', 'Excluded', formatMoney(12.5)].join(' · '));
  });

  it('names a true boolean by its column label and skips a false one', () => {
    expect(cardMetaLine({ excluded: true }, [excluded])).toBe('Excluded');
    expect(cardMetaLine({ excluded: 'true' }, [excluded])).toBe('Excluded');
    expect(cardMetaLine({ excluded: false }, [excluded])).toBe('');
    expect(cardMetaLine({ excluded: 'false' }, [excluded])).toBe('');
  });

  it('skips empty values', () => {
    expect(cardMetaLine({ date: null, account: '', kind: undefined, excluded: false, price: 3 }, meta)).toBe(
      formatMoney(3),
    );
  });

  it('is empty when every value is', () => {
    expect(cardMetaLine({}, meta)).toBe('');
  });
});
