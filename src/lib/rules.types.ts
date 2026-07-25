import { Category } from '@/lib/categories.types';
import type { Page } from '@/lib/pagination';

export interface CategoryRule {
  id: string;
  merchantKey: string;
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
  displayName?: string;
  categoryIds: string[];
  mcc?: string | null;
}

export interface UpdateRuleRequest {
  merchantKey?: string;
  displayName?: string;
  categoryIds?: string[];
  mcc?: string | null;
}

export type PagedRules = Page<CategoryRule>;
