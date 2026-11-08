'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import { action } from '@/lib/observability/action';
import type { MatchType, RuleMatchesPreview } from '@/lib/rules.types';

export const createRule = action('rule.createRule', createDomainAction(
  { fallbackError: "Couldn't create the rule. Try again." },
  async (body: Schemas['CreateRuleRequest']) => {
    const { data } = await serverApi.POST('/api/v1/rules', { body });
    return data;
  },
));

export const updateRule = action('rule.updateRule', createDomainAction(
  { fallbackError: "Couldn't update the rule. Try again." },
  async (id: string, body: Schemas['UpdateRuleRequest']) => {
    const { data } = await serverApi.PUT('/api/v1/rules/{id}', { params: { path: { id } }, body });
    return data;
  },
));

export const deleteRule = action('rule.deleteRule', createDomainAction(
  { fallbackError: "Couldn't delete the rule. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/rules/{id}', { params: { path: { id } } });
  },
));

/** One page of the transactions a pattern matches (ones the user set by hand are counted apart). */
export const loadRuleMatches = action('rule.loadRuleMatches', createDomainAction(
  { fallbackError: "Couldn't load matches. Try again." },
  async (merchantKey: string, matchType: MatchType, page: number, size: number): Promise<RuleMatchesPreview> => {
    const { data } = await serverApi.POST('/api/v1/rules/preview-matches', {
      params: { query: { page, size, sort: [] } },
      body: { merchantKey, matchType },
    });
    return data as unknown as RuleMatchesPreview;
  },
));

/** Starts the job that applies a rule to the given transactions, or to every match. */
export const applyRule = action('rule.applyRule', createDomainAction(
  { fallbackError: "Couldn't apply the rule. Try again." },
  async (id: string, body: { all: true } | { transactionIds: string[] }) => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/apply', { params: { path: { id } }, body });
    return data;
  },
));
