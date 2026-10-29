'use server';

import { serverApi } from '@/lib/api/server';
import type { Schemas } from '@/lib/api/types';
import { createDomainAction } from '@/lib/domainApi';
import type { MatchType, PagedRuleMatches } from '@/lib/rules.types';

export const createRule = createDomainAction(
  { fallbackError: "Couldn't create the rule. Try again." },
  async (body: Schemas['CreateRuleRequest']) => {
    const { data } = await serverApi.POST('/api/v1/rules', { body });
    return data;
  },
);

export const updateRule = createDomainAction(
  { fallbackError: "Couldn't update the rule. Try again." },
  async (id: string, body: Schemas['UpdateRuleRequest']) => {
    const { data } = await serverApi.PUT('/api/v1/rules/{id}', { params: { path: { id } }, body });
    return data;
  },
);

export const deleteRule = createDomainAction(
  { fallbackError: "Couldn't delete the rule. Try again." },
  async (id: string): Promise<void> => {
    await serverApi.DELETE('/api/v1/rules/{id}', { params: { path: { id } } });
  },
);

export const verifyRule = createDomainAction(
  { fallbackError: "Couldn't verify the rule. Try again." },
  async (id: string) => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/verify', { params: { path: { id } } });
    return data;
  },
);

export const verifyRules = createDomainAction(
  { fallbackError: "Couldn't verify the rules. Try again." },
  async (ruleIds: string[]) => {
    const { data } = await serverApi.POST('/api/v1/rules/verify', { body: { ruleIds } });
    return data!;
  },
);

/** Sends one chunk of what an approve cleared back to the rule; the server restores those rows exactly. */
export const unverifyRule = createDomainAction(
  { fallbackError: "Couldn't undo the approval. Try again." },
  async (id: string, restore: Schemas['ClearedTransaction'][]): Promise<void> => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/unverify', {
      params: { path: { id } },
      body: { transactionIds: [], restore },
    });
    if (!data) throw new Error("Couldn't undo the rule verification. Try again.");
  },
);

/** One page of the transactions a pattern matches (manually reviewed ones left out). */
export const loadRuleMatches = createDomainAction(
  { fallbackError: "Couldn't load matches. Try again." },
  async (merchantKey: string, matchType: MatchType, page: number, size: number): Promise<PagedRuleMatches> => {
    const { data } = await serverApi.POST('/api/v1/rules/preview-matches', {
      params: { query: { page, size, sort: [] } },
      body: { merchantKey, matchType },
    });
    return data as unknown as PagedRuleMatches;
  },
);

/** Starts the job that applies a rule to the given transactions, or to every match. */
export const applyRule = createDomainAction(
  { fallbackError: "Couldn't apply the rule. Try again." },
  async (id: string, body: { all: true } | { transactionIds: string[] }) => {
    const { data } = await serverApi.POST('/api/v1/rules/{id}/apply', { params: { path: { id } }, body });
    return data;
  },
);
