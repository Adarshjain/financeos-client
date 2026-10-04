import type { MatchType } from '@/lib/rules.types';

// Plain (non-'use client') module so both the server page (rules/page.tsx,
// for its prefetch) and the client hook (useRulesBrowser.ts) can share the
// exact same default page size without one importing across the client
// boundary.
export const RULES_PAGE_SIZE = 50;

// 'all' means "not filtered"; the hook maps them to undefined query params.
export interface RuleFilters {
  source: 'all' | 'LLM' | 'USER';
  matchType: 'all' | MatchType;
  categoryId: string;
  applied: 'all' | 'true' | 'false';
  sort: string;
}

export const DEFAULT_RULE_FILTERS: RuleFilters = {
  source: 'all',
  matchType: 'all',
  categoryId: 'all',
  applied: 'all',
  sort: 'all',
};

// Values are passed straight through as the Spring `sort` param; the server
// whitelists the fields. 'all' = server default (unverified first, then most
// recently applied).
export const RULE_SORT_OPTIONS = [
  { value: 'all', label: 'Default order' },
  { value: 'lastAppliedAt,desc', label: 'Recently used' },
  { value: 'appliedCount,desc', label: 'Most used' },
  { value: 'createdAt,desc', label: 'Newest' },
  { value: 'createdAt,asc', label: 'Oldest' },
  { value: 'merchantKey,asc', label: 'Pattern A–Z' },
] as const;
