import type { SelectOption } from '@/components/ds/Select/Select';
import { clampPage, DEFAULT_PAGE_SIZE, parsePage, setPageParam } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { categoryLabel } from '@/lib/categoryList';
import type { CategoryRule, MatchType, RuleMatchTransaction } from '@/lib/rules.types';

// The Tags tab (it still lists the rules until its rebuild) keeps everything in the address: a link opens it filtered, refresh and Back keep it,
// and the server page reads it once before the first fetch.

export const RULES_HREF = appHref('/rules');
export const RULES_SIZE_OPTIONS = [25, 50, 100];
/** The jobs the rules page lists (applying a rule to its matches). */
export const RULE_JOB_TYPE = 'RULE_APPLY';
export const RULE_JOBS_SIZE = 5;
export const RULE_JOBS_HREF = appHref(`/data-sources/sync?type=${RULE_JOB_TYPE}`);

export interface RulesUrlState {
  q: string;
  matchType: MatchType | null;
  /** One category key. */
  categoryKey: string | null;
  /** 0-based. */
  page: number;
  size: number;
}

export const DEFAULT_RULES_STATE: RulesUrlState = {
  q: '',
  matchType: null,
  categoryKey: null,
  page: 0,
  size: DEFAULT_PAGE_SIZE,
};

const trimmed = (v: string | string[] | undefined) => (first(v) ?? '').trim();

export const MATCH_TYPES: MatchType[] = ['CONTAINS', 'STARTS_WITH', 'EXACT', 'REGEX'];

/** The state an address stands for; anything missing or invalid falls back to its default. */
export function parseRulesUrl(params: SearchParamsRecord): RulesUrlState {
  const matchType = trimmed(params.match) as MatchType;
  return {
    q: trimmed(params.q),
    matchType: MATCH_TYPES.includes(matchType) ? matchType : null,
    categoryKey: trimmed(params.category) || null,
    ...parsePage(params, { sizes: RULES_SIZE_OPTIONS }),
  };
}

/** The query string for a state, in a stable order with defaults left out; `?` alone when there is none. */
export function rulesUrl(state: RulesUrlState): string {
  const out = new URLSearchParams();
  if (state.q) out.set('q', state.q);
  if (state.matchType) out.set('match', state.matchType);
  if (state.categoryKey) out.set('category', state.categoryKey);
  setPageParam(out, state.page);
  if (state.size !== DEFAULT_PAGE_SIZE) out.set('size', String(state.size));
  const text = out.toString();
  return text ? `?${text}` : '?';
}

/** Everything that decides which rules are listed, without the page: a change here drops the ticked rules. */
export function rulesFilterKey(state: RulesUrlState): string {
  return rulesUrl({ ...state, page: 0, size: DEFAULT_PAGE_SIZE });
}

/** The server's list filters for a state. */
export function rulesRequest(state: RulesUrlState) {
  return {
    search: state.q || undefined,
    matchType: state.matchType ?? undefined,
    categoryKey: state.categoryKey ?? undefined,
  };
}

/** Where to go instead when the page asked for is past the last one; null when it is fine. */
export function clampedRulesUrl(state: RulesUrlState, page: { content: unknown[]; totalPages: number }): string | null {
  if (page.content.length > 0 || page.totalPages === 0 || state.page < page.totalPages) return null;
  return rulesUrl({ ...state, page: clampPage(state.page, page.totalPages) });
}

/** True when a filter or search narrows the list. */
export function hasRuleFilters(state: RulesUrlState): boolean {
  return Boolean(state.q || state.matchType || state.categoryKey);
}

// ---- Words ---------------------------------------------------------------

export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts with',
  EXACT: 'Exact',
  REGEX: 'Regex',
};

export const MATCH_TYPE_OPTIONS: SelectOption[] = MATCH_TYPES.map((t) => ({ value: t, label: MATCH_TYPE_LABEL[t] }));

export const ANY = 'any';

export const MATCH_FILTER_OPTIONS: SelectOption[] = [{ value: ANY, label: 'Any match type' }, ...MATCH_TYPE_OPTIONS];

/** The card's title: the display name, else the pattern. */
export function ruleName(rule: Pick<CategoryRule, 'displayName' | 'merchantKey'>): string {
  return rule.displayName || rule.merchantKey;
}

/** The card's "Contains · PATTERN" line; empty for a plain contains rule with no name, where the title is the pattern. */
export function ruleMatchLine(rule: CategoryRule): { matchType: string; pattern: string | undefined } {
  if (!rule.displayName && rule.matchType === 'CONTAINS') return { matchType: '', pattern: undefined };
  return { matchType: MATCH_TYPE_LABEL[rule.matchType] ?? MATCH_TYPE_LABEL.CONTAINS, pattern: rule.merchantKey };
}

/** "Food · Delivery": the category a rule sets. */
export function ruleCategoryLabel(rule: Pick<CategoryRule, 'category' | 'subcategory'>): string {
  return categoryLabel(rule.category.name, rule.subcategory?.name);
}

/** "Contains DUNZO DAILY": the find-matches subtitle. */
export function ruleMatchSentence(rule: CategoryRule): string {
  return `${MATCH_TYPE_LABEL[rule.matchType] ?? MATCH_TYPE_LABEL.CONTAINS} ${rule.merchantKey}`;
}

/** Which rule a matched transaction follows now: editing a rule reaches only the rows linked to it. */
export function ruleLinkLabel(
  txn: Pick<RuleMatchTransaction, 'appliedRuleId' | 'appliedRuleName'>,
  ruleId?: string | null,
): string {
  if (!txn.appliedRuleId) return 'not linked to a rule';
  if (ruleId && txn.appliedRuleId === ruleId) return 'already this rule';
  return txn.appliedRuleName ? `rule: ${txn.appliedRuleName}` : 'another rule';
}

/** "••7741" for a matched transaction's card, or null. */
export function matchPlastic(txn: Pick<RuleMatchTransaction, 'cardLast4'>): string | null {
  return txn.cardLast4 ? `••${txn.cardLast4}` : null;
}
