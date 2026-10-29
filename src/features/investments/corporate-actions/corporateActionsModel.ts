import { DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { DS_PREFIX } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { formatDate, formatMoney, formatQuantity } from '@/lib/format';
import type {
  CorporateActionItem,
  CorporateActionKind,
  CorporateActionPageQuery,
  CorporateActionPreview,
  CorporateActionSort,
} from '@/lib/investments.types';

import { INVESTMENTS_PATH } from '../investmentsTabs';
import { ratioText } from './corporateActionRatio';

// ---- URL state ---------------------------------------------------------------

/** The page's own address; it exists by definition, so it never goes through `appHref`. */
export const CORPORATE_ACTIONS_HREF = `${DS_PREFIX}${INVESTMENTS_PATH}/corporate-actions`;

export const CORPORATE_ACTIONS_SIZE_OPTIONS = [25, 50, 100];

export interface CorporateActionsUrlState {
  q: string;
  /** '' = every kind. */
  type: CorporateActionKind | '';
  sort: CorporateActionSort;
  page: number;
  size: number;
}

export const KINDS: CorporateActionKind[] = ['split', 'bonus', 'demerger', 'merger'];
const SORTS: CorporateActionSort[] = ['newest', 'oldest', 'name'];

export function parseCorporateActionsUrl(params: SearchParamsRecord): CorporateActionsUrlState {
  return {
    q: (first(params.q) ?? '').trim(),
    type: KINDS.includes(first(params.type) as CorporateActionKind) ? (first(params.type) as CorporateActionKind) : '',
    sort: SORTS.includes(first(params.sort) as CorporateActionSort) ? (first(params.sort) as CorporateActionSort) : 'newest',
    ...parsePage(params, { size: DEFAULT_PAGE_SIZE, sizes: CORPORATE_ACTIONS_SIZE_OPTIONS }),
  };
}

/** The page's URL for a state: defaults stay out of the query string. */
export function corporateActionsUrl(state: CorporateActionsUrlState): string {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.type) query.set('type', state.type);
  if (state.sort !== 'newest') query.set('sort', state.sort);
  setPageParam(query, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) query.set('size', String(state.size));
  const text = query.toString();
  return text ? `${CORPORATE_ACTIONS_HREF}?${text}` : CORPORATE_ACTIONS_HREF;
}

/** The server request for a state. */
export function corporateActionsQuery(state: CorporateActionsUrlState): CorporateActionPageQuery {
  return { type: state.type || undefined, search: state.q || undefined, sort: state.sort, page: state.page, size: state.size };
}

export const TYPE_CHIPS: { value: CorporateActionKind | ''; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'split', label: 'Split' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'demerger', label: 'Demerger' },
  { value: 'merger', label: 'Merger' },
];

export const SORT_OPTIONS: { value: CorporateActionSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name A–Z' },
];

export const KIND_LABELS: Record<CorporateActionKind, string> = {
  split: 'Split',
  bonus: 'Bonus',
  demerger: 'Demerger',
  merger: 'Merger',
};

/** The rules card under the list: how the server applies each kind. */
export const APPLY_RULES: { label: string; text: string }[] = [
  { label: 'Split / bonus', text: 'Quantity multiplies, cost per share divides, total cost unchanged' },
  { label: 'Demerger', text: 'Cost basis carved to the child by the stated %, holding period carries' },
  { label: 'Merger', text: 'Transferor closes, 100% cost carries to the acquirer' },
  { label: 'Fractions', text: 'Floored; the fraction is sold as cash-in-lieu' },
];

// ---- List rows ---------------------------------------------------------------

export interface CorporateActionListRow {
  id: string;
  /** Kept for the edit dialog. */
  item: CorporateActionItem;
  /** Ex-date, "10 Jun 25". */
  date: string;
  /** "INFY · Infosys", or just the name when there is no symbol. */
  title: string;
  /** Child, acquirer, cash-in-lieu and notes, one line; '' when there is nothing to say. */
  detail: string;
  kind: CorporateActionKind;
  typeLabel: string;
  /** "1 : 2" */
  ratio: string;
  /** "30 → 60", '' when the server has no quantities. */
  effect: string;
  /** "cost ₹1,420 → ₹710" per share, '' when the server has no cost. */
  cost: string;
  /** Phone second line: "ex 10 Jun 25 · 1:1 · 30 → 60 shares". */
  phoneLine: string;
}

