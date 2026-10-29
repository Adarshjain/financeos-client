import { fyStartYear } from '@/features/loans/detail/financialYearModel';
import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { DS_PREFIX } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import type { components } from '@/lib/api/schema';
import { formatDate, formatMoney, formatPercent, fyLabel } from '@/lib/format';


type Schemas = components['schemas'];
export type EpfSummary = Schemas['EpfSummaryResponse'];
export type EpfEmployer = Schemas['EpfEmployerResponse'];
export type EpfEntry = Schemas['EpfEntryResponse'];
export type EpfEntryRequest = Schemas['EpfEntryRequest'];
export type EpfEntryType = NonNullable<EpfEntryRequest['type']>;
export type EpfWithdrawalKind = NonNullable<EpfEntryRequest['withdrawalKind']>;
export type EpfLinkedTransaction = Schemas['EpfLinkedTransaction'];
export type EpfLatestContribution = Schemas['EpfLatestContribution'];

// ---- URL state ---------------------------------------------------------------

export const EPF_HREF = `${DS_PREFIX}/investments/epf`;
export const EPF_SIZE_OPTIONS = [25, 50, 100];
/** The Import page with the EPF passbook type chosen. */
export const EPF_IMPORT_TYPE = 'epf';

export interface EpfUrlState {
  /** The FY's starting year; 'all' = every year; null = the newest FY with entries. */
  fy: number | 'all' | null;
  /** An employer id; 'all' = every employer; '' = the default (the current employer). */
  employer: string;
  page: number;
  size: number;
}

export const DEFAULT_EPF_URL: EpfUrlState = { fy: null, employer: '', page: 0, size: DEFAULT_PAGE_SIZE };

export function parseEpfUrl(params: SearchParamsRecord): EpfUrlState {
  const year = Number(first(params.fy));
  return {
    fy: first(params.fy) === 'all' ? 'all' : /^\d{4}$/.test(first(params.fy) ?? '') && year > 1900 ? year : null,
    employer: (first(params.employer) ?? '').trim(),
    ...parsePage(params, { size: DEFAULT_PAGE_SIZE, sizes: EPF_SIZE_OPTIONS }),
  };
}

