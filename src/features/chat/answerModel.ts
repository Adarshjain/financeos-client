import type { ChatTableBlock } from './chat.types';
import type { ChatRecord, ChatStep } from './conversation.types';

export type AssistantRecord = Extract<ChatRecord, { kind: 'assistant' }>;

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const plain = new Intl.NumberFormat('en-IN');

/** A table cell as the reader sees it. */
export function formatCell(value: string | number | boolean | null | undefined, format?: 'inr' | 'number' | 'text'): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (format === 'inr') return inr.format(value);
    if (format === 'number') return plain.format(value);
  }
  return String(value);
}

/** The table as tab-separated rows (headers first), for pasting into a spreadsheet. */
export function tableToTsv(table: ChatTableBlock): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ');
  const lines = [table.columns.map((c) => clean(c.label)).join('\t')];
  for (const row of table.rows) {
    lines.push(table.columns.map((c) => clean(formatCell(row[c.key], c.format))).join('\t'));
  }
  return lines.join('\n');
}

/** Steps that ran a query or an action. */
export function queryCount(steps: ChatStep[]): number {
  return steps.filter((s) => s.action).length;
}

/** "Ran 2 queries · 4.2 s". */
export function metaLine(record: AssistantRecord): string {
  const n = queryCount(record.steps);
  const parts = [`Ran ${n} ${n === 1 ? 'query' : 'queries'}`];
  if (record.durationMs != null) parts.push(`${(record.durationMs / 1000).toFixed(1)} s`);
  return parts.join(' · ');
}

export function stepLabel(step: ChatStep): string {
  return step.label?.trim() || step.summary;
}

/** "1,284 rows · 1.6 s". */
export function stepMeta(step: ChatStep): string | undefined {
  const parts: string[] = [];
  if (step.rowCount != null) parts.push(`${plain.format(step.rowCount)} ${step.rowCount === 1 ? 'row' : 'rows'}`);
  if (step.durationMs != null) parts.push(`${(step.durationMs / 1000).toFixed(1)} s`);
  return parts.length ? parts.join(' · ') : undefined;
}

/** What Copy answer puts on the clipboard: the prose, or the question the assistant asked. */
export function answerText(record: AssistantRecord): string {
  return (record.answer ?? record.clarify ?? '').trim();
}
