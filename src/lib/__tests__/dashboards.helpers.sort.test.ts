import { describe, expect, it } from 'vitest';

import { builtinWidgetQueryParams, sortQueryValue, widgetQueryParams } from '../dashboards.helpers';

const sort = { key: 'date', direction: 'desc' } as const;

describe('sortQueryValue', () => {
  it('renders a clause as key,dir', () => {
    expect(sortQueryValue(sort)).toBe('date,desc');
    expect(sortQueryValue({ key: 'amount_sum', direction: 'asc' })).toBe('amount_sum,asc');
  });
});

describe('widget query params with a runtime sort', () => {
  it('adds the sort to a table report key only when set', () => {
    expect(widgetQueryParams('r', true, 2, 25, sort)).toEqual({ reportId: 'r', isTable: true, page: 2, size: 25, sort: 'date,desc' });
    expect(widgetQueryParams('r', true, 0, 25, null)).toEqual(widgetQueryParams('r', true, 0, 25));
    expect(widgetQueryParams('r', true, 0, 25)).not.toHaveProperty('sort');
  });

  it('adds the sort to a table built-in key only when set', () => {
    expect(builtinWidgetQueryParams('upcoming', { days: 7 }, true, 0, 25, sort)).toEqual({
      builtinKey: 'upcoming', params: { days: 7 }, isTable: true, page: 0, size: 25, sort: 'date,desc',
    });
    expect(builtinWidgetQueryParams('upcoming', {}, true, 0, 25, null)).toEqual(builtinWidgetQueryParams('upcoming', {}, true, 0, 25));
  });

  it('never adds a sort to a non-table key', () => {
    expect(widgetQueryParams('r', false, 0, 25, sort)).toEqual({ reportId: 'r', isTable: false });
    expect(builtinWidgetQueryParams('net_worth', {}, false, 0, 25, sort)).toEqual({ builtinKey: 'net_worth', params: {}, isTable: false });
  });
});
