import { describe, expect, it } from 'vitest';

import type { CategoryRule } from '@/lib/rules.types';

import {
  clampedRulesUrl,
  DEFAULT_RULES_STATE,
  hasRuleFilters,
  matchPlastic,
  parseRulesUrl,
  ruleLinkLabel,
  ruleMatchLine,
  rulesFilterKey,
  rulesRequest,
  rulesUrl,
  verifiedParam,
} from './rulesModel';

const rule = (over: Partial<CategoryRule> = {}): CategoryRule => ({
  id: 'r1',
  merchantKey: 'DUNZO DAILY',
  matchType: 'CONTAINS',
  displayName: 'Dunzo',
  categories: [],
  verified: false,
  source: 'LLM',
  appliedCount: 4,
  lastAppliedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

describe('rules address', () => {
  it('opens on Unverified with the first page of 25', () => {
    expect(parseRulesUrl({})).toEqual(DEFAULT_RULES_STATE);
    expect(DEFAULT_RULES_STATE.status).toBe('unverified');
    expect(rulesUrl(DEFAULT_RULES_STATE)).toBe('?');
  });

  it('reads and writes every filter, leaving defaults out', () => {
    const state = parseRulesUrl({ q: ' swig ', status: 'all', source: 'USER', match: 'REGEX', category: 'c1', page: '3', size: '50' });
    expect(state).toEqual({ q: 'swig', status: 'all', source: 'USER', matchType: 'REGEX', categoryId: 'c1', page: 2, size: 50 });
    expect(rulesUrl(state)).toBe('?q=swig&status=all&source=USER&match=REGEX&category=c1&page=3&size=50');
    expect(parseRulesUrl(Object.fromEntries(new URLSearchParams(rulesUrl(state).slice(1))))).toEqual(state);
  });

  it('falls back to the defaults for anything invalid', () => {
    expect(parseRulesUrl({ status: 'bogus', source: 'x', match: 'nope', page: '-3', size: '7' })).toEqual(DEFAULT_RULES_STATE);
  });

  it('the filter key ignores the page and size but not the filters', () => {
    const a = { ...DEFAULT_RULES_STATE, page: 3, size: 100 };
    expect(rulesFilterKey(a)).toBe(rulesFilterKey(DEFAULT_RULES_STATE));
    expect(rulesFilterKey({ ...a, status: 'verified' })).not.toBe(rulesFilterKey(a));
  });

  it('sends the server only the filters that are set', () => {
    expect(verifiedParam('unverified')).toBe(false);
    expect(verifiedParam('verified')).toBe(true);
    expect(verifiedParam('all')).toBeUndefined();
    expect(rulesRequest({ ...DEFAULT_RULES_STATE, q: 'a', matchType: 'EXACT', categoryId: 'c1' }, 'verified')).toEqual({
      verified: true,
      search: 'a',
      source: undefined,
      matchType: 'EXACT',
      categoryId: 'c1',
    });
  });

  it('moves a page past the last one back to the last', () => {
    const state = { ...DEFAULT_RULES_STATE, page: 4 };
    expect(clampedRulesUrl(state, { content: [], totalPages: 2 })).toBe('?page=2');
    expect(clampedRulesUrl(state, { content: [1], totalPages: 5 })).toBeNull();
    expect(clampedRulesUrl(state, { content: [], totalPages: 0 })).toBeNull();
  });

  it('tells a narrowed list from the status alone', () => {
    expect(hasRuleFilters({ ...DEFAULT_RULES_STATE, status: 'all' })).toBe(false);
    expect(hasRuleFilters({ ...DEFAULT_RULES_STATE, q: 'x' })).toBe(true);
    expect(hasRuleFilters({ ...DEFAULT_RULES_STATE, categoryId: 'c1' })).toBe(true);
  });
});

describe('rule words', () => {
  it('names the match line, and leaves it out for a plain smart-contains rule with no name', () => {
    expect(ruleMatchLine(rule())).toEqual({ matchType: 'Contains', pattern: 'DUNZO DAILY' });
    expect(ruleMatchLine(rule({ matchType: 'MERCHANT_KEY', displayName: 'Dunzo' })).matchType).toBe('Smart contains');
    expect(ruleMatchLine(rule({ matchType: 'MERCHANT_KEY', displayName: null }))).toEqual({ matchType: '', pattern: undefined });
  });

  it('says which rule a matched transaction follows', () => {
    expect(ruleLinkLabel({ appliedRuleId: null, appliedRuleName: null })).toBe('not linked to a rule');
    expect(ruleLinkLabel({ appliedRuleId: 'r1', appliedRuleName: 'Dunzo' }, 'r1')).toBe('already this rule');
    expect(ruleLinkLabel({ appliedRuleId: 'r2', appliedRuleName: 'Swiggy' }, 'r1')).toBe('rule: Swiggy');
    expect(ruleLinkLabel({ appliedRuleId: 'r2', appliedRuleName: null })).toBe('another rule');
  });

  it('writes a card as ••last4', () => {
    expect(matchPlastic({ cardLast4: '7741' })).toBe('••7741');
    expect(matchPlastic({ cardLast4: null })).toBeNull();
  });
});
