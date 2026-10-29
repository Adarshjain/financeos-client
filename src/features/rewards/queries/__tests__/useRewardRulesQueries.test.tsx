import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as actions from '@/features/rewards/actions';
import type { RewardRule } from '@/lib/rewards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  useCreateRewardRule,
  useDeleteRewardRule,
  useReorderRewardRules,
  useRewardRules,
  useUpdateRewardRule,
} from '../useRewardRulesQueries';

vi.mock('@/features/rewards/actions', () => ({
  loadRewardRules: vi.fn(),
  createRewardRule: vi.fn(),
  updateRewardRule: vi.fn(),
  deleteRewardRule: vi.fn(),
  reorderRewardRules: vi.fn(),
}));

const mocked = vi.mocked(actions);
const ok = (data: unknown) => ({ success: true, data }) as never;

const rule: RewardRule = {
  id: 'rule-1',
  accountId: 'acc-1',
  name: '5% dining',
  priority: 1,
  stacking: 'EXCLUSIVE',
  accrualType: 'PERCENT',
  percentRate: 5,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function Harness({ accountId }: { accountId: string }) {
  const rulesQuery = useRewardRules(accountId);
  const create = useCreateRewardRule();
  const update = useUpdateRewardRule();
  const del = useDeleteRewardRule();
  const reorder = useReorderRewardRules();

  return (
    <div>
      <div data-testid="count">{rulesQuery.data?.length ?? 0}</div>
      <button
        onClick={() =>
          create.mutate({ accountId, name: 'New rule', priority: 2, accrualType: 'PERCENT', percentRate: 1 })
        }
      >
        create
      </button>
      <button
        onClick={() =>
          update.mutate({
            id: 'rule-1',
            body: { name: '5% dining', priority: 1, accrualType: 'PERCENT', percentRate: 5, activeTo: '2026-06-01' },
          })
        }
      >
        update
      </button>
      <button onClick={() => del.mutate('rule-1')}>delete</button>
      <button onClick={() => reorder.mutate({ accountId, orderedIds: ['rule-2', 'rule-1'] })}>reorder</button>
    </div>
  );
}

describe('useRewardRulesQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches rules scoped to the account', async () => {
    mocked.loadRewardRules.mockResolvedValue(ok([rule]));

    renderWithQuery(<Harness accountId="acc-1" />);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(mocked.loadRewardRules).toHaveBeenCalledWith('acc-1');
  });

  it('creates a rule and refetches the list on success', async () => {
    mocked.loadRewardRules.mockResolvedValueOnce(ok([]));
    mocked.createRewardRule.mockResolvedValue(ok({ ...rule, id: 'rule-new' }));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    mocked.loadRewardRules.mockResolvedValue(ok([rule]));
    fireEvent.click(screen.getByText('create'));

    await waitFor(() => {
      expect(mocked.createRewardRule).toHaveBeenCalledWith(expect.objectContaining({ name: 'New rule' }));
    });
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
  });

  it('updates a rule by id', async () => {
    mocked.loadRewardRules.mockResolvedValue(ok([rule]));
    mocked.updateRewardRule.mockResolvedValue(ok({ ...rule, activeTo: '2026-06-01' }));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(mocked.updateRewardRule).toHaveBeenCalledWith('rule-1', expect.objectContaining({ activeTo: '2026-06-01' }));
    });
  });

  it('deletes a rule by id', async () => {
    mocked.loadRewardRules.mockResolvedValue(ok([rule]));
    mocked.deleteRewardRule.mockResolvedValue(ok(undefined));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      expect(mocked.deleteRewardRule).toHaveBeenCalledWith('rule-1');
    });
  });

  it('reorders rules through the reorder action', async () => {
    mocked.loadRewardRules.mockResolvedValue(ok([rule]));
    mocked.reorderRewardRules.mockResolvedValue(ok([rule]));

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('reorder'));

    await waitFor(() => {
      expect(mocked.reorderRewardRules).toHaveBeenCalledWith({ accountId: 'acc-1', orderedIds: ['rule-2', 'rule-1'] });
    });
  });
});
