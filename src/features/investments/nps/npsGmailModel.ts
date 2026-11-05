import type { NpsSummary } from './npsModel';

export type NpsDetection = NpsSummary['pendingGmail'][number];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 2025" from an ISO date (no timezone maths: the date is read as written). */
function monthYear(iso: string): string {
  const [y, m] = iso.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** "NPS account found in Gmail (••1234, Ravi) · 3 statements · Jan 2025 – Mar 2025. Whose is it?" */
export function detectionText(d: NpsDetection): string {
  const who = [`••${d.pranLast4}`, d.holderName || null].filter(Boolean).join(', ');
  const count = `${d.statementCount} ${d.statementCount === 1 ? 'statement' : 'statements'}`;
  const range = d.firstPeriodStart && d.lastPeriodEnd ? ` · ${monthYear(d.firstPeriodStart)} – ${monthYear(d.lastPeriodEnd)}` : '';
  return `NPS account found in Gmail (${who}) · ${count}${range}. Whose is it?`;
}

/** "Importing 3 statements…" */
export function importingMessage(n: number): string {
  if (n === 0) return 'Account added';
  return `Importing ${n} ${n === 1 ? 'statement' : 'statements'}…`;
}

/** "<n> NPS statements need a password" */
export function lockedText(n: number): string {
  return `${n} NPS ${n === 1 ? 'statement needs' : 'statements need'} a password`;
}

/** "<n> NPS statements from Gmail couldn't be imported" */
export function failedText(n: number): string {
  return `${n} NPS ${n === 1 ? 'statement' : 'statements'} from Gmail couldn't be imported`;
}

/** "Opened 2, 1 still locked" */
export function unlockMessage(r: { opened: number; stillLocked: number }): { text: string; tone?: 'danger' } {
  const text = `Opened ${r.opened}, ${r.stillLocked} still locked`;
  return r.opened === 0 ? { text, tone: 'danger' } : { text };
}
