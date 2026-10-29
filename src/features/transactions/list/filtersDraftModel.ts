import { ANY } from './filterOptionsModel';
import {
  type AmountCondition,
  type AmountOp,
  DEFAULT_PERIOD,
  PERIOD_PRESETS,
  type PeriodPresetId,
  REASON_PARAMS,
  REVIEW_PARAMS,
  type SortId,
  type TransactionsQuery,
  type TypeFilter,
} from './transactionsUrl';

export type PeriodMode = 'preset' | 'date' | 'range';

/** What the Filters dialog edits before "Show": text fields stay text until they are applied. */
export interface FiltersDraft {
  periodMode: PeriodMode;
  preset: PeriodPresetId;
  /** ISO date, or '' while none is picked. */
  date: string;
  from: string;
  to: string;
  amountOp: AmountOp;
  amountFrom: string;
  amountTo: string;
  /** `ANY` or a review param ("needs_review"). */
  review: string;
  /** `ANY` or a source value. */
  source: string;
  excluded: boolean;
  sort: SortId;
  accounts: string[];
  categories: string[];
  type: TypeFilter;
  /** `ANY` or a reason param ("unreconciled"). */
  reason: string;
  monitoring: boolean;
  upToStatement: boolean;
}

export function draftFromQuery(query: TransactionsQuery): FiltersDraft {
  const { period, amount } = query;
  return {
    periodMode: period.kind === 'preset' ? 'preset' : period.kind,
    preset: period.kind === 'preset' ? period.id : DEFAULT_PERIOD.id,
    date: period.kind === 'date' ? period.date : '',
    from: period.kind === 'range' ? period.from : '',
    to: period.kind === 'range' ? period.to : '',
    amountOp: amount?.op ?? 'greater_than',
    amountFrom: amount?.from !== null && amount?.from !== undefined ? String(amount.from) : '',
    amountTo: amount?.to !== null && amount?.to !== undefined ? String(amount.to) : '',
    review: query.review ? (Object.keys(REVIEW_PARAMS).find((k) => REVIEW_PARAMS[k] === query.review) ?? ANY) : ANY,
    source: query.source ?? ANY,
    excluded: query.excluded,
    sort: query.sort,
    accounts: query.accounts,
    categories: query.categories,
    type: query.type,
    reason: query.reason ? (Object.keys(REASON_PARAMS).find((k) => REASON_PARAMS[k] === query.reason) ?? ANY) : ANY,
    monitoring: query.monitoring,
    upToStatement: query.upToStatement,
  };
}

function number(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The amount filter the typed values stand for; null until the fields the condition needs hold numbers. */
export function amountFromDraft(draft: Pick<FiltersDraft, 'amountOp' | 'amountFrom' | 'amountTo'>): AmountCondition | null {
  const from = number(draft.amountFrom);
  const to = number(draft.amountTo);
  if (draft.amountOp === 'greater_than') return from === null ? null : { op: 'greater_than', from, to: null };
  if (draft.amountOp === 'less_than') return to === null ? null : { op: 'less_than', from: null, to };
  if (from === null || to === null) return null;
  return { op: 'between', from: Math.min(from, to), to: Math.max(from, to) };
}

/**
 * The query after "Show": the dialog's fields written over the query it opened on, back on page one.
 * A single date or range that is not filled in falls back to the preset.
 */
export function queryFromDraft(base: TransactionsQuery, draft: FiltersDraft): TransactionsQuery {
  const preset = PERIOD_PRESETS.find((p) => p.id === draft.preset)?.id ?? DEFAULT_PERIOD.id;
  let period: TransactionsQuery['period'] = { kind: 'preset', id: preset };
  if (draft.periodMode === 'date' && draft.date) period = { kind: 'date', date: draft.date };
  if (draft.periodMode === 'range' && draft.from && draft.to) {
    period =
      draft.from <= draft.to
        ? { kind: 'range', from: draft.from, to: draft.to }
        : { kind: 'range', from: draft.to, to: draft.from };
  }
  return {
    ...base,
    period,
    amount: amountFromDraft(draft),
    review: draft.review === ANY ? null : (REVIEW_PARAMS[draft.review] ?? null),
    source: draft.source === ANY ? null : (draft.source as TransactionsQuery['source']),
    excluded: draft.excluded,
    sort: draft.sort,
    accounts: draft.accounts,
    categories: draft.categories,
    uncategorized: draft.categories.length > 0 ? false : base.uncategorized,
    type: draft.type,
    reason: draft.reason === ANY ? null : (REASON_PARAMS[draft.reason] ?? null),
    monitoring: draft.monitoring,
    upToStatement: draft.upToStatement,
    page: 0,
  };
}

export type FilterSection = 'date' | 'accountCategory' | 'amount' | 'status';

/** One filter the Filters dialog's draft has moved off its default: its words, its section and the patch that resets it. */
export interface ChangedFilter {
  id: string;
  label: string;
  section: FilterSection;
  reset: Partial<FiltersDraft>;
}

const DEFAULT_DRAFT_PERIOD: Partial<FiltersDraft> = {
  periodMode: 'preset',
  preset: 'all_time',
  date: '',
  from: '',
  to: '',
};

/** The filters of a draft that differ from their defaults, in dialog order (sort is not a filter). */
export function changedFilters(
  draft: FiltersDraft,
  words: {
    period: string;
    accounts: string;
    categories: string;
    type: string;
    amount: string;
    review: string;
    reason: string;
    source: string;
  }
): ChangedFilter[] {
  const out: ChangedFilter[] = [];
  const periodChanged =
    (draft.periodMode === 'preset' && draft.preset !== 'all_time') ||
    (draft.periodMode === 'date' && draft.date !== '') ||
    (draft.periodMode === 'range' && draft.from !== '' && draft.to !== '');
  if (periodChanged) out.push({ id: 'period', label: words.period, section: 'date', reset: DEFAULT_DRAFT_PERIOD });
  if (draft.accounts.length > 0) out.push({ id: 'accounts', label: words.accounts, section: 'accountCategory', reset: { accounts: [] } });
  if (draft.categories.length > 0) out.push({ id: 'categories', label: words.categories, section: 'accountCategory', reset: { categories: [] } });
  if (draft.type !== 'all') out.push({ id: 'type', label: words.type, section: 'accountCategory', reset: { type: 'all' } });
  if (amountFromDraft(draft)) {
    out.push({ id: 'amount', label: words.amount, section: 'amount', reset: { amountOp: 'greater_than', amountFrom: '', amountTo: '' } });
  }
  if (draft.review !== ANY) out.push({ id: 'review', label: words.review, section: 'status', reset: { review: ANY } });
  if (draft.reason !== ANY) out.push({ id: 'reason', label: words.reason, section: 'status', reset: { reason: ANY } });
  if (draft.source !== ANY) out.push({ id: 'source', label: words.source, section: 'status', reset: { source: ANY } });
  if (draft.monitoring) out.push({ id: 'monitoring', label: 'Monitoring', section: 'status', reset: { monitoring: false } });
  if (draft.upToStatement) out.push({ id: 'upToStatement', label: 'Up to statement', section: 'status', reset: { upToStatement: false } });
  if (draft.excluded) out.push({ id: 'excluded', label: 'Excluded only', section: 'status', reset: { excluded: false } });
  return out;
}
