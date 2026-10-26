import { describe, expect, it } from 'vitest';

import { activeResult, datasourceLabel, draftCaption, isMalformedDraft } from './draftModel';

describe('isMalformedDraft', () => {
  const ok = { mode: 'create', name: 'n', type: 'KPI', datasource: 'transactions', definition: {} } as const;
  it('accepts a full create or update and a delete with its report', () => {
    expect(isMalformedDraft(ok)).toBe(false);
    expect(isMalformedDraft({ ...ok, mode: 'update', reportId: 'r' })).toBe(false);
    expect(isMalformedDraft({ mode: 'delete', reportId: 'r' })).toBe(false);
  });
  it('rejects a missing mode, definition, name or report id', () => {
    expect(isMalformedDraft(null)).toBe(true);
    expect(isMalformedDraft({ ...ok, definition: undefined })).toBe(true);
    expect(isMalformedDraft({ ...ok, name: '' })).toBe(true);
    expect(isMalformedDraft({ mode: 'delete' })).toBe(true);
  });
});

describe('draftCaption', () => {
  it('joins type, datasource and description', () => {
    expect(draftCaption({ mode: 'create', type: 'CHART', datasource: 'net_worth', description: 'last 12 months' })).toBe('Chart · Net worth · last 12 months');
    expect(draftCaption({ mode: 'create', type: 'KPI', datasource: 'transactions' })).toBe('KPI · Transactions');
  });
  it('labels a datasource', () => {
    expect(datasourceLabel('reward_earnings')).toBe('Reward earnings');
  });
});

describe('activeResult', () => {
  it('drops an undone outcome and keeps the others', () => {
    expect(activeResult({ action: 'undone' })).toBeNull();
    expect(activeResult(null)).toBeNull();
    expect(activeResult({ action: 'saved', reportId: 'r' })).toEqual({ action: 'saved', reportId: 'r' });
  });
});
