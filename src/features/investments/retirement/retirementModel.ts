import { formatDate, formatMoney } from '@/lib/format';

import { EPF_HREF, EPF_IMPORT_TYPE, type EpfEmployer, type EpfSummary } from '../epf/epfModel';
import { INVESTMENTS_IMPORT_HREF } from '../investmentsTabs';
import { NPS_UPLOAD_HREF } from '../nps/npsImportModel';
import { DEFAULT_NPS_URL, monthYear, type NpsAccount, type NpsHolding, type NpsSummary, npsUrl } from '../nps/npsModel';

export type RetirementStatusTone = 'warning' | 'danger';

export interface RetirementRow {
  id: string;
  kind: 'epf' | 'nps';
  name: string;
  /** "UAN ••4821", "PRAN ••7731"; empty when the data has no tail. */
  idLabel: string;
  /** The line under the name: the employer, the tiers, "For Aarav". */
  sub: string;
  /** The screen the row opens. */
  href: string;
  value: number;
  /** The formatted value; the page draws it inside Conceal. */
  valueText: string;
  /** Passbook month (EPF) or NAV date (NPS), ready to show. */
  updated: string;
  status: { label: string; tone: RetirementStatusTone } | null;
  /** Counted in net worth: the EPF balance and the account holder's own NPS (a child's Vatsalya account is not). */
  inNetWorth: boolean;
}

export interface RetirementModel {
  rows: RetirementRow[];
  /** The sum of every row's value. */
  total: number;
  /** Nothing EPF to show: the row becomes an upload line. */
  epfMissing: boolean;
  npsMissing: boolean;
}

/** The EPF row: one UAN, its balance and passbook month. Null when no passbook or balance has been added. */
export function epfRetirementRow(summary: EpfSummary, employers: EpfEmployer[]): RetirementRow | null {
  if (!summary.hasData) return null;
  const current = employers.find((e) => e.status === 'CURRENT');
  const earlier = employers.filter((e) => e.status !== 'CURRENT').length;
  const sub = [current?.name ?? '', earlier > 0 ? `${earlier} earlier employer${earlier === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
  return {
    id: 'epf',
    kind: 'epf',
    name: 'EPF',
    idLabel: summary.uanLast4 ? `UAN ••${summary.uanLast4}` : '',
    sub,
    href: EPF_HREF,
    value: summary.balance,
    valueText: formatMoney(summary.balance),
    updated: monthYear(summary.throughMonth),
    status: summary.staleThrough ? { label: 'Update passbook', tone: 'warning' } : null,
    inNetWorth: true,
  };
}

function accountValue(account: NpsAccount): number {
  return account.tiers.reduce((sum, t) => sum + t.value, 0);
}

/** The newest NAV date among the account's holdings. */
function accountNavDate(account: NpsAccount, holdings: NpsHolding[]): string | null {
  const dates = holdings.filter((h) => h.accountId === account.id && h.navDate).map((h) => h.navDate as string);
  return dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;
}

/** One NPS row per PRAN: a child's Vatsalya account is its own row ("For <holder>"). */
export function npsRetirementRows(summary: NpsSummary): RetirementRow[] {
  return summary.accounts.map((a) => {
    const value = accountValue(a);
    const tiers = a.tiers.map((t) => t.tier);
    const tierText = tiers.length ? `Tier ${tiers.join(' + ')}` : '';
    const navDate = accountNavDate(a, summary.holdings);
    return {
      id: `nps-${a.id}`,
      kind: 'nps',
      name: a.relation === 'CHILD' && a.sector === 'VATSALYA' ? 'NPS Vatsalya' : 'NPS',
      idLabel: `PRAN ••${a.pranMasked.slice(-4)}`,
      sub: a.relation === 'CHILD' ? `For ${a.holderName}` : tierText,
      href: npsUrl({ ...DEFAULT_NPS_URL, account: a.id }),
      value,
      valueText: formatMoney(value),
      updated: navDate ? formatDate(navDate, 'input') : '',
      status: a.tier1Status === 'FROZEN' ? { label: 'Frozen', tone: 'danger' } : null,
      inNetWorth: a.relation === 'SELF',
    };
  });
}

export function retirementModel(epf: EpfSummary, employers: EpfEmployer[], nps: NpsSummary): RetirementModel {
  const epfRow = epfRetirementRow(epf, employers);
  const npsRows = npsRetirementRows(nps);
  const rows = [...(epfRow ? [epfRow] : []), ...npsRows];
  return { rows, total: rows.reduce((sum, r) => sum + r.value, 0), epfMissing: !epfRow, npsMissing: npsRows.length === 0 };
}

/** What net worth counts of retirement: EPF plus the holder's own NPS, the same set the server sums. */
export function retirementNetWorthTotal(model: RetirementModel): number {
  // The server floors EPF and the holder's NPS each at zero (NetWorthDatasource), so a negative ledger never lowers net worth.
  const sumOf = (rows: RetirementRow[]) => Math.max(0, rows.reduce((sum, r) => sum + r.value, 0));
  const counted = model.rows.filter((r) => r.inNetWorth);
  return sumOf(counted.filter((r) => r.kind === 'epf')) + sumOf(counted.filter((r) => r.kind !== 'epf'));
}

export const EPF_UPLOAD_HREF = `${INVESTMENTS_IMPORT_HREF}?type=${EPF_IMPORT_TYPE}`;

/** One line of the overview table: an account, or the upload line of an EPF / NPS that has nothing yet. */
export interface RetirementTableRow {
  id: string;
  name: string;
  idLabel: string;
  sub: string;
  href: string;
  valueText: string;
  updated: string;
  status: RetirementRow['status'];
  /** Set on a line with nothing to show yet: the link that adds it. */
  upload: { label: string; href: string } | null;
}

/** EPF first, then every NPS account; EPF or NPS with nothing added is an upload line in its place. */
export function retirementTableRows(model: RetirementModel): RetirementTableRow[] {
  const real = (r: RetirementRow): RetirementTableRow => ({ ...r, upload: null });
  const epf = model.rows.filter((r) => r.kind === 'epf').map(real);
  const nps = model.rows.filter((r) => r.kind === 'nps').map(real);
  return [
    ...(model.epfMissing
      ? [{ id: 'epf-missing', name: 'EPF', idLabel: '', sub: 'Upload your EPFO passbook to see your balance here', href: '', valueText: '', updated: '', status: null, upload: { label: 'Upload passbook', href: EPF_UPLOAD_HREF } }]
      : epf),
    ...(model.npsMissing
      ? [{ id: 'nps-missing', name: 'NPS', idLabel: '', sub: 'Upload an NPS statement. New ones in Gmail come in on their own', href: '', valueText: '', updated: '', status: null, upload: { label: 'Upload statement', href: NPS_UPLOAD_HREF } }]
      : nps),
  ];
}
