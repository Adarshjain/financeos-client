import { describe, expect, it } from 'vitest';

import { deletionImpactItems, deletionNote } from './deletionImpactModel';

describe('deletionImpactItems', () => {
  it('leads with the bold count and lists what stays', () => {
    const items = deletionImpactItems({
      transactionsToDelete: 1,
      linkedToRecords: 1,
      transactionsKept: 2,
      alertsToReopen: 1,
    });
    expect(items[0]).toEqual({ lead: '1 transaction', text: ' it created will be deleted.' });
    expect(items.map((i) => (i.lead ?? '') + i.text).slice(1)).toEqual([
      '1 of them is linked to a loan, lending, dividend or transfer. Those records stay but lose the link.',
      '2 transactions it only matched (email alerts, manual entries, or rows another statement also covers) will stay.',
      '1 email alert goes back to review as unreconciled.',
    ]);
  });

  it('says none are deleted and skips zero counts', () => {
    expect(
      deletionImpactItems({ transactionsToDelete: 0, linkedToRecords: 0, transactionsKept: 0, alertsToReopen: 0 })
    ).toEqual([{ text: 'It created no transactions that only this statement covers, so none will be deleted.' }]);
  });
});

describe('deletionNote', () => {
  it('differs for an emailed statement', () => {
    expect(deletionNote('file_upload')).toBe('You can upload the same file again afterwards.');
    expect(deletionNote('gmail')).toMatch(/Gmail won't fetch/);
  });
});
