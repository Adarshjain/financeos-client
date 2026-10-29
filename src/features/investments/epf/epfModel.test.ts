import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { bankCredit, employer, entry, interest, latestContribution, manualContribution, opening, pensionWithdrawal, settled, summary, transferIn, transferOut, transferred, withdrawal } from './epf.fixtures';
import {
  addMonths,
  creditLine,
  effectiveEmployer,
  effectiveFy,
  employerRow,
  emptyForm,
  entryToForm,
  epfFigures,
  epfRow,
  epfUrl,
  fieldsOf,
  formFromLatestContribution,
  formToRequest,
  fyOptions,
  missingMonths,
  parseEpfUrl,
  passbookSubtitle,
  pensionCard,
  receivedAmount,
  receivedCaption,
} from './epfModel';

pinClock();

const today = '2026-10-27';

describe('url state', () => {
  it('reads the FY, employer, page and size, and ignores nonsense', () => {
    expect(parseEpfUrl({ fy: '2025', employer: 'e2', page: '3', size: '50' })).toEqual({ fy: 2025, employer: 'e2', page: 2, size: 50 });
    expect(parseEpfUrl({ fy: 'all' }).fy).toBe('all');
    expect(parseEpfUrl({ fy: 'x', page: '-3', size: '7' })).toEqual({ fy: null, employer: '', page: 0, size: 25 });
  });

  it('keeps the defaults out of the address', () => {
    expect(epfUrl(parseEpfUrl({}))).toBe('/investments/epf');
    expect(epfUrl({ fy: 2025, employer: 'all', page: 1, size: 50 })).toBe('/investments/epf?fy=2025&employer=all&page=2&size=50');
  });

  it('picks the employer: the one chosen, the only one, the current one, or all', () => {
    const list = [transferred(), employer()];
    expect(effectiveEmployer(parseEpfUrl({ employer: 'e2' }), list)?.id).toBe('e2');
    expect(effectiveEmployer(parseEpfUrl({}), list)?.id).toBe('e1');
    expect(effectiveEmployer(parseEpfUrl({ employer: 'all' }), list)).toBeUndefined();
    expect(effectiveEmployer(parseEpfUrl({}), [transferred()])?.id).toBe('e2');
    expect(effectiveEmployer(parseEpfUrl({}), [transferred(), settled()])).toBeUndefined();
  });

  it('picks the FY: the one chosen, the newest with entries, or every year', () => {
    expect(effectiveFy(parseEpfUrl({ fy: '2024' }), [2026, 2025])).toBe(2024);
    expect(effectiveFy(parseEpfUrl({}), [2026, 2025])).toBe(2026);
    expect(effectiveFy(parseEpfUrl({ fy: 'all' }), [2026])).toBeUndefined();
    expect(effectiveFy(parseEpfUrl({}), [])).toBeUndefined();
  });

  it('lists the FYs with every year last, adding one the list lacks', () => {
    expect(fyOptions([2026, 2025], 2026)).toEqual([
      { value: '2026', label: 'FY 2026-27' },
      { value: '2025', label: 'FY 2025-26' },
      { value: 'all', label: 'All years' },
    ]);
    expect(fyOptions([2026], 2024).map((o) => o.value)).toEqual(['2026', '2024', 'all']);
  });
});

describe('dates', () => {
  it('adds months and keeps the day inside short months', () => {
    expect(addMonths('2026-09-01', 1)).toBe('2026-10-01');
    expect(addMonths('2026-10-15', 1)).toBe('2026-11-15');
    expect(addMonths('2026-12-31', 2)).toBe('2027-02-28');
    expect(addMonths('2026-01-15', -2)).toBe('2025-11-15');
  });

  it('names the months a stale passbook misses, up to last month', () => {
    expect(missingMonths('2026-07-01', today)).toBe('Aug and Sep');
    expect(missingMonths('2026-06-01', today)).toBe('Jul, Aug and Sep');
    expect(missingMonths('2026-04-01', today)).toBe('May to Sep');
    expect(missingMonths('2026-09-01', today)).toBe('');
  });
});

