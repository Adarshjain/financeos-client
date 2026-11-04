import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ show: vi.fn(() => 'toast'), set: vi.fn(), rule: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: mocks.show, dismissToast: vi.fn() }));
vi.mock('../transactionActions', () => ({ setTransactionCategory: mocks.set }));
vi.mock('../rules/ruleActions', () => ({ createRule: mocks.rule }));

import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

import { useSetCategory } from './useSetCategory';

const previous = (source: string | null) => ({ success: true, data: { previous: { categoryKey: null, subcategoryKey: null, source } } });
const pick = { categoryKey: 'food', subcategoryKey: null };
const txn = { id: 't1', description: 'Swiggy order', sourcedDescription: 'UPI/SWIGGY' };

const run = async (source: string | null) => {
  mocks.set.mockResolvedValue(previous(source));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSetCategory(CATEGORY_LIST_FIXTURE), { wrapper });
  await result.current.setCategory(txn, pick);
  return mocks.show.mock.calls[0] as unknown as [string, { action: { label: string; onSelect: () => void }; secondaryAction?: { label: string } }];
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rule.mockResolvedValue({ success: true, data: { id: 'r1' } });
});

describe('useSetCategory rule offer', () => {
  it.each(['RULE', 'AUTO'])('offers a rule when %s had set the category before', async (source) => {
    const [, opts] = await run(source);
    expect(opts.action.label).toBe('Do the same next time for ‘SWIGGY ORDER’?');
    expect(opts.secondaryAction?.label).toBe('Undo');
  });

  it.each(['USER', null, 'LINK'])('offers none when the previous source is %s', async (source) => {
    const [, opts] = await run(source);
    expect(opts.action.label).toBe('Undo');
    expect(opts.secondaryAction).toBeUndefined();
  });

  it('Yes creates a contains rule and says Rule saved', async () => {
    const [, opts] = await run('RULE');
    opts.action.onSelect();
    await vi.waitFor(() =>
      expect(mocks.rule).toHaveBeenCalledWith({ merchantKey: 'SWIGGY ORDER', matchType: 'CONTAINS', categoryKey: 'food', subcategoryKey: null }),
    );
    await vi.waitFor(() => expect(mocks.show).toHaveBeenLastCalledWith('Rule saved'));
  });
});
