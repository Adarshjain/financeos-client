import { describe, expect, it } from 'vitest';

import { addEpfFiles, assignParams, countsLine, EPF_MAX_FILES, type EpfBatchResult, type EpfPreview, type EpfPreviewRow, epfRow, type EpfSection, importableTotal, mismatchLine, resultLine, resultTitle } from './epfImportModel';

const pdf = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: 'application/pdf' });

describe('addEpfFiles', () => {
  it('appends new files and skips one with the same name and size', () => {
    const a = pdf('a.pdf');
    const next = addEpfFiles([a], [pdf('a.pdf'), pdf('b.pdf')]);
    expect(next.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(next.error).toBeNull();
  });

  it('keeps a same-name file of another size', () => {
    expect(addEpfFiles([pdf('a.pdf', 10)], [pdf('a.pdf', 11)]).files).toHaveLength(2);
  });

  it('refuses a 13th file', () => {
    const full = Array.from({ length: EPF_MAX_FILES }, (_, i) => pdf(`f${i}.pdf`));
    const next = addEpfFiles(full, [pdf('extra.pdf')]);
    expect(next.files).toHaveLength(EPF_MAX_FILES);
    expect(next.error).toMatch(/up to 12 passbooks/);
  });

  it('refuses files that take the total past the size cap', () => {
    const big = pdf('big.pdf', 20 * 1024 * 1024);
    const next = addEpfFiles([big], [pdf('more.pdf', 6 * 1024 * 1024)]);
    expect(next.files).toEqual([big]);
    expect(next.error).toMatch(/the limit is 25MB per upload/);
  });
});

const section = (key: string, existingId: string | null): EpfSection =>
  ({ key, fileNames: [], preview: { employer: { existingId, name: key }, newCount: 2, replacesCount: 1, existsCount: 0, rows: [], unrecognisedLines: 0, employerOptions: [] } }) as unknown as EpfSection;

describe('assignParams', () => {
  const choices = { a: { newName: 'A', options: [] }, b: { newName: 'B', options: [] } };
  it('lists only sections with choices and a picked employer', () => {
    expect(assignParams([section('a', 'e1'), section('b', null), section('c', 'e3')], choices)).toEqual(['a=e1']);
  });
  it('swaps in the override, and drops a section set back to new', () => {
    const sections = [section('a', 'e1'), section('b', null)];
    expect(assignParams(sections, choices, { key: 'b', value: 'e2' })).toEqual(['a=e1', 'b=e2']);
    expect(assignParams(sections, choices, { key: 'a', value: 'new' })).toEqual([]);
  });
});

describe('importableTotal', () => {
  it('sums new and replaced rows over the sections', () => {
    expect(importableTotal([section('a', null), section('b', null)])).toBe(6);
  });
});

describe('batch result wording', () => {
  const r = (over: Partial<EpfBatchResult> = {}): EpfBatchResult => ({
    results: [{ employerId: 'e1', employerName: 'N', imported: 2, replaced: 1, skipped: 0, balance: 843210, throughMonth: '2026-09-01' }],
    imported: 2,
    replaced: 1,
    skipped: 0,
    balance: 843210,
    refused: [],
    ...over,
  });
  it('keeps the single-employer wording', () => {
    expect(resultTitle(r())).toBe('Imported 3 entries');
    expect(resultLine(r())).toBe('2 new and 1 replaced. EPF balance is now ₹8,43,210, up to September 2026.');
  });
  it('names the employers when there are several and uses the latest month', () => {
    const two = r({
      results: [
        { employerId: 'e1', employerName: 'N', imported: 1, replaced: 0, skipped: 0, balance: 1, throughMonth: '2026-03-01' },
        { employerId: 'e2', employerName: 'M', imported: 1, replaced: 1, skipped: 0, balance: 1, throughMonth: '2026-09-01' },
      ],
    });
    expect(resultLine(two)).toBe('2 new and 1 replaced across 2 employers. EPF balance is now ₹8,43,210, up to September 2026.');
  });
});

describe('epfRow shares', () => {
  const base: EpfPreviewRow = {
    index: 0,
    type: 'CONTRIBUTION',
    withdrawalKind: null,
    wageMonth: '2026-04-01',
    creditedOn: '2026-05-15',
    interestFy: null,
    employeeAmount: 7200,
    employerAmount: 5950,
    pensionAmount: 1250,
    particulars: 'Cont. For Due-Month 052026',
    status: 'NEW',
    replacesEntryId: null,
  };

  it('splits a contribution into your share, employer and pension, with the shares as the total', () => {
    expect(epfRow(base)).toMatchObject({ employee: '+₹7,200', employer: '+₹5,950', pension: '₹1,250', amount: '₹13,150' });
  });

  it('draws a withdrawal as minus on both shares and no pension', () => {
    const row = epfRow({ ...base, type: 'WITHDRAWAL', withdrawalKind: 'PARTIAL', wageMonth: null, employeeAmount: 10000, employerAmount: 8000, pensionAmount: 0 });
    expect(row).toMatchObject({ employee: '−₹10,000', employer: '−₹8,000', pension: '—' });
  });

  it('draws a pension withdrawal in the pension column only, and its total is the pension', () => {
    const row = epfRow({ ...base, type: 'WITHDRAWAL', withdrawalKind: 'PENSION', wageMonth: null, employeeAmount: 0, employerAmount: 0, pensionAmount: 40000 });
    expect(row).toMatchObject({ employee: '—', employer: '—', pension: '₹40,000' });
    expect(row.amount).toContain('40,000');
  });

  it('shows an opening balance without a sign', () => {
    const row = epfRow({ ...base, type: 'OPENING_BALANCE', wageMonth: null, employeeAmount: 410920, employerAmount: 297210, pensionAmount: 0 });
    expect(row).toMatchObject({ employee: '₹4,10,920', employer: '₹2,97,210', pension: '—' });
  });
});

describe('opening balance mismatch wording', () => {
  const ob: EpfPreviewRow = {
    index: 0,
    type: 'OPENING_BALANCE',
    withdrawalKind: null,
    wageMonth: null,
    creditedOn: '2026-04-01',
    interestFy: null,
    employeeAmount: 400000,
    employerAmount: 300000,
    pensionAmount: 0,
    particulars: 'OB',
    status: 'NEW',
    replacesEntryId: null,
  };
  const mismatched = { ...ob, computedEmployeeAmount: 390000, computedEmployerAmount: 290000 };
  const prev = (rows: EpfPreviewRow[], matchedOpeningCount = 0) =>
    ({ newCount: 2, replacesCount: 0, existsCount: 0, matchedOpeningCount, rows }) as unknown as EpfPreview;

  it('epfRow names both figures for a mismatched opening balance only', () => {
    expect(epfRow(mismatched).mismatch).toBe('Your entries come to ₹6,80,000, EPFO says ₹7,00,000');
    expect(epfRow(ob).mismatch).toBe('');
    expect(epfRow({ ...ob, computedEmployeeAmount: null, computedEmployerAmount: null }).mismatch).toBe('');
    expect(epfRow({ ...mismatched, type: 'CONTRIBUTION', wageMonth: '2026-04-01' }).mismatch).toBe('');
  });

  it('countsLine adds the matched sentence only when some were left out', () => {
    expect(countsLine(prev([]))).toBe('2 entries in this passbook: 2 new.');
    expect(countsLine(prev([], 1))).toBe('2 entries in this passbook: 2 new. 1 opening balance matches your entries, so it is not imported.');
    expect(countsLine(prev([], 3))).toBe('2 entries in this passbook: 2 new. 3 opening balances match your entries, so they are not imported.');
  });

  it('mismatchLine counts only opening balances that carry computed figures', () => {
    expect(mismatchLine(prev([ob]))).toBe('');
    expect(mismatchLine(prev([mismatched, ob]))).toBe("1 opening balance does not match your entries. Importing keeps EPFO's figure as a correction.");
    expect(mismatchLine(prev([mismatched, { ...mismatched, index: 1 }]))).toBe("2 opening balances do not match your entries. Importing keeps EPFO's figures as corrections.");
  });
});