/** The EPF tab URL for a state: defaults stay out of the query string. */
export function epfUrl(state: EpfUrlState): string {
  const query = new URLSearchParams();
  if (state.fy !== null) query.set('fy', String(state.fy));
  if (state.employer) query.set('employer', state.employer);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${EPF_HREF}?${text}` : EPF_HREF;
}

/** The employer the passbook shows: the one chosen, else the current one (or the only one); undefined = every employer. */
export function effectiveEmployer(state: EpfUrlState, employers: EpfEmployer[]): EpfEmployer | undefined {
  if (state.employer === 'all') return undefined;
  const chosen = employers.find((e) => e.id === state.employer);
  if (chosen) return chosen;
  if (employers.length === 1) return employers[0];
  return employers.find((e) => e.status === 'CURRENT');
}

/** The FY the passbook shows: the one in the address, else the newest with entries; undefined = every year. */
export function effectiveFy(state: EpfUrlState, fys: number[]): number | undefined {
  if (state.fy === 'all') return undefined;
  return state.fy ?? fys[0];
}

// ---- Dates and words ---------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "FY 26-27" from the year it starts in. */
export const epfFyLabel = fyLabel;

/** The date `months` calendar months later, the day kept (or the month's last day). */
export function addMonths(iso: string, months: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + months;
  const year = y + Math.floor(m / 12);
  const month = ((m % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(Number(iso.slice(8, 10)) || 1, last);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "Aug and Sep" / "Aug, Sep and Oct" / "Aug to Nov": the wage months a stale passbook is missing. */
export function missingMonths(staleThrough: string, today: string): string {
  const months: string[] = [];
  const last = addMonths(`${today.slice(0, 8)}01`, -1);
  for (let m = addMonths(`${staleThrough.slice(0, 8)}01`, 1); m <= last; m = addMonths(m, 1)) {
    months.push(MONTHS[Number(m.slice(5, 7)) - 1]);
  }
  if (months.length === 0) return '';
  if (months.length === 1) return months[0];
  if (months.length > 3) return `${months[0]} to ${months[months.length - 1]}`;
  return `${months.slice(0, -1).join(', ')} and ${months[months.length - 1]}`;
}

export const KIND_LABEL: Record<EpfWithdrawalKind, string> = {
  PARTIAL: 'Partial (Form 31)',
  FINAL_SETTLEMENT: 'Final settlement (Form 19)',
  PENSION: 'Pension (Form 10C)',
};

const KIND_NAME: Record<EpfWithdrawalKind, string> = {
  PARTIAL: 'Partial withdrawal',
  FINAL_SETTLEMENT: 'Final settlement',
  PENSION: 'Pension withdrawal',
};

const FORM_OF: Record<EpfWithdrawalKind, string> = { PARTIAL: 'Form 31', FINAL_SETTLEMENT: 'Form 19', PENSION: 'Form 10C' };

export const TYPE_LABEL: Record<EpfEntryType, string> = {
  CONTRIBUTION: 'Contribution',
  OPENING_BALANCE: 'Opening balance',
  INTEREST: 'Interest',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out',
  WITHDRAWAL: 'Withdrawal',
};

/** The types a new entry can be (a transfer out only exists as the counterpart of a transfer in). */
export const TYPE_OPTIONS = (['CONTRIBUTION', 'OPENING_BALANCE', 'INTEREST', 'TRANSFER_IN', 'WITHDRAWAL'] as const).map((value) => ({
  value,
  label: TYPE_LABEL[value],
}));

export const KIND_OPTIONS = (['PARTIAL', 'FINAL_SETTLEMENT', 'PENSION'] as const).map((value) => ({ value, label: KIND_LABEL[value] }));

// ---- Figures -------------------------------------------------------------------

export interface EpfFigures {
  balance: { value: string; context: string; phoneContext: string };
  contributed: { value: string; context: string; phoneContext: string };
  interest: { value: string; context: string };
  lastInterest: { value: string; context: string; phoneContext: string };
}

/** The four figures: balance, contributed this FY, interest so far (an estimate until credited) and the last interest credited. */
export function epfFigures(summary: EpfSummary): EpfFigures {
  const passbookThrough = summary.throughMonth ?? null;
  const { interestEstimate: est, lastInterest: last } = summary;
  const upTo = passbookThrough ? `Passbook up to ${formatDate(passbookThrough, 'month')}` : '';
  const interest = est
    ? { value: `≈ ${formatMoney(est.amount)}`, context: `Estimate at ${rateText(est.rate)} · credited after 31 Mar` }
    : summary.balance <= 0
      ? { value: '₹0', context: '' }
      : { value: '—', context: '' };
  return {
    balance: { value: formatMoney(summary.balance), context: upTo, phoneContext: upTo.replace('Passbook up', 'Up') },
    contributed: {
      value: formatMoney(summary.fyEmployee + summary.fyEmployer),
      context: `You ${formatMoney(summary.fyEmployee)} · employer ${formatMoney(summary.fyEmployer)}`,
      phoneContext: `You ${formatMoney(summary.fyEmployee)}`,
    },
    interest,
    lastInterest: last
      ? {
          value: formatMoney(last.amount),
          context: `${epfFyLabel(last.fy)}${last.rate != null ? ` at ${rateText(last.rate)}` : ''} · ${formatDate(last.creditedOn, 'list')}`,
          phoneContext: epfFyLabel(last.fy),
        }
      : { value: '—', context: '', phoneContext: '' },
  };
}

function rateText(rate: number): string {
  return formatPercent(rate, { decimals: 2 });
}

/** The pension card's lines. */
export function pensionCard(pension: NonNullable<EpfSummary['pension']>) {
  const years = Math.floor(pension.serviceMonths / 12);
  const months = pension.serviceMonths % 12;
  const part = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const service = [years > 0 ? part(years, 'year') : '', months > 0 || years === 0 ? part(months, 'month') : ''].filter(Boolean).join(' ');
  return {
    value: formatMoney(pension.estimatedMonthlyPension),
    note: `Estimated from your service so far. Your employer pays ${formatMoney(pension.monthlyContribution)} a month into the pension fund; it is not in your EPF balance or your net worth.`,
    service: `Service counted: ${service}${pension.eligible ? '' : ' · pension needs 10 years'}`,
  };
}

// ---- Passbook rows ---------------------------------------------------------------

export interface EpfRow {
  id: string;
  wageMonth: string;
  /** Desktop particulars, one line. */
  title: string;
  /** Phone title and line. */
  phoneTitle: string;
  phoneSub: string;
  /** A contribution's phone line in parts, so a long employer name truncates and the amounts stay: "You ₹7,200 · Acme Labs ₹5,950". */
  split?: { you: string; employerName: string; employer: string };
  employee: string;
  employer: string;
  pension: string;
  balance: string;
  /** Phone amount: what the entry moved, signed. */
  amount: string;
  /** The second phone line under the amount: the balance, or "Total unchanged" on a transfer. */
  amountSub: string;
  amountTone?: 'positive';
}

const PLUS = (n: number) => `+${formatMoney(n)}`;

function sharesOf(e: EpfEntry): number {
  return e.type === 'WITHDRAWAL' && e.withdrawalKind === 'PENSION' ? e.pensionAmount : e.employeeAmount + e.employerAmount;
}

export function epfRow(e: EpfEntry): EpfRow {
  const source = e.source === 'PASSBOOK' ? 'Passbook' : 'Added by you';
  const dash = '—';
  const money = (n: number, sign: '+' | '−' | '') => (sign === '' ? formatMoney(n) : sign === '+' ? PLUS(n) : `−${formatMoney(n)}`);
  const base = {
    id: e.id,
    wageMonth: formatDate(e.wageMonth, 'month') || dash,
    balance: formatMoney(e.runningBalance),
    amountSub: formatMoney(e.runningBalance),
    pension: dash,
  };
  switch (e.type) {
    case 'CONTRIBUTION': {
      const pension = e.pensionAmount > 0 ? formatMoney(e.pensionAmount) : dash;
      return {
        ...base,
        title: source,
        phoneTitle: formatDate(e.wageMonth, 'month') || source,
        // The month's split on phone, on one line beside the balance; pension is not in the amount, so it stays on desktop and in the entry.
        phoneSub: `You ${formatMoney(e.employeeAmount)} · ${e.employerName} ${formatMoney(e.employerAmount)}`,
        split: { you: formatMoney(e.employeeAmount), employerName: e.employerName, employer: formatMoney(e.employerAmount) },
        employee: money(e.employeeAmount, '+'),
        employer: money(e.employerAmount, '+'),
        pension,
        amount: PLUS(sharesOf(e)),
        amountTone: 'positive',
      };
    }
    case 'INTEREST': {
      const title = e.interestFy != null ? `Interest · ${epfFyLabel(e.interestFy)}` : 'Interest';
      const rate = e.interestRate != null ? ` · ${rateText(e.interestRate)}` : '';
      return {
        ...base,
        title: `${title}${rate}`,
        phoneTitle: title,
        phoneSub: `${source}${rate}`,
        employee: money(e.employeeAmount, '+'),
        employer: money(e.employerAmount, '+'),
        amount: PLUS(sharesOf(e)),
        amountTone: 'positive',
      };
    }
    case 'OPENING_BALANCE':
      return {
        ...base,
        title: 'Opening balance',
        phoneTitle: 'Opening balance',
        phoneSub: source,
        employee: money(e.employeeAmount, ''),
        employer: money(e.employerAmount, ''),
        amount: formatMoney(sharesOf(e)),
      };
    case 'TRANSFER_IN':
    case 'TRANSFER_OUT': {
      const out = e.type === 'TRANSFER_OUT';
      const other = e.counterpartEmployerName ?? '';
      const title = other ? (out ? `${e.employerName} → ${other}` : `${other} → ${e.employerName}`) : e.employerName;
      return {
        ...base,
        title: `${TYPE_LABEL[e.type]} · ${title}`,
        phoneTitle: title,
        phoneSub: TYPE_LABEL[e.type],
        employee: money(e.employeeAmount, out ? '−' : '+'),
        employer: money(e.employerAmount, out ? '−' : '+'),
        amount: out ? money(sharesOf(e), '−') : PLUS(sharesOf(e)),
        amountSub: 'Total unchanged',
      };
    }
    case 'WITHDRAWAL': {
      const kind = e.withdrawalKind ?? 'PARTIAL';
      const title = `${e.note || KIND_NAME[kind]} (${FORM_OF[kind]})`;
      const pensionKind = kind === 'PENSION';
      return {
        ...base,
        title,
        phoneTitle: title,
        phoneSub: pensionKind ? 'Withdrawal' : `Withdrawal · You ${formatMoney(e.employeeAmount)} · employer ${formatMoney(e.employerAmount)}`,
        employee: pensionKind ? dash : money(e.employeeAmount, '−'),
        employer: pensionKind ? dash : money(e.employerAmount, '−'),
        pension: pensionKind ? formatMoney(e.pensionAmount) : dash,
        amount: money(sharesOf(e), '−'),
      };
    }
  }
}

// ---- Employers ---------------------------------------------------------------------

export const STATUS_LABEL: Record<EpfEmployer['status'], string> = {
  CURRENT: 'Current',
  LEFT: 'Left',
  TRANSFERRED: 'Transferred',
  SETTLED: 'Settled',
};

/** "…67890": the last five characters of a member ID. */
export function memberTail(memberId: string | null | undefined): string {
  return memberId ? `…${memberId.slice(-5)}` : '';
}

export interface EpfEmployerRow {
  id: string;
  name: string;
  line: string;
  balance: string;
  status: string;
}

export function employerRow(e: EpfEmployer): EpfEmployerRow {
  const range = `${formatDate(e.joinedOn, 'month')}${e.leftOn ? ` – ${formatDate(e.leftOn, 'month')}` : ''}`.trim();
  const when = e.statusDate ? formatDate(e.statusDate, 'full') : '';
  let line: string;
  if (e.status === 'CURRENT') {
    line = [e.memberId ? `Member ID ${memberTail(e.memberId)}` : '', e.joinedOn ? `since ${formatDate(e.joinedOn, 'month')}` : ''].filter(Boolean).join(' · ');
  } else if (e.status === 'TRANSFERRED') {
    const amount = e.transferredOutAmount != null ? `${formatMoney(e.transferredOutAmount)} ` : '';
    const to = e.transferredToEmployerName ? e.transferredToEmployerName : 'another employer';
    line = [range, `${amount}moved to ${to}${when ? ` on ${when}` : ''}`].filter(Boolean).join(' · ');
  } else if (e.status === 'SETTLED') {
    const what = e.pensionWithdrawn ? 'final settlement and pension withdrawn' : 'final settlement';
    line = [range, `${what}${when ? ` ${when}` : ''}`].filter(Boolean).join(' · ');
  } else {
    line = [range, 'left'].filter(Boolean).join(' · ');
  }
  return { id: e.id, name: e.name, line, balance: formatMoney(e.balance), status: STATUS_LABEL[e.status] };
}

/** The passbook card's subtitle: the employer, its member ID and the UAN. */
export function passbookSubtitle(employer: EpfEmployer | undefined, uanLast4: string | null | undefined, count: number): string {
  const parts = [
    employer ? employer.name : count > 1 ? 'All employers' : '',
    employer?.memberId ? `member ID ${memberTail(employer.memberId)}` : '',
    uanLast4 ? `UAN …${uanLast4}` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}

// ---- Entry form --------------------------------------------------------------------

export interface EpfFormState {
  type: EpfEntryType;
  kind: EpfWithdrawalKind;
  employerId: string;
  fromEmployerId: string;
  wageMonth: string;
  creditedOn: string;
  interestFy: string;
  employee: string;
  employer: string;
  pension: string;
  amount: string;
  note: string;
  tdsOn: boolean;
  tds: string;
}

export function emptyForm(employerId: string, today: string): EpfFormState {
  return {
    type: 'CONTRIBUTION',
    kind: 'PARTIAL',
    employerId,
    fromEmployerId: '',
    wageMonth: `${today.slice(0, 8)}01`,
    creditedOn: today,
    interestFy: String(fyStartYear(today) - 1),
    employee: '',
    employer: '',
    pension: '',
    amount: '',
    note: '',
    tdsOn: false,
    tds: '',
  };
}

const text = (n: number | null | undefined) => (n == null || n === 0 ? '' : String(n));

/** A new contribution starts from the last one: the next wage month, a month later credit date and the same amounts. */
export function formFromLatestContribution(latest: EpfLatestContribution, employerId: string): Partial<EpfFormState> {
  return {
    employerId,
    wageMonth: latest.wageMonth ? addMonths(latest.wageMonth, 1) : undefined,
    creditedOn: addMonths(latest.creditedOn, 1),
    employee: text(latest.employeeAmount),
    employer: text(latest.employerAmount),
    pension: text(latest.pensionAmount),
  };
}

export function entryToForm(e: EpfEntry): EpfFormState {
  return {
    type: e.type,
    kind: e.withdrawalKind ?? 'PARTIAL',
    employerId: e.employerId,
    fromEmployerId: e.counterpartEmployerId ?? '',
    wageMonth: e.wageMonth ?? '',
    creditedOn: e.creditedOn,
    interestFy: e.interestFy != null ? String(e.interestFy) : '',
    employee: text(e.employeeAmount),
    employer: text(e.employerAmount),
    pension: e.type === 'WITHDRAWAL' && e.withdrawalKind === 'PENSION' ? '' : text(e.pensionAmount),
    amount: e.type === 'WITHDRAWAL' && e.withdrawalKind === 'PENSION' ? text(e.pensionAmount) : '',
    note: e.note ?? '',
    tdsOn: (e.tdsAmount ?? 0) > 0,
    tds: text(e.tdsAmount),
  };
}

const num = (value: string): number | undefined => {
  const n = Number(value.replace(/,/g, ''));
  return value.trim() === '' || !Number.isFinite(n) ? undefined : Math.round(n * 100) / 100;
};

/** Which fields a type (and a withdrawal kind) shows. */
export function fieldsOf(form: Pick<EpfFormState, 'type' | 'kind'>) {
  const { type, kind } = form;
  const withdrawal = type === 'WITHDRAWAL';
  const pensionKind = withdrawal && kind === 'PENSION';
  return {
    kind: withdrawal,
    wageMonth: type === 'CONTRIBUTION',
    interestFy: type === 'INTEREST',
    from: type === 'TRANSFER_IN' || type === 'TRANSFER_OUT',
    shares: !pensionKind,
    pensionShare: type === 'CONTRIBUTION',
    amount: pensionKind,
    note: withdrawal && kind === 'PARTIAL',
    tds: withdrawal,
    employerLabel: type === 'TRANSFER_IN' ? 'To employer' : type === 'TRANSFER_OUT' ? 'From employer' : 'Employer',
    dateLabel: type === 'OPENING_BALANCE' ? 'Balance as of' : withdrawal ? 'Paid on' : 'Credited on',
  };
}

/** What lands in the bank: the shares less the TDS. */
export function receivedAmount(form: EpfFormState): number {
  const shares = (num(form.employee) ?? 0) + (num(form.employer) ?? 0);
  return shares - (form.tdsOn ? (num(form.tds) ?? 0) : 0);
}

export function receivedCaption(form: EpfFormState, employerName: string): string {
  if (form.kind === 'PENSION') return "Pension is not in your EPF balance, so the balance doesn't change.";
  const received = `Received in bank: ${formatMoney(receivedAmount(form))}.`;
  return form.kind === 'FINAL_SETTLEMENT'
    ? `${received} Shares are filled with ${employerName || 'the employer'}'s full balance; adding it marks the employer Settled.`
    : `${received} After you add it, a matching bank credit is suggested.`;
}

