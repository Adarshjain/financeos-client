import { describe, expect, it } from 'vitest';

import {
  addNpsFiles,
  alreadyImported,
  commitBody,
  firstRows,
  importable,
  importableCount,
  incompleteLine,
  needsPick,
  type NpsImportFile,
  type NpsImportResult,
  type NpsPreview,
  type NpsStatement,
  previewRow,
  readyToImport,
  resultLine,
  resultTitle,
  reviewLines,
  shortScheme,
  statementRowSub,
  totalsOf,
  upToLine,
} from './npsImportModel';

const result = (patch: Partial<NpsImportResult> = {}): NpsImportResult => ({
  periodStart: '2026-04-01',
  periodEnd: '2026-10-31',
  added: 22,
  upgraded: 3,
  skipped: 21,
  adjustments: [],
  unmapped: [],
  unitsMismatch: false,
  incomplete: false,
  warnings: [],
  ...patch,
});

const preview = (patch: Partial<NpsPreview> = {}): NpsPreview => ({
  previewId: 'p1',
  passwordNeeded: false,
  statement: { pranMasked: '110022334821', periodStart: '2026-04-01', periodEnd: '2026-10-31' },
  account: { id: 'a1', relation: 'SELF', pranLast4: '4821' },
  result: result(),
  rows: [],
  ...patch,
});

const file = (p: NpsPreview | null, patch: Partial<NpsImportFile> = {}): NpsImportFile => ({ id: 'f1', file: new File(['x'], 'a.pdf'), password: '', preview: p, error: null, picks: {}, ...patch });

const newAccount = (sector: 'CORPORATE' | null = null): NpsPreview =>
  preview({ account: { id: null, proposal: { holderName: 'Ravi', pranMasked: '110022334821', cra: 'PROTEAN', sector, relation: 'SELF' } } });

describe('reviewLines', () => {
  it('lists the account, new, confirmed, skipped and a matching units check', () => {
    const lines = reviewLines(preview());
    expect(lines.map((l) => l.label)).toEqual(['Account', 'New entries', 'Email entries confirmed', 'Already here', 'Units']);
    expect(lines[0].value).toBe('Mine ••4821 (matched by PRAN)');
    expect(lines[2].value).toBe('3 · exact units replace estimates');
    expect(lines[4]).toEqual({ label: 'Units', value: 'Match the statement' });
  });

  it('leaves out the confirmed line when nothing was upgraded and names a new account', () => {
    const lines = reviewLines(newAccount());
    expect(lines.find((l) => l.label === 'Email entries confirmed')).toBeDefined();
    const none = reviewLines(preview({ account: { id: null }, result: result({ upgraded: 0 }) }));
    expect(none[0].value).toBe('New account from this statement');
    expect(none.find((l) => l.label === 'Email entries confirmed')).toBeUndefined();
  });

  it('warns about units that are off and schemes that are not in the catalog', () => {
    const lines = reviewLines(preview({ result: result({ unitsMismatch: true, adjustments: [{ schemeCode: 'SM001001', schemeName: 'HDFC Pension Fund Scheme C - Tier I', units: -0.0412 }], unmapped: ['Odd Fund'] }) }));
    expect(lines.find((l) => l.label === 'Units')).toEqual({ label: 'Units', value: 'Scheme C is 0.0412 units off', tone: 'warning' });
    expect(lines.find((l) => l.label === 'Not in the catalog')?.tone).toBe('warning');
  });
});

describe('account line and short scheme', () => {
  it("names a child's account by its holder", () => {
    expect(reviewLines(preview({ account: { id: 'a2', relation: 'CHILD', holderName: 'Anu', pranLast4: '1234' } }))[0].value).toBe("Anu's ••1234");
  });
  it('shortens a scheme name to its Scheme letter', () => {
    expect(shortScheme('HDFC Pension Fund Scheme E - Tier II')).toBe('Scheme E');
    expect(shortScheme('Odd Fund')).toBe('Odd Fund');
    expect(shortScheme(null)).toBe('');
  });
  it('shows the tier in a review row', () => {
    expect(previewRow({ date: '2026-10-01', type: 'CONTRIBUTION', schemeName: 's', tier: 'II', action: 'ADD' }, 0).tier).toBe('II');
  });
});

describe('incompleteLine and alreadyImported', () => {
  it('says the next statement corrects an incomplete one', () => {
    expect(incompleteLine(preview({ result: result({ incomplete: true }) }))).toBe('Protean sent this month without figures; the next statement corrects it.');
    expect(incompleteLine(preview())).toBeNull();
  });

  it('is already imported only when nothing is added or upgraded and something is skipped', () => {
    expect(alreadyImported(preview({ result: result({ added: 0, upgraded: 0, skipped: 5 }) }))).toBe(true);
    expect(alreadyImported(preview())).toBe(false);
    expect(alreadyImported(preview({ result: result({ added: 0, upgraded: 0, skipped: 0 }) }))).toBe(false);
  });
});