function instrumentTitle(symbol: string | null, name: string): string {
  return symbol && symbol !== name ? `${symbol} · ${name}` : name;
}

function detailLine(a: CorporateActionItem): string {
  const parts: string[] = [];
  const target = a.targetInstrumentName ? instrumentTitle(a.targetInstrumentSymbol, a.targetInstrumentName) : '';
  if (a.type === 'demerger') {
    parts.push(`Child ${target || 'instrument'}${a.costAllocationPct != null ? ` · ${a.costAllocationPct}% cost` : ''}`);
  } else if (a.type === 'merger') {
    parts.push(`Merged into ${target || 'acquirer'}`);
  }
  if ((a.type === 'demerger' || a.type === 'merger') && a.fractionalCashInLieu) {
    parts.push(`cash-in-lieu ${formatMoney(a.fractionalCashInLieu)}`);
  }
  if (a.notes) parts.push(`Note: ${a.notes}`);
  return parts.join(' · ');
}

export function corporateActionListRow(a: CorporateActionItem): CorporateActionListRow {
  const ratio = ratioText(a.type, a.ratioFrom, a.ratioTo) || '—';
  const effect = a.quantityBefore != null && a.quantityAfter != null ? `${formatQuantity(a.quantityBefore)} → ${formatQuantity(a.quantityAfter)}` : '';
  const compactRatio = ratioText(a.type, a.ratioFrom, a.ratioTo, true);
  const money = (v: number) => (Number.isInteger(v) ? formatMoney(v) : formatMoney(v, { decimals: 'exact' }));
  const cost = a.costPerUnitBefore != null && a.costPerUnitAfter != null ? `cost ${money(a.costPerUnitBefore)} → ${money(a.costPerUnitAfter)}` : '';
  return {
    id: a.id,
    item: a,
    date: formatDate(a.exDate, 'list'),
    title: instrumentTitle(a.instrumentSymbol, a.instrumentName),
    detail: detailLine(a),
    kind: a.type,
    typeLabel: KIND_LABELS[a.type] ?? a.type,
    ratio,
    effect,
    cost,
    phoneLine: [`ex ${formatDate(a.exDate, 'list')}`, compactRatio, effect ? `${effect} shares` : '', cost].filter(Boolean).join(' · '),
  };
}

// ---- Preview lines ---------------------------------------------------------------

export interface PreviewLine {
  key: string;
  label: string;
  text: string;
}

/**
 * The "After saving" lines of a preview: one per broker holding of the parent, and one per child it
 * creates. `instrumentName` and `childName` come from the form.
 */
export function previewLines(preview: CorporateActionPreview, instrumentName: string, childName: string): PreviewLine[] {
  const several = preview.holdings.length > 1;
  const lines: PreviewLine[] = [];
  for (const h of preview.holdings) {
    const where = several ? ` (${h.brokerAccountName})` : '';
    lines.push({
      key: `${h.brokerAccountId}-parent`,
      label: `${instrumentName}${where}`,
      text:
        h.quantityAfter === h.quantityBefore
          ? `${formatQuantity(h.quantityAfter)} shares · cost ${formatMoney(h.openCostBefore)} → ${formatMoney(h.openCostAfter)}`
          : `${formatQuantity(h.quantityBefore)} → ${formatQuantity(h.quantityAfter)} shares · cost ${formatMoney(h.openCostBefore)} → ${formatMoney(h.openCostAfter)}`,
    });
    if (h.childInstrumentId && h.childQuantity != null) {
      lines.push({
        key: `${h.brokerAccountId}-child`,
        label: `${childName || 'Child'}${where}`,
        text: `+${formatQuantity(h.childQuantity)} shares${h.childCost != null ? ` · cost ${formatMoney(h.childCost)}` : ''}`,
      });
    }
    if (h.fractionalRealized != null && h.fractionalRealized !== 0) {
      lines.push({
        key: `${h.brokerAccountId}-fraction`,
        label: 'Cash-in-lieu gain',
        text: formatMoney(h.fractionalRealized),
      });
    }
  }
  return lines;
}