/** The request for a form, or the first thing to fix. */
export function formToRequest(form: EpfFormState): { body: EpfEntryRequest } | { error: string } {
  const f = fieldsOf(form);
  if (!form.employerId) return { error: 'Choose an employer.' };
  if (!form.creditedOn) return { error: `Enter the ${f.dateLabel.toLowerCase()} date.` };
  if (f.wageMonth && !form.wageMonth) return { error: 'Choose the wage month.' };
  if (f.interestFy && !form.interestFy) return { error: 'Choose the year.' };
  if (form.type === 'TRANSFER_IN' && !form.fromEmployerId) return { error: 'Choose the employer it came from.' };
  const body: EpfEntryRequest = { type: form.type, employerId: form.employerId, creditedOn: form.creditedOn };
  if (f.shares) {
    const employee = num(form.employee);
    const employer = num(form.employer);
    if (employee === undefined && employer === undefined) return { error: 'Enter your share or the employer share.' };
    body.employeeAmount = employee ?? 0;
    body.employerAmount = employer ?? 0;
  }
  if (f.amount) {
    const amount = num(form.amount);
    if (amount === undefined || amount <= 0) return { error: 'Enter an amount above zero.' };
    body.pensionAmount = amount;
  }
  if (f.wageMonth) body.wageMonth = form.wageMonth;
  if (f.pensionShare) body.pensionAmount = num(form.pension) ?? 0;
  if (f.interestFy) body.interestFy = Number(form.interestFy);
  if (form.type === 'TRANSFER_IN') body.fromEmployerId = form.fromEmployerId;
  if (f.kind) body.withdrawalKind = form.kind;
  if (f.note && form.note.trim()) body.note = form.note.trim();
  if (f.tds && form.tdsOn) {
    const tds = num(form.tds);
    if (tds === undefined || tds <= 0) return { error: 'Enter the TDS amount.' };
    body.tdsAmount = tds;
  }
  return { body };
}

