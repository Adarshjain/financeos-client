import { Category } from '@/lib/categories.types';
import type { Page } from '@/lib/pagination';

/**
 * How a rule's pattern is matched against a transaction's sourced description.
 * MERCHANT_KEY is the legacy normalized-contains match (the only type the LLM
 * auto-generates); the others match the raw description case-insensitively.
 */
export type MatchType = 'MERCHANT_KEY' | 'CONTAINS' | 'STARTS_WITH' | 'EXACT' | 'REGEX';

export interface CategoryRule {
  id: string;
  merchantKey: string;
  matchType: MatchType;
  displayName: string | null;
  categories: Category[];
  verified: boolean;
  source: 'LLM' | 'USER';
  appliedCount: number;
  lastAppliedAt: string | null;
  createdAt: string;
  mcc?: string | null;
}

export interface CreateRuleRequest {
  merchantKey: string;
  matchType?: MatchType;
  displayName?: string;
  categoryIds: string[];
  mcc?: string | null;
}

export interface UpdateRuleRequest {
  merchantKey?: string;
  matchType?: MatchType;
  displayName?: string;
  categoryIds?: string[];
  mcc?: string | null;
}

export interface PreviewMatchesRequest {
  merchantKey: string;
  matchType?: MatchType;
}

export interface RuleMatchTransaction {
  id: string;
  date: string;
  amount: string;
  type: 'CREDIT' | 'DEBIT' | null;
  sourcedDescription: string;
  categories: Category[];
  reviewType: string | null;
  appliedRuleId: string | null;
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
