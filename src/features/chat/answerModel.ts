import { formatCount, formatMoney, formatQuantity } from '@/lib/format';

import type { ChatTableBlock } from './chat.types';
import type { ChatRecord, ChatStep } from './conversation.types';

export type AssistantRecord = Extract<ChatRecord, { kind: 'assistant' }>;

/** A table cell as the reader sees it. */
export function formatAnswerCell(value: string | number | boolean | null | undefined, format?: 'inr' | 'number' | 'text'): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (format === 'inr') return formatMoney(value);
    if (format === 'number') return formatQuantity(value, 2);
  }
  return String(value);
}

/** The table as tab-separated rows (headers first), for pasting into a spreadsheet. */
export function tableToTsv(table: ChatTableBlock): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ');
  const lines = [table.columns.map((c) => clean(c.label)).join('\t')];
  for (const row of table.rows) {
    lines.push(table.columns.map((c) => clean(formatAnswerCell(row[c.key], c.format))).join('\t'));
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
  const parts = [`Ran ${formatCount(n, ['query', 'queries'])}`];
  if (record.durationMs != null) parts.push(`${(record.durationMs / 1000).toFixed(1)} s`);
  return parts.join(' · ');
}

export function stepLabel(step: ChatStep): string {
  return step.label?.trim() || step.summary;
}

/** "1,284 rows · 1.6 s". */
export function stepMeta(step: ChatStep): string | undefined {
  const parts: string[] = [];
  if (step.rowCount != null) parts.push(formatCount(step.rowCount, ['row', 'rows']));
  if (step.durationMs != null) parts.push(`${(step.durationMs / 1000).toFixed(1)} s`);
  return parts.length ? parts.join(' · ') : undefined;
}

/** What Copy answer puts on the clipboard: the prose, or the question the assistant asked. */
export function answerText(record: AssistantRecord): string {
  return (record.answer ?? record.clarify ?? '').trim();
}
