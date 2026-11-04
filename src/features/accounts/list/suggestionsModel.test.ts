import { describe, expect, it } from 'vitest';

import type { ScanState, SuggestionItem } from '@/features/accounts/list/suggestionsModel';
import type { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

import {
  accountsBodyMode,
  foundBandLabel,
  foundRowSub,
  fromEmailsLine,
  isScanProgressShown,
  maybeBandLabel,
  mergeSuggestions,
  olderBandLabel,
  olderBandSection,
  scanEtaText,
  scanningEmptyCopy,
  scanProgressLine,
  scanProgressValue,
  splitSuggestions,
  suggestionRow,
  suggestionSecondLine,
  suggestionTitle,
} from './suggestionsModel';

const item = (over: Partial<SuggestionItem> = {}): SuggestionItem => ({
  id: 's1',
  kind: 'CREDIT_CARD',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4321',
  variant: null,
  variantConf: null,
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});

const scan = (over: Partial<ScanState> = {}): ScanState => ({
  status: 'RUNNING',
  firstScanDone: false,
  mailsSeen: 0,
  mailsTotal: 0,
  gmailConnected: true,
  ...over,
});

describe('suggestionTitle', () => {
  it('names a bank account after its bank', () => {
    expect(suggestionTitle(item({ kind: 'BANK_ACCOUNT' }))).toBe('HDFC Bank account');
  });

  it('puts the bank before a catalogue variant of high or medium confidence', () => {
    expect(suggestionTitle(item({ variant: 'Regalia', variantConf: 'HIGH' }))).toBe('HDFC Bank Regalia');
    expect(suggestionTitle(item({ variant: 'Regalia', variantConf: 'MEDIUM' }))).toBe('HDFC Bank Regalia');
  });

  it('does not repeat a bank the variant already names', () => {
    expect(suggestionTitle(item({ variant: 'HDFC Bank Regalia', variantConf: 'HIGH' }))).toBe('HDFC Bank Regalia');
  });

  it('falls back to the bank card for a low or missing variant', () => {
    expect(suggestionTitle(item({ variant: 'Regalia', variantConf: 'LOW' }))).toBe('HDFC Bank card');
    expect(suggestionTitle(item())).toBe('HDFC Bank card');
  });

  it('uses fixed titles for the other card kinds', () => {
    expect(suggestionTitle(item({ kind: 'DEBIT_CARD' }))).toBe('Debit card');
    expect(suggestionTitle(item({ kind: 'ADDON_CARD' }))).toBe('Add-on card');
    expect(suggestionTitle(item({ kind: 'REPLACEMENT_CARD' }))).toBe('Replacement card');
  });
});

describe('suggestionSecondLine', () => {
  it('is the caption alone without a parent', () => {
    expect(suggestionSecondLine(item({ caption: 'Seen in 6 emails' }))).toBe('Seen in 6 emails');
  });

  it('puts the parent account first, with its last four', () => {
    const parent = { id: 'a1', name: 'HDFC Savings', last4: '1111' };
    expect(suggestionSecondLine(item({ parentAccount: parent, caption: 'Seen in 2 emails' }))).toBe('On HDFC Savings ••1111 · Seen in 2 emails');
  });

  it('leaves out the number a parent does not have and an empty caption', () => {
    expect(suggestionSecondLine(item({ parentAccount: { id: 'a1', name: 'Wallet', last4: null }, caption: ' ' }))).toBe('On Wallet');
  });

  it('asks whether it is the candidate account', () => {
    expect(suggestionSecondLine(item({ candidateAccount: { id: 'a2', name: 'Axis Magnus' }, caption: 'x' }))).toBe('Is this your Axis Magnus?');
  });
});

describe('splitSuggestions', () => {
  const accounts = [{ id: 'a1' }, { id: 'a2' }] as Account[];
  const items = [
    item({ id: 'f1', kind: 'BANK_ACCOUNT' }),
    item({ id: 'f2', kind: 'CREDIT_CARD' }),
    item({ id: 'o1', kind: 'CREDIT_CARD', band: 'OLDER' }),
    item({ id: 'm1', kind: 'DEBIT_CARD', band: 'MAYBE', parentAccount: { id: 'a1', name: 'HDFC Savings' } }),
    item({ id: 'm2', kind: 'ADDON_CARD', band: 'MAYBE', parentAccount: { id: 'a2', name: 'Axis Magnus' } }),
    item({ id: 'r1', kind: 'REPLACEMENT_CARD', band: 'FOUND' }),
  ];
  const split = splitSuggestions(items, accounts);
  const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

  it('puts bank accounts and debit cards in Bank accounts', () => {
    expect(ids(split.bank.bands.found)).toEqual(['f1']);
    expect(ids(split.bank.bands.maybe)).toEqual(['m1']);
  });

  it('puts credit, add-on and replacement cards in Credit cards, grouped by band', () => {
    expect(ids(split.card.bands.found)).toEqual(['f2', 'r1']);
    expect(ids(split.card.bands.older)).toEqual(['o1']);
    expect(ids(split.card.bands.maybe)).toEqual(['m2']);
  });

  it('hands each section the parent accounts to edit', () => {
    expect(split.bank.parents.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('does not make rows of children', () => {
    const withChild = splitSuggestions([item({ children: [{ id: 'c1', kind: 'ADDON_CARD', band: 'FOUND', last4: '0082', evidenceMails: 9 }] })], []);
    expect(withChild.card.bands.found.map((r) => r.id)).toEqual(['s1']);
  });

  it('carries the title, number and bank to the row', () => {
    expect(suggestionRow(item({ kind: 'BANK_ACCOUNT' }))).toMatchObject({ name: 'HDFC Bank account', last4: '4321', bankId: 'hdfc', closed: false });
  });
});

describe('band labels', () => {
  it('names the collapsed bands per section', () => {
    expect(olderBandLabel('card', 2)).toBe('Older cards · 2');
    expect(olderBandLabel('bank', 1)).toBe('Older accounts · 1');
    expect(maybeBandLabel(3)).toBe('Maybe yours · 3');
  });
});

describe('Found in your email card', () => {
  it('titles the card with the Found count', () => {
    expect(foundBandLabel(2)).toBe('Found in your email · 2');
    expect(foundBandLabel(0)).toBe('Found in your email');
  });

  it('says which bank emails a suggestion came from', () => {
    expect(fromEmailsLine(suggestionRow(item()))).toBe('From your HDFC Bank emails');
    expect(fromEmailsLine({ item: undefined })).toBe('From your emails');
  });

  it('gives a row where it came from and its number', () => {
    expect(foundRowSub(suggestionRow(item()))).toBe('From your HDFC Bank emails · ••4321');
    expect(foundRowSub(suggestionRow(item({ last4: '' })))).toBe('From your HDFC Bank emails');
  });

  it('names the account a card sits on', () => {
    const debit = item({ kind: 'DEBIT_CARD', last4: '9911', parentAccount: { id: 'b1', name: 'HDFC Savings', last4: '1123' } });
    expect(foundRowSub(suggestionRow(debit))).toBe('From your HDFC Bank emails · On HDFC Savings · ••9911');
  });

  it("puts the server's question after the number we found, so the user can tell which account is meant", () => {
    const isThis = item({ candidateAccount: { id: 'c2', name: 'Axis Magnus' } as SuggestionItem['candidateAccount'] });
    expect(foundRowSub(suggestionRow(isThis))).toBe('From your HDFC Bank emails · ••4321. Is this your Axis Magnus?');
    const older = item({ band: 'OLDER', parentAccount: { id: 'c1', name: 'HDFC Regalia', last4: '1111' } });
    expect(foundRowSub(suggestionRow(older))).toBe('From your HDFC Bank emails · ••4321. Older number on HDFC Regalia?');
  });

  it('uses the email count and date for a question row with no number', () => {
    const isThis = item({
      last4: '',
      caption: '12 emails since Mar 2024',
      candidateAccount: { id: 'c2', name: 'Axis Magnus' } as SuggestionItem['candidateAccount'],
    });
    expect(foundRowSub(suggestionRow(isThis))).toBe('From your HDFC Bank emails · 12 emails since Mar 2024. Is this your Axis Magnus?');
  });

  it('merges bank and card suggestions band by band, bank rows first, with every account to file under', () => {
    const bankAcc = { id: 'b1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT } as Account;
    const cardAcc = { id: 'c1', name: 'HDFC Regalia', type: AccountType.CREDIT_CARD } as Account;
    const b = suggestionRow(item({ id: 'b', kind: 'BANK_ACCOUNT' }));
    const c = suggestionRow(item({ id: 'c' }));
    const o = suggestionRow(item({ id: 'o', band: 'OLDER' }));
    const merged = mergeSuggestions({
      bank: { bands: { found: [b], older: [], maybe: [] }, parents: [bankAcc], accounts: [bankAcc] },
      card: { bands: { found: [c], older: [o], maybe: [] }, parents: [bankAcc], accounts: [cardAcc] },
    });
    expect(merged.bands.found.map((r) => r.id)).toEqual(['b', 'c']);
    expect(merged.bands.older.map((r) => r.id)).toEqual(['o']);
    expect(merged.parents).toEqual([bankAcc]);
    expect(merged.accounts).toEqual([bankAcc, cardAcc]);
  });

  it('words the Older band for accounts when a bank account is among them, else for cards', () => {
    expect(olderBandSection([{ kind: 'CREDIT_CARD' }, { kind: 'BANK_ACCOUNT' }])).toBe('bank');
    expect(olderBandSection([{ kind: 'CREDIT_CARD' }, { kind: 'DEBIT_CARD' }])).toBe('card');
  });
});

describe('scan progress', () => {
  it('shows only while a connected Gmail first scan is running or idle', () => {
    expect(isScanProgressShown(scan())).toBe(true);
    expect(isScanProgressShown(scan({ status: 'IDLE' }))).toBe(true);
    expect(isScanProgressShown(scan({ status: 'PAUSED_AUTH' }))).toBe(false);
    expect(isScanProgressShown(scan({ status: 'FAILED' }))).toBe(false);
    expect(isScanProgressShown(scan({ status: 'NOT_STARTED' }))).toBe(false);
    expect(isScanProgressShown(scan({ firstScanDone: true }))).toBe(false);
    expect(isScanProgressShown(scan({ gmailConnected: false }))).toBe(false);
    expect(isScanProgressShown(null)).toBe(false);
  });

  it('estimates minutes left from the unread mails, at least one', () => {
    expect(scanEtaText(4020, 10600)).toBe('About 6 minutes left.');
    expect(scanEtaText(10590, 10600)).toBe('About 1 minute left.');
    expect(scanEtaText(10600, 10600)).toBe('About 1 minute left.');
  });

  it('reads the counts with grouping', () => {
    expect(scanProgressLine({ mailsSeen: 4020, mailsTotal: 10600 })).toBe('Read 4,020 of 10,600 emails. About 6 minutes left.');
  });

  it('says it is reading while the total is unknown, with an indeterminate bar', () => {
    expect(scanProgressLine({ mailsSeen: 0, mailsTotal: 0 })).toBe('Reading your emails.');
    expect(scanProgressValue({ mailsSeen: 0, mailsTotal: 0 })).toBeUndefined();
    expect(scanProgressValue({ mailsSeen: 5, mailsTotal: 10 })).toBe(50);
  });
});

describe('page body', () => {
  it('keeps the whole-page empty state with no accounts, no scan and nothing found', () => {
    expect(accountsBodyMode({ accountCount: 0, progressShown: false, suggestionCount: 0 })).toBe('empty');
  });

  it('shows the sections alone with no accounts while scanning or with suggestions', () => {
    expect(accountsBodyMode({ accountCount: 0, progressShown: true, suggestionCount: 0 })).toBe('sections');
    expect(accountsBodyMode({ accountCount: 0, progressShown: false, suggestionCount: 2 })).toBe('sections');
  });

  it('shows the tiles and sections once there are accounts', () => {
    expect(accountsBodyMode({ accountCount: 1, progressShown: false, suggestionCount: 0 })).toBe('full');
  });

  it('changes the empty copy only while the progress card shows', () => {
    expect(scanningEmptyCopy('bank', true)).toBe('Accounts we find in your email show up at the top of this page.');
    expect(scanningEmptyCopy('card', true)).toBe('Cards we find in your email show up at the top of this page.');
    expect(scanningEmptyCopy('broker', true)).toBe("Add a broker with +. We don't look for these.");
    expect(scanningEmptyCopy('bank', false)).toBeUndefined();
  });
});