describe('figures', () => {
  it('reads the four figures with the estimate and the last interest captions', () => {
    const f = epfFigures(summary());
    expect(f.balance).toMatchObject({ value: '₹8,43,210', context: 'Passbook up to September 2026', phoneContext: 'Up to September 2026' });
    expect(f.contributed).toMatchObject({ value: '₹78,900', context: 'You ₹43,200 · employer ₹35,700', phoneContext: 'You ₹43,200' });
    expect(f.interest).toEqual({ value: '≈ ₹32,880', context: 'Estimate at 8.25% · credited after 31 Mar' });
    expect(f.lastInterest).toMatchObject({ value: '₹56,180', context: 'FY 2025-26 at 8.25% · 18 Aug', phoneContext: 'FY 2025-26' });
  });

  it('shows ₹0 and "No balance yet" with no balance, and dashes with nothing credited', () => {
    const none = epfFigures(summary({ balance: 0, interestEstimate: undefined, lastInterest: undefined, throughMonth: null }));
    expect(none.interest).toEqual({ value: '₹0', context: 'No balance yet' });
    expect(none.lastInterest.value).toBe('—');
    expect(none.balance.context).toBe('');
    expect(epfFigures(summary({ interestEstimate: undefined })).interest.value).toBe('—');
  });

  it('words the pension card for eligible and not-yet-eligible service', () => {
    const p = summary().pension!;
    expect(pensionCard(p)).toMatchObject({ value: '₹1,714', service: 'Service counted: 8 years 4 months · pension needs 10 years' });
    expect(pensionCard(p).note).toContain('₹1,250 a month');
    expect(pensionCard({ ...p, serviceMonths: 132, eligible: true }).service).toBe('Service counted: 11 years');
    expect(pensionCard({ ...p, serviceMonths: 5, eligible: true }).service).toBe('Service counted: 5 months');
  });
});

describe('passbook rows', () => {
  it('draws a contribution on one line, with the month split on phone: no "contribution" word and no credited date', () => {
    const r = epfRow(entry());
    expect(r).toMatchObject({
      wageMonth: 'September 2026',
      title: 'Passbook',
      employee: '+₹7,200',
      employer: '+₹5,950',
      pension: '₹1,250',
      balance: '₹8,43,210',
      phoneTitle: 'September 2026',
      phoneSub: 'You ₹7,200 · Northwind Labs ₹5,950',
      split: { you: '₹7,200', employerName: 'Northwind Labs', employer: '₹5,950' },
      amount: '+₹13,150',
      amountSub: '₹8,43,210',
    });
    expect(r).not.toHaveProperty('credited');
    expect(epfRow(manualContribution())).toMatchObject({ title: 'Added by you', phoneSub: 'You ₹7,200 · Northwind Labs ₹5,950' });
    expect(epfRow(entry({ pensionAmount: 0 }))).toMatchObject({ pension: '—', phoneSub: 'You ₹7,200 · Northwind Labs ₹5,950' });
    expect(epfRow(entry({ wageMonth: null }))).toMatchObject({ wageMonth: '—', phoneTitle: 'Passbook' });
  });

  it('draws interest with its year and rate and no wage month or pension', () => {
    expect(epfRow(interest())).toMatchObject({
      wageMonth: '—',
      title: 'Interest · FY 2025-26 · 8.25%',
      phoneTitle: 'Interest · FY 2025-26',
      phoneSub: 'Passbook · 8.25%',
      employee: '+₹32,410',
      pension: '—',
      amount: '+₹56,180',
    });
    expect(epfRow({ ...interest(), interestRate: null })).toMatchObject({ title: 'Interest · FY 2025-26', phoneSub: 'Passbook' });
  });

  it('draws an opening balance unsigned, with no as-of date', () => {
    expect(epfRow(opening())).toMatchObject({ title: 'Opening balance', employee: '₹4,10,920', employer: '₹2,97,210', phoneSub: 'Passbook' });
  });

  it('draws a transfer between employers that leaves the total unchanged, with no date', () => {
    expect(epfRow(transferIn())).toMatchObject({
      title: 'Transfer in · Contoso Systems → Northwind Labs',
      phoneTitle: 'Contoso Systems → Northwind Labs',
      phoneSub: 'Transfer in',
      amount: '+₹3,12,400',
      amountSub: 'Total unchanged',
    });
    expect(epfRow(transferOut())).toMatchObject({ title: 'Transfer out · Contoso Systems → Northwind Labs', employee: '−₹1,71,300', amount: '−₹3,12,400' });
  });

  it('draws a withdrawal lowering the balance, and a pension withdrawal in the pension column', () => {
    expect(epfRow(withdrawal())).toMatchObject({
      title: 'Medical advance (Form 31)',
      employee: '−₹25,000',
      employer: '−₹15,000',
      amount: '−₹40,000',
      phoneSub: 'Withdrawal · You ₹25,000 · employer ₹15,000',
    });
    expect(epfRow(pensionWithdrawal())).toMatchObject({ title: 'Pension withdrawal (Form 10C)', employee: '—', pension: '₹28,400', amount: '−₹28,400', phoneSub: 'Withdrawal' });
  });
});