/** The title of an opened entry. */
export function entryTitle(e: EpfEntry): string {
  switch (e.type) {
    case 'CONTRIBUTION':
      return `${formatDate(e.wageMonth, 'month')} contribution`.trim();
    case 'INTEREST':
      return e.interestFy != null ? `Interest · ${epfFyLabel(e.interestFy)}` : 'Interest';
    case 'WITHDRAWAL':
      return e.note || KIND_NAME[e.withdrawalKind ?? 'PARTIAL'];
    default:
      return TYPE_LABEL[e.type];
  }
}

/** "NEFT CR EPFO MUMBAI" row line: "HDFC Bank ••4521 · 24 Feb 2025". */
export function creditLine(t: EpfLinkedTransaction): string {
  return [t.accountName, formatDate(t.date, 'full')].filter(Boolean).join(' · ');
}

/** FY choices: the years the server lists, the one in use, and every year. */
export function fyOptions(fys: number[], selected: number | undefined): { value: string; label: string }[] {
  const years = selected !== undefined && !fys.includes(selected) ? [selected, ...fys].sort((a, b) => b - a) : fys;
  return [...years.map((y) => ({ value: String(y), label: epfFyLabel(y) })), { value: 'all', label: 'All years' }];
}

/** The wage months a contribution can be for: this month back thirty years, newest first. */
export function wageMonthOptions(today: string, current: string): { value: string; label: string }[] {
  const start = `${today.slice(0, 8)}01`;
  const out: { value: string; label: string }[] = [];
  for (let i = -1; i < 360; i += 1) {
    const value = addMonths(start, -i);
    out.push({ value, label: formatDate(value, 'month') });
  }
  if (current && !out.some((o) => o.value === current)) out.push({ value: current, label: formatDate(current, 'month') });
  return out;
}

/** The FYs an interest entry can be for: the current one back thirty years. */
export function interestFyOptions(today: string, current: string): { value: string; label: string }[] {
  const start = fyStartYear(today);
  const out = Array.from({ length: 30 }, (_, i) => ({ value: String(start - i), label: epfFyLabel(start - i) }));
  if (current && !out.some((o) => o.value === current)) out.push({ value: current, label: epfFyLabel(Number(current)) });
  return out;
}
