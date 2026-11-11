import { describe, expect, it } from 'vitest';

import { rowButtons } from './inboxRowsModel';
import { action, DISMISS, item } from './inboxTestUtils';

const open = action({ type: 'open', label: 'Open', href: '/investments/corporate-actions' });

describe('rowButtons, detected corporate actions', () => {
  it('an applied one has Undo, enabled by its suggestion', () => {
    const row = item({ key: 'ca_applied:s1', kind: 'corporate_action_applied', refs: { suggestionId: 's1', instrumentId: 'i1' }, actions: [open, DISMISS] });
    expect(rowButtons(row)).toEqual([{ id: 'ca_undo', label: 'Undo', variant: 'secondary', ca: 'undo', disabled: false }]);
    expect(rowButtons(item({ key: 'x', kind: 'corporate_action_applied', actions: [open, DISMISS] }))[0].disabled).toBe(true);
  });

  it('a review one has Review then Ignore', () => {
    const row = item({ key: 'ca_review:s2', kind: 'corporate_action_review', refs: { suggestionId: 's2', instrumentId: 'i1' }, actions: [open] });
    expect(rowButtons(row)).toEqual([
      { id: 'ca_review', label: 'Review', variant: 'secondary', ca: 'review', disabled: false },
      { id: 'ca_not_applicable', label: 'Ignore', variant: 'link', ca: 'not_applicable', disabled: false },
    ]);
  });

  it('a stock that no longer trades has Merged then Delisted, enabled by its instrument', () => {
    const row = item({ key: 'stock_not_trading:i1', kind: 'stock_not_trading', refs: { instrumentId: 'i1' }, actions: [open, DISMISS] });
    expect(rowButtons(row)).toEqual([
      { id: 'ca_merged', label: 'Merged', variant: 'secondary', ca: 'merged', disabled: false },
      { id: 'ca_delisted', label: 'Delisted', variant: 'link', ca: 'delisted', disabled: false },
    ]);
  });

  it('an oversold holding opens the instrument page', () => {
    const row = item({ key: 'holding_oversold:s3', kind: 'holding_oversold', href: '/investments/corporate-actions', refs: { suggestionId: 's3', instrumentId: 'i9' }, actions: [open, DISMISS] });
    expect(rowButtons(row)).toEqual([{ id: 'open-0', label: 'Open', variant: 'link', href: '/investments/i9' }]);
  });

  it('an oversold holding without an instrument keeps the row link', () => {
    const row = item({ key: 'holding_oversold:s4', kind: 'holding_oversold', href: '/investments/corporate-actions', refs: { suggestionId: 's4' }, actions: [open, DISMISS] });
    expect(rowButtons(row)[0].href).toBe('/investments/corporate-actions');
  });
});