describe('employers', () => {
  it('words each status', () => {
    expect(employerRow(employer())).toMatchObject({ line: 'Member ID …67890 · since September 2023', balance: '₹8,43,210', status: 'Current' });
    expect(employerRow(transferred())).toMatchObject({ line: 'June 2018 – August 2023 · ₹3,12,400 moved to Northwind Labs on 11 Oct 2023', balance: '₹0', status: 'Transferred' });
    expect(employerRow(settled())).toMatchObject({ line: 'April 2016 – May 2018 · final settlement and pension withdrawn 12 Sep 2018', status: 'Settled' });
    expect(employerRow(settled({ pensionWithdrawn: false })).line).toBe('April 2016 – May 2018 · final settlement 12 Sep 2018');
    expect(employerRow(employer({ status: 'LEFT', leftOn: '2024-01-31', statusDate: null })).line).toBe('September 2023 – January 2024 · left');
  });

  it('writes the passbook subtitle from the employer, member ID and UAN', () => {
    expect(passbookSubtitle(employer(), '4321', 3)).toBe('Northwind Labs · member ID …67890 · UAN …4321');
    expect(passbookSubtitle(undefined, '4321', 3)).toBe('All employers · UAN …4321');
    expect(passbookSubtitle(undefined, null, 0)).toBe('');
  });
});

