import type { SelectOption } from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import type { CategoryRule, MatchType, RuleMatchTransaction } from '@/lib/rules.types';

// The Rules tab keeps everything in the address: a link opens it filtered, refresh and Back keep it,
// and the server page reads it once before the first fetch.

export const RULES_HREF = appHref('/rules');
export const RULES_SIZE_OPTIONS = [25, 50, 100];
export const RULES_DEFAULT_SIZE = 25;
/** The jobs the rules page lists (applying a rule to its matches). */
export const RULE_JOB_TYPE = 'RULE_APPLY';
export const RULE_JOBS_SIZE = 5;
export const RULE_JOBS_HREF = appHref(`/settings/activity?type=${RULE_JOB_TYPE}`);

export type RuleStatus = 'unverified' | 'verified' | 'all';
export type RuleSource = 'LLM' | 'USER';

export const DEFAULT_STATUS: RuleStatus = 'unverified';

export interface RulesUrlState {
  q: string;
  /** The list opens on Unverified. */
  status: RuleStatus;
  source: RuleSource | null;
  matchType: MatchType | null;
  /** One category id. */
  categoryId: string | null;
  /** 0-based. */
  page: number;
  size: number;
}

export const DEFAULT_RULES_STATE: RulesUrlState = {
  q: '',
  status: DEFAULT_STATUS,
  source: null,
  matchType: null,
  categoryId: null,
  page: 0,
  size: RULES_DEFAULT_SIZE,
};

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? '').trim();

export const MATCH_TYPES: MatchType[] = ['MERCHANT_KEY', 'CONTAINS', 'STARTS_WITH', 'EXACT', 'REGEX'];

/** The state an address stands for; anything missing or invalid falls back to its default. */
export function parseRulesUrl(params: Raw): RulesUrlState {
  const page = Math.floor(Number(first(params.page)));
  const size = Number(first(params.size));
  const status = first(params.status);
  const source = first(params.source);
  const matchType = first(params.match) as MatchType;
  return {
    q: first(params.q),
    status: status === 'verified' || status === 'all' ? status : DEFAULT_STATUS,
    source: source === 'LLM' || source === 'USER' ? source : null,
    matchType: MATCH_TYPES.includes(matchType) ? matchType : null,
    categoryId: first(params.category) || null,
    page: Number.isFinite(page) && page > 0 ? page : 0,
    size: RULES_SIZE_OPTIONS.includes(size) ? size : RULES_DEFAULT_SIZE,
  };
}

/** The query string for a state, in a stable order with defaults left out; `?` alone when there is none. */
export function rulesUrl(state: RulesUrlState): string {
  const out = new URLSearchParams();
  if (state.q) out.set('q', state.q);
  if (state.status !== DEFAULT_STATUS) out.set('status', state.status);
  if (state.source) out.set('source', state.source);
  if (state.matchType) out.set('match', state.matchType);
  if (state.categoryId) out.set('category', state.categoryId);
  if (state.page > 0) out.set('page', String(state.page));
  if (state.size !== RULES_DEFAULT_SIZE) out.set('size', String(state.size));
  const text = out.toString();
  return text ? `?${text}` : '?';
}

/** Everything that decides which rules are listed, without the page: a change here drops the ticked rules. */
export function rulesFilterKey(state: RulesUrlState): string {
  return rulesUrl({ ...state, page: 0, size: RULES_DEFAULT_SIZE });
}

/** The `verified` filter the server takes for a status; undefined for All. */
export function verifiedParam(status: RuleStatus): boolean | undefined {
  return status === 'all' ? undefined : status === 'verified';
}

/** The server's list filters for a state, with the status set by the caller. */
export function rulesRequest(state: RulesUrlState, status: RuleStatus = state.status) {
  return {
    verified: verifiedParam(status),
    search: state.q || undefined,
    source: state.source ?? undefined,
    matchType: state.matchType ?? undefined,
    categoryId: state.categoryId ?? undefined,
  };
}

/** Where to go instead when the page asked for is past the last one; null when it is fine. */
export function clampedRulesUrl(state: RulesUrlState, page: { content: unknown[]; totalPages: number }): string | null {
  if (page.content.length > 0 || page.totalPages === 0 || state.page < page.totalPages) return null;
  return rulesUrl({ ...state, page: page.totalPages - 1 });
}

/** True when a filter or search narrows the list (the status alone does not). */
export function hasRuleFilters(state: RulesUrlState): boolean {
  return Boolean(state.q || state.source || state.matchType || state.categoryId);
}

export interface RuleCounts {
  unverified: number;
  verified: number;
  all: number;
}

/** The three status chips' numbers from two counts; the third is their sum. */
export function ruleCounts(unverified: number, verified: number): RuleCounts {
  return { unverified, verified, all: unverified + verified };
}

// ---- Words ---------------------------------------------------------------

export const MATCH_TYPE_LABEL: Record<MatchType, string> = {
  MERCHANT_KEY: 'Smart contains',
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts with',
  EXACT: 'Exact',
  REGEX: 'Regex',
};

export const MATCH_TYPE_OPTIONS: SelectOption[] = MATCH_TYPES.map((t) => ({ value: t, label: MATCH_TYPE_LABEL[t] }));

export const SOURCE_LABEL: Record<RuleSource, string> = { LLM: 'LLM-generated', USER: 'Created by you' };

export const ANY = 'any';

export const SOURCE_OPTIONS: SelectOption[] = [
  { value: ANY, label: 'Any source' },
  { value: 'LLM', label: SOURCE_LABEL.LLM },
  { value: 'USER', label: SOURCE_LABEL.USER },
];

export const MATCH_FILTER_OPTIONS: SelectOption[] = [{ value: ANY, label: 'Any match type' }, ...MATCH_TYPE_OPTIONS];

/** The card's title: the display name, else the pattern. */
export function ruleName(rule: Pick<CategoryRule, 'displayName' | 'merchantKey'>): string {
  return rule.displayName || rule.merchantKey;
}

/** The card's "Contains · PATTERN" line; empty for a plain smart-contains rule with no name, where the title is the pattern. */
export function ruleMatchLine(rule: CategoryRule): { matchType: string; pattern: string | undefined } {
  if (!rule.displayName && rule.matchType === 'MERCHANT_KEY') return { matchType: '', pattern: undefined };
  return { matchType: MATCH_TYPE_LABEL[rule.matchType] ?? MATCH_TYPE_LABEL.MERCHANT_KEY, pattern: rule.merchantKey };
}

/** "Contains DUNZO DAILY": the find-matches subtitle. */
export function ruleMatchSentence(rule: CategoryRule): string {
  return `${MATCH_TYPE_LABEL[rule.matchType] ?? MATCH_TYPE_LABEL.MERCHANT_KEY} ${rule.merchantKey}`;
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
