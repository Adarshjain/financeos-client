import { formatCount, formatMoney } from '@/lib/format';
import type { SmsAccountLines, SmsLast60Days, SmsLine, SmsMessage, SmsReport, SmsReportAccount } from '@/lib/sms.types';

/** A line with fewer messages than this goes into the "Seen once or twice" group. */
export const RARE_LINE_BELOW = 3;

const pad = (n: number) => String(n).padStart(2, '0');
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** yyyy-mm-dd of a plain date or of an instant read in IST; '' when empty or unreadable. */
export function ymdOf(value: string | null | undefined): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** dd/mm/yyyy of a plain date or an instant (IST); '' when empty. */
export function dmy(value: string | null | undefined): string {
  const ymd = ymdOf(value);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

/** The day after a yyyy-mm-dd date. */
export function dayAfter(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

const endingText = (line: Pick<SmsLine, 'ending'>) => (line.ending ? `••${line.ending}` : '');

/** "HSBCIN ••123, ••4567": each sender once, then its endings. Several senders are joined with " · ". */
export function sendersText(lines: readonly SmsLine[]): string {
  const bySender = new Map<string, string[]>();
  for (const line of lines) {
    const endings = bySender.get(line.sender) ?? [];
    if (line.ending) endings.push(endingText(line));
    bySender.set(line.sender, endings);
  }
  return [...bySender.entries()].map(([sender, endings]) => [sender, endings.join(', ')].filter(Boolean).join(' ')).join(' · ');
}

const messageWord = (n: number) => formatCount(n, ['message', 'messages']);

/** "12 messages, last on 13/10/2026" over all the lines. */
export function messagesText(lines: readonly SmsLine[]): string {
  const total = lines.reduce((sum, l) => sum + l.msgCount, 0);
  const last = lines.map((l) => ymdOf(l.lastMsgAt)).filter(Boolean).sort().pop();
  return last ? `${messageWord(total)}, last on ${dmy(last)}` : messageWord(total);
}

/** How the account is fed today, in plain words, from the last 60 days. */
export function feedText(last: SmsLast60Days): string {
  const { statement, emailAlert, manual } = last;
  if (statement > 0 && emailAlert > 0) return 'Statements and email alerts in the last 60 days';
  if (statement > 0) return 'Statements in the last 60 days';
  if (emailAlert > 0) return 'Email alerts in the last 60 days';
  if (manual > 0) return 'Entered by hand';
  return 'Nothing else feeds this account';
}

/** True when neither a statement nor an email alert reached the account in the last 60 days. */
export function hasNoOtherFeed(last: SmsLast60Days): boolean {
  return last.statement === 0 && last.emailAlert === 0;
}

/** Accounts with no statement and no email alert in the last 60 days first; each group keeps the server's order. */
export function sortAccounts(accounts: readonly SmsAccountLines[]): SmsAccountLines[] {
  const unfed = accounts.filter((a) => hasNoOtherFeed(a.last60Days));
  const fed = accounts.filter((a) => !hasNoOtherFeed(a.last60Days));
  return [...unfed, ...fed];
}

/** The switch shows on when any line of the account is on, so its on lines can always be turned off. */
export function accountIsOn(account: Pick<SmsAccountLines, 'lines'>): boolean {
  return account.lines.some((l) => l.state === 'ON');
}

/** "2 numbers not synced": what an account that is on says about its lines that are not. Empty when all are on. */
export function notSyncedText(account: Pick<SmsAccountLines, 'lines'>): string {
  const n = account.lines.filter((l) => l.state !== 'ON').length;
  return n === 0 ? '' : `${formatCount(n, ['number', 'numbers'])} not synced`;
}

/** The lines a switch-on has to turn on. */
export function linesToTurnOn(account: Pick<SmsAccountLines, 'lines'>): SmsLine[] {
  return account.lines.filter((l) => l.state !== 'ON');
}

/** "Sync from" default: the day after the last transaction, else the day of the first message of the lines being turned on. */
export function defaultSyncFrom(account: Pick<SmsAccountLines, 'lastTransactionDate' | 'lines'>): string {
  const last = ymdOf(account.lastTransactionDate);
  if (last) return dayAfter(last);
  const lines = linesToTurnOn(account);
  const firsts = (lines.length > 0 ? lines : account.lines).map((l) => ymdOf(l.firstMsgAt)).filter(Boolean).sort();
  return firsts[0] ?? '';
}

export interface UnassignedSingle {
  kind: 'line';
  key: string;
  line: SmsLine;
}

export interface UnassignedSender {
  kind: 'sender';
  key: string;
  provider: string;
  sender: string;
  lines: SmsLine[];
  messageCount: number;
  lastMsgAt: string | null;
}

export interface UnassignedGroups {
  /** One plain row for a sender with one line, one group row for a sender with several. */
  items: (UnassignedSingle | UnassignedSender)[];
  /** The lines with fewer than three messages, in one collapsed group at the end. */
  rare: SmsLine[];
}

const latest = (lines: readonly SmsLine[]): string | null =>
  lines.map((l) => l.lastMsgAt).filter((v): v is string => !!v).sort().pop() ?? null;

/** Splits off the lines seen once or twice, then groups the rest by sender (keeping the server's order). */
export function groupUnassigned(lines: readonly SmsLine[]): UnassignedGroups {
  const rare = lines.filter((l) => l.msgCount < RARE_LINE_BELOW);
  const bySender = new Map<string, SmsLine[]>();
  for (const line of lines) {
    if (line.msgCount < RARE_LINE_BELOW) continue;
    bySender.set(line.sender, [...(bySender.get(line.sender) ?? []), line]);
  }
  const items = [...bySender.entries()].map(([sender, group]): UnassignedSingle | UnassignedSender =>
    group.length === 1
      ? { kind: 'line', key: group[0].id, line: group[0] }
      : {
          kind: 'sender',
          key: `sender:${sender}`,
          provider: group[0].provider,
          sender,
          lines: group,
          messageCount: group.reduce((sum, l) => sum + l.msgCount, 0),
          lastMsgAt: latest(group),
        },
  );
  return { items, rare };
}

/** "3 numbers, 40 messages, last on 13/10/2026". */
export function senderGroupText(group: Pick<UnassignedSender, 'lines' | 'messageCount' | 'lastMsgAt'>): string {
  const last = group.lastMsgAt ? `, last on ${dmy(group.lastMsgAt)}` : '';
  return `${formatCount(group.lines.length, ['number', 'numbers'])}, ${messageWord(group.messageCount)}${last}`;
}

/** "HSBCIN ••123 · 4 messages, last on 13/10/2026" for one unassigned line. */
export function lineText(line: SmsLine): string {
  const last = line.lastMsgAt ? `, last on ${dmy(line.lastMsgAt)}` : '';
  return `${[line.sender, endingText(line)].filter(Boolean).join(' ')} · ${messageWord(line.msgCount)}${last}`;
}

/** The words of one account's report row, in the order the page shows them. */
export function reportCounts(account: SmsReportAccount, postingEnabled: boolean): string {
  const parts = [
    postingEnabled ? `Added ${account.created}` : `Would add ${account.wouldCreate}`,
    `already in FinanceOS ${postingEnabled ? account.attached : account.wouldAttach}`,
    `second alerts ${account.duplicates}`,
    `needs your check ${account.needsConfirm}`,
    `couldn't read ${account.couldNotRead}`,
  ];
  return parts.join(', ');
}

/** The report shows once something is stored. */
export function reportVisible(report: SmsReport | null): report is SmsReport {
  return !!report && report.totals.stored > 0 && report.accounts.length > 0;
}

/** What was read from a message: "₹1,250 debit · 13/10/2026 · Counterparty"; blank when nothing was read. */
export function readSummary(message: Pick<SmsMessage, 'amount' | 'direction' | 'txnDate' | 'counterparty'>): string {
  const money = message.amount === null ? '' : formatMoney(message.amount, { decimals: 'auto' });
  const first = [money, message.direction ?? ''].filter(Boolean).join(' ');
  return [first, dmy(message.txnDate), message.counterparty ?? ''].filter(Boolean).join(' · ');
}