describe('the entry form', () => {
  it('shows the fields of each type and kind', () => {
    expect(fieldsOf({ type: 'CONTRIBUTION', kind: 'PARTIAL' })).toMatchObject({ wageMonth: true, pensionShare: true, tds: false, dateLabel: 'Credited on' });
    expect(fieldsOf({ type: 'OPENING_BALANCE', kind: 'PARTIAL' })).toMatchObject({ wageMonth: false, dateLabel: 'Balance as of' });
    expect(fieldsOf({ type: 'INTEREST', kind: 'PARTIAL' }).interestFy).toBe(true);
    expect(fieldsOf({ type: 'TRANSFER_IN', kind: 'PARTIAL' })).toMatchObject({ from: true, employerLabel: 'To employer' });
    expect(fieldsOf({ type: 'WITHDRAWAL', kind: 'PARTIAL' })).toMatchObject({ kind: true, note: true, tds: true, shares: true, dateLabel: 'Paid on' });
    expect(fieldsOf({ type: 'WITHDRAWAL', kind: 'FINAL_SETTLEMENT' }).note).toBe(false);
    expect(fieldsOf({ type: 'WITHDRAWAL', kind: 'PENSION' })).toMatchObject({ amount: true, shares: false, note: false });
  });

  it('fills a new contribution from the last one: next wage month, a month later, same amounts', () => {
    const base = emptyForm('e1', today);
    expect(base).toMatchObject({ type: 'CONTRIBUTION', creditedOn: today, wageMonth: '2026-10-01' });
    expect(formFromLatestContribution(latestContribution(), 'e1')).toEqual({
      employerId: 'e1',
      wageMonth: '2026-10-01',
      creditedOn: '2026-11-15',
      employee: '7200',
      employer: '5950',
      pension: '1250',
    });
  });

  it('builds the request of each type', () => {
    const base = emptyForm('e1', today);
    expect(formToRequest({ ...base, creditedOn: '2026-11-15', wageMonth: '2026-10-01', employee: '7200', employer: '5950', pension: '1250' })).toEqual({
      body: { type: 'CONTRIBUTION', employerId: 'e1', creditedOn: '2026-11-15', wageMonth: '2026-10-01', employeeAmount: 7200, employerAmount: 5950, pensionAmount: 1250 },
    });
    expect(formToRequest({ ...base, type: 'OPENING_BALANCE', creditedOn: '2026-04-01', employee: '410920', employer: '297210' })).toEqual({
      body: { type: 'OPENING_BALANCE', employerId: 'e1', creditedOn: '2026-04-01', employeeAmount: 410920, employerAmount: 297210 },
    });
    expect(formToRequest({ ...base, type: 'INTEREST', interestFy: '2025', employee: '32,410', employer: '23770' })).toEqual({
      body: { type: 'INTEREST', employerId: 'e1', creditedOn: today, interestFy: 2025, employeeAmount: 32410, employerAmount: 23770 },
    });
    expect(formToRequest({ ...base, type: 'TRANSFER_IN', fromEmployerId: 'e2', employee: '171300', employer: '141100' })).toEqual({
      body: { type: 'TRANSFER_IN', employerId: 'e1', creditedOn: today, fromEmployerId: 'e2', employeeAmount: 171300, employerAmount: 141100 },
    });
  });

  it('builds a withdrawal with its kind, note and TDS; a pension withdrawal sends the amount as the pension', () => {
    const w = { ...emptyForm('e1', today), type: 'WITHDRAWAL' as const, employee: '25000', employer: '15000', note: ' Medical advance ', tdsOn: true, tds: '2000' };
    expect(formToRequest(w)).toEqual({
      body: { type: 'WITHDRAWAL', withdrawalKind: 'PARTIAL', employerId: 'e1', creditedOn: today, employeeAmount: 25000, employerAmount: 15000, note: 'Medical advance', tdsAmount: 2000 },
    });
    expect(formToRequest({ ...w, tdsOn: false, kind: 'FINAL_SETTLEMENT' })).toEqual({
      body: { type: 'WITHDRAWAL', withdrawalKind: 'FINAL_SETTLEMENT', employerId: 'e1', creditedOn: today, employeeAmount: 25000, employerAmount: 15000 },
    });
    expect(formToRequest({ ...w, kind: 'PENSION', amount: '28400', tdsOn: false })).toEqual({
      body: { type: 'WITHDRAWAL', withdrawalKind: 'PENSION', employerId: 'e1', creditedOn: today, pensionAmount: 28400 },
    });
  });

  it('says what to fix first', () => {
    const base = emptyForm('e1', today);
    expect(formToRequest({ ...base, employerId: '' })).toEqual({ error: 'Choose an employer.' });
    expect(formToRequest({ ...base, creditedOn: '' })).toEqual({ error: 'Enter the credited on date.' });
    expect(formToRequest({ ...base })).toEqual({ error: 'Enter your share or the employer share.' });
    expect(formToRequest({ ...base, type: 'TRANSFER_IN', employee: '1' })).toEqual({ error: 'Choose the employer it came from.' });
    expect(formToRequest({ ...base, type: 'WITHDRAWAL', kind: 'PENSION' })).toEqual({ error: 'Enter an amount above zero.' });
    expect(formToRequest({ ...base, type: 'WITHDRAWAL', employee: '1', tdsOn: true })).toEqual({ error: 'Enter the TDS amount.' });
  });

  it('reads an entry back into the form', () => {
    expect(entryToForm(withdrawal({ tdsAmount: 2000 }))).toMatchObject({ type: 'WITHDRAWAL', kind: 'PARTIAL', employee: '25000', tdsOn: true, tds: '2000', note: 'Medical advance' });
    expect(entryToForm(pensionWithdrawal())).toMatchObject({ kind: 'PENSION', amount: '28400', pension: '' });
    expect(entryToForm(entry())).toMatchObject({ type: 'CONTRIBUTION', wageMonth: '2026-09-01', pension: '1250', tdsOn: false });
  });

  it('computes what lands in the bank and the caption under the TDS', () => {
    const w = { ...emptyForm('e1', today), type: 'WITHDRAWAL' as const, employee: '25000', employer: '15000' };
    expect(receivedAmount(w)).toBe(40000);
    expect(receivedAmount({ ...w, tdsOn: true, tds: '2000' })).toBe(38000);
    expect(receivedCaption(w, 'Northwind Labs')).toBe('Received in bank: ₹40,000. After you add it, a matching bank credit is suggested.');
    expect(receivedCaption({ ...w, kind: 'FINAL_SETTLEMENT' }, 'Globex Retail')).toBe("Received in bank: ₹40,000. Shares are filled with Globex Retail's full balance; adding it marks the employer Settled.");
    expect(receivedCaption({ ...w, kind: 'PENSION' }, '')).toBe("Pension is not in your EPF balance, so the balance doesn't change.");
  });

  it('words a bank credit line', () => {
    expect(creditLine(bankCredit())).toBe('HDFC Bank ••4521 · 24 Feb 2025');
  });
});
