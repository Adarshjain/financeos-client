import { render, screen } from '@testing-library/react';
import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn().mockResolvedValue({ data: [{ id: 'c1', name: 'Atlas', type: 'credit_card' }] }), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

import { renderWithQuery } from '@/test/renderWithQuery';

import { CARDS_SPENDING_BUILTINS } from '../group.cardsSpending';
import { widget } from '../testFixtures';

const COMPONENTS = ['attention', 'bills_due', 'card_utilisation', 'account_tile', 'emergency_fund'];
const TEMPLATES = ['net_worth', 'upcoming', 'milestone_progress', 'cap_headroom', 'rewards_earned'];

describe('CARDS_SPENDING_BUILTINS', () => {
  it('has every key of the group, each with a loading skeleton', () => {
    expect(Object.keys(CARDS_SPENDING_BUILTINS).sort()).toEqual([...COMPONENTS, ...TEMPLATES, 'spend_heatmap'].sort());
    for (const entry of Object.values(CARDS_SPENDING_BUILTINS)) expect(entry.Skeleton).toBeTypeOf('function');
  });

  it('component built-ins have a Body, template built-ins a View, never both', () => {
    for (const key of COMPONENTS) {
      expect(CARDS_SPENDING_BUILTINS[key].Body, key).toBeTypeOf('function');
      expect(CARDS_SPENDING_BUILTINS[key].View, key).toBeUndefined();
    }
    for (const key of TEMPLATES) {
      expect(CARDS_SPENDING_BUILTINS[key].View, key).toBeTypeOf('function');
      expect(CARDS_SPENDING_BUILTINS[key].Body, key).toBeUndefined();
    }
  });

  it('spend_heatmap is a template view (the Chart heatmap) with its subtitle and skeleton', () => {
    const entry = CARDS_SPENDING_BUILTINS.spend_heatmap;
    expect(entry.Body).toBeUndefined();
    expect(entry.View).toBeTypeOf('function');
    expect(entry.subtitle?.(widget('spend_heatmap', { months: 3 }))).toBe('Last 3 months');
    expect(entry.subtitle?.(widget('spend_heatmap'))).toBe('Last 6 months');
    expect(entry.subtitle?.(widget('spend_heatmap', { months: 1 }))).toBe('Last 1 month');
  });

  it('static and param-aware subtitles', () => {
    const sub = (key: string, params: Record<string, unknown> = {}) => CARDS_SPENDING_BUILTINS[key].subtitle?.(widget(key, params));
    expect(sub('net_worth')).toBe('All accounts');
    expect(isValidElement(sub('attention'))).toBe(true); // the live counts, see AttentionSubtitle
    expect(sub('upcoming', { days: 14 })).toBe('Next 14 days');
    expect(sub('upcoming', { days: 1 })).toBe('Next 1 day');
    expect(sub('upcoming')).toBeNull();
    expect(sub('bills_due')).toBe('All cards');
    expect(sub('card_utilisation')).toBe('All cards');
    expect(sub('milestone_progress')).toBeNull();
    expect(sub('cap_headroom')).toBeNull();
    expect(sub('account_tile')).toBeNull();
    expect(CARDS_SPENDING_BUILTINS.rewards_earned.subtitle).toBeUndefined();
    expect(CARDS_SPENDING_BUILTINS.emergency_fund.subtitle).toBeUndefined();
  });

  it('a picked card shows its name once the accounts load ("One card" until then)', async () => {
    const line = CARDS_SPENDING_BUILTINS.bills_due.subtitle?.(widget('bills_due', { accountId: 'c1' }));
    expect(isValidElement(line)).toBe(true);
    renderWithQuery(<>{line}</>);
    expect(screen.getByText('One card')).toBeInTheDocument();
    expect(await screen.findByText('Atlas')).toBeInTheDocument();
  });

  it('an account tile\'s subtitle is the account type', async () => {
    const line = CARDS_SPENDING_BUILTINS.account_tile.subtitle?.(widget('account_tile', { accountId: 'c1' }));
    renderWithQuery(<>{line}</>);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(await screen.findByText('Credit card')).toBeInTheDocument();
  });

  it('every skeleton renders on its own', () => {
    for (const [key, entry] of Object.entries(CARDS_SPENDING_BUILTINS)) {
      const Skeleton = entry.Skeleton;
      const { container, unmount } = render(<Skeleton />);
      expect(container.firstChild, key).not.toBeNull();
      unmount();
    }
  });
});
