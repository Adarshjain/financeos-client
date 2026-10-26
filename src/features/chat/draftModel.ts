import type { ChatReportDraft } from './chat.types';
import type { DraftResult } from './conversation.types';

/** A draft the card cannot act on: a create or update without its definition, or a delete without a report. */
export function isMalformedDraft(draft: ChatReportDraft | null | undefined): boolean {
  return (
    !draft ||
    !draft.mode ||
    ((draft.mode === 'create' || draft.mode === 'update') && (!draft.name || !draft.type || !draft.datasource || !draft.definition)) ||
    (draft.mode === 'delete' && !draft.reportId)
  );
}

const TYPE_LABEL: Record<string, string> = { KPI: 'KPI', CHART: 'Chart', TABLE: 'Table' };

/** "transactions" → "Transactions", "net_worth" → "Net worth". */
export function datasourceLabel(name: string): string {
  const words = name.replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** "Chart · Transactions · last 12 months, top 5 categories and the rest". */
export function draftCaption(draft: ChatReportDraft): string {
  return [draft.type ? TYPE_LABEL[draft.type] ?? draft.type : null, draft.datasource ? datasourceLabel(draft.datasource) : null, draft.description?.trim() || null]
    .filter(Boolean)
    .join(' · ');
}

/** What the card shows after a stored outcome; an undone outcome shows the actions again. */
export function activeResult(result: DraftResult | null | undefined): DraftResult | null {
  return result && result.action !== 'undone' ? result : null;
}
