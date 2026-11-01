import { describe, expect, it } from 'vitest';

import type { CategoryRule } from '@/lib/rules.types';

import {
  clampedRulesUrl,
  DEFAULT_RULES_STATE,
  hasRuleFilters,
  matchPlastic,
  parseRulesUrl,
  ruleCategoryLabel,
  ruleLinkLabel,
  ruleMatchLine,
  rulesFilterKey,
  rulesRequest,
  rulesUrl,
} from './rulesModel';

const rule = (over: Partial<CategoryRule> = {}): CategoryRule => ({
  id: 'r1',
  merchantKey: 'DUNZO DAILY',
  matchType: 'CONTAINS',
  displayName: 'Dunzo',
  category: { key: 'food', name: 'Food', icon: 'cat-fork-knife' },
  subcategory: { key: 'food.delivery', name: 'Delivery' },
  appliedCount: 4,
  lastAppliedAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

describe('rules address', () => {
  it('opens on the first page of 25 with no filter', () => {
    expect(parseRulesUrl({})).toEqual(DEFAULT_RULES_STATE);
    expect(rulesUrl(DEFAULT_RULES_STATE)).toBe('?');
  });

  it('reads and writes every filter, leaving defaults out', () => {
    const state = parseRulesUrl({ q: ' swig ', match: 'REGEX', category: 'food', page: '3', size: '50' });
    expect(state).toEqual({ q: 'swig', matchType: 'REGEX', categoryKey: 'food', page: 2, size: 50 });
    expect(rulesUrl(state)).toBe('?q=swig&match=REGEX&category=food&page=3&size=50');
    expect(parseRulesUrl(Object.fromEntries(new URLSearchParams(rulesUrl(state).slice(1))))).toEqual(state);
  });

  it('falls back to the defaults for anything invalid', () => {
    expect(parseRulesUrl({ match: 'MERCHANT_KEY', page: '-3', size: '7' })).toEqual(DEFAULT_RULES_STATE);
  });

  it('the filter key ignores the page and size but not the filters', () => {
    const a = { ...DEFAULT_RULES_STATE, page: 3, size: 100 };
    expect(rulesFilterKey(a)).toBe(rulesFilterKey(DEFAULT_RULES_STATE));
    expect(rulesFilterKey({ ...a, categoryKey: 'food' })).not.toBe(rulesFilterKey(a));
  });

  it('sends the server only the filters that are set', () => {
    expect(rulesRequest(DEFAULT_RULES_STATE)).toEqual({ search: undefined, matchType: undefined, categoryKey: undefined });
    expect(rulesRequest({ ...DEFAULT_RULES_STATE, q: 'a', matchType: 'EXACT', categoryKey: 'food' })).toEqual({
      search: 'a',
      matchType: 'EXACT',
      categoryKey: 'food',
    });
  });

  it('moves a page past the last one back to the last', () => {
    const state = { ...DEFAULT_RULES_STATE, page: 4 };
    expect(clampedRulesUrl(state, { content: [], totalPages: 2 })).toBe('?page=2');
    expect(clampedRulesUrl(state, { content: [1], totalPages: 5 })).toBeNull();
    expect(clampedRulesUrl(state, { content: [], totalPages: 0 })).toBeNull();
  });

  it('tells a narrowed list from an open one', () => {
    expect(hasRuleFilters(DEFAULT_RULES_STATE)).toBe(false);
    expect(hasRuleFilters({ ...DEFAULT_RULES_STATE, q: 'x' })).toBe(true);
    expect(hasRuleFilters({ ...DEFAULT_RULES_STATE, categoryKey: 'food' })).toBe(true);
  });
});

describe('rule words', () => {
  it('names the match line, and leaves it out for a plain contains rule with no name', () => {
    expect(ruleMatchLine(rule())).toEqual({ matchType: 'Contains', pattern: 'DUNZO DAILY' });
    expect(ruleMatchLine(rule({ matchType: 'STARTS_WITH', displayName: 'Dunzo' })).matchType).toBe('Starts with');
    expect(ruleMatchLine(rule({ matchType: 'CONTAINS', displayName: null }))).toEqual({ matchType: '', pattern: undefined });
  });

  it('writes the category a rule sets as Category · Sub, or the category alone', () => {
    expect(ruleCategoryLabel(rule())).toBe('Food · Delivery');
    expect(ruleCategoryLabel(rule({ subcategory: null }))).toBe('Food');
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
