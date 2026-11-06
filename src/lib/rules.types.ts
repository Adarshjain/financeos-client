import type { CategoryRef, CategorySource, SubcategoryRef } from '@/lib/categoryList.types';
import type { Page } from '@/lib/pagination';

/** How a rule's pattern is matched against a transaction's sourced description (case-insensitive). */
export type MatchType = 'CONTAINS' | 'STARTS_WITH' | 'EXACT' | 'REGEX';

export interface CategoryRule {
  id: string;
  merchantKey: string;
  matchType: MatchType;
  displayName: string | null;
  category: CategoryRef;
  subcategory?: SubcategoryRef | null;
  appliedCount: number;
  lastAppliedAt: string | null;
  createdAt: string;
  mcc?: string | null;
}

export interface CreateRuleRequest {
  merchantKey: string;
  matchType?: MatchType;
  displayName?: string;
  categoryKey: string;
  subcategoryKey?: string | null;
  mcc?: string | null;
}

export interface UpdateRuleRequest {
  merchantKey?: string;
  matchType?: MatchType;
  displayName?: string;
  categoryKey?: string | null;
  subcategoryKey?: string | null;
  mcc?: string | null;
}

export interface PreviewMatchesRequest {
  merchantKey: string;
  matchType?: MatchType;
}

export interface RuleMatchTransaction {
  id: string;
  date: string;
  amount: string | number | null;
  type: 'CREDIT' | 'DEBIT' | null;
  sourcedDescription: string;
  category?: CategoryRef | null;
  subcategory?: SubcategoryRef | null;
  categorySource?: CategorySource | null;
  appliedRuleId: string | null;
  appliedRuleName: string | null;
  /** The account the transaction sits on; `accountBank` is its bank id. */
  accountId?: string;
  accountName?: string;
  accountBank?: string | null;
  cardId?: string | null;
  cardLast4?: string | null;
}

export interface ApplyRuleRequest {
  transactionIds?: string[];
  all?: boolean;
}

export interface ApplyRuleResult {
  appliedCount: number;
}

export type PagedRules = Page<CategoryRule>;
export type PagedRuleMatches = Page<RuleMatchTransaction>;

/** POST /rules/preview-matches: one page of matches, plus how many match and how many of those the user set by hand. */
export interface RuleMatchesPreview {
  matchCount: number;
  userSetCount: number;
  matches: PagedRuleMatches;
}