describe('what can be imported', () => {
  it('counts added and upgraded entries of read files only', () => {
    const files = [file(preview()), file(preview({ result: result({ added: 0, upgraded: 0 }) })), file(preview({ passwordNeeded: true, previewId: null, result: undefined }))];
    expect(importable(files[0])).toBe(true);
    expect(importable(files[1])).toBe(false);
    expect(importable(files[2])).toBe(false);
    expect(importableCount(files)).toBe(25);
  });

  it('skips a file already committed, so a retry sends only the rest', () => {
    const done = file(preview(), { committed: result() });
    expect(importable(done)).toBe(false);
    expect(importableCount([done, file(preview())])).toBe(25);
    expect(readyToImport([done])).toBe(false);
  });

  it('needs a sector for a new account before it can import', () => {
    const f = file(newAccount());
    expect(needsPick(f)).toBe(true);
    expect(readyToImport([f])).toBe(false);
    const picked = file(newAccount(), { picks: { sector: 'GOVT' } });
    expect(needsPick(picked)).toBe(false);
    expect(readyToImport([picked])).toBe(true);
    expect(needsPick(file(newAccount('CORPORATE')))).toBe(false);
  });
});

describe('commitBody', () => {
  it('sends only the preview for a matched account', () => {
    expect(commitBody(file(preview()))).toEqual({ previewId: 'p1' });
  });

  it('builds the new account from the proposal and the picks', () => {
    expect(commitBody(file(newAccount(), { picks: { sector: 'GOVT', relation: 'CHILD' } }))).toEqual({
      previewId: 'p1',
      newAccount: { holderName: 'Ravi', relation: 'CHILD', sector: 'GOVT', cra: 'PROTEAN' },
    });
    expect(commitBody(file(newAccount('CORPORATE'))).newAccount).toMatchObject({ relation: 'SELF', sector: 'CORPORATE' });
  });
});

describe('commitBody for a PRAN created earlier in the batch', () => {
  it('adds to the account the first file created', () => {
    expect(commitBody(file(newAccount('CORPORATE')), { '110022334821': 'new-id' })).toEqual({ previewId: 'p1', accountId: 'new-id' });
    expect(commitBody(file(newAccount('CORPORATE')), { '999': 'other' }).newAccount).toBeDefined();
  });
});

describe('firstRows', () => {
  it('lists the first four rows the import touches', () => {
    const row = (action: 'ADD' | 'SKIP' | 'UPGRADE', i: number) => ({ date: `2026-10-0${i + 1}`, type: 'CONTRIBUTION' as const, schemeName: 's', tier: 'I' as const, action });
    const p = preview({ rows: [row('SKIP', 0), row('ADD', 1), row('ADD', 2), row('UPGRADE', 3), row('ADD', 4), row('ADD', 5), row('ADD', 6)] });
    expect(firstRows(p)).toMatchObject({ total: 6 });
    expect(firstRows(p).shown).toHaveLength(4);
  });
});

describe('addNpsFiles', () => {
  it('skips a repeat of name and size', () => {
    const a = new File(['abc'], 'a.pdf');
    const first = addNpsFiles([], [a]);
    expect(addNpsFiles(first.files, [new File(['abc'], 'a.pdf')]).files).toHaveLength(1);
    expect(addNpsFiles(first.files, [new File(['abcd'], 'a.pdf')]).files).toHaveLength(2);
  });

  it('stops at twelve files and says so', () => {
    const many = Array.from({ length: 13 }, (_, i) => new File(['x'.repeat(i + 1)], `f${i}.pdf`));
    const out = addNpsFiles([], many);
    expect(out.files).toHaveLength(12);
    expect(out.error).toContain('up to 12 statements');
  });
});

describe('result words', () => {
  it('totals the statements and words them', () => {
    const t = totalsOf([result(), result({ added: 1, upgraded: 0, skipped: 0 })]);
    expect(t).toEqual({ statements: 2, added: 23, upgraded: 3, skipped: 21 });
    expect(resultTitle(t)).toBe('23 entries added');
    expect(resultLine(t)).toBe('From 2 statements · 3 email entries confirmed with exact units · 21 already here');
    expect(resultTitle({ statements: 1, added: 1, upgraded: 0, skipped: 0 })).toBe('1 entry added');
  });
});

describe('statements', () => {
  const s = (periodEnd: string): NpsStatement => ({ id: periodEnd, accountId: 'a', tier: 'I', periodStart: '2026-04-01', periodEnd, source: 'UPLOAD', importedAt: '2026-11-05T10:00:00Z', incomplete: false, unitsMismatch: false, warningCount: 0, warnings: [] });

  it('words the latest statement end', () => {
    expect(upToLine('2026-10-31')).toBe('Up to 31 Oct 26');
  });

  it('says where a statement came from and what is off about it', () => {
    expect(statementRowSub({ ...s('2026-10-31'), source: 'GMAIL', incomplete: true })).toBe('From Gmail 5 Nov 26 · Without figures');
  });
});
