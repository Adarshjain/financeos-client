import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api/client';
import type { RewardRule } from '@/lib/rewards.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import {
  useCreateRewardRule,
  useDeleteRewardRule,
  useReorderRewardRules,
  useRewardRules,
  useUpdateRewardRule,
} from '../useRewardRulesQueries';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

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
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });

    renderWithQuery(<Harness accountId="acc-1" />);

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(api.GET).toHaveBeenCalledWith(
      '/api/v1/reward-rules',
      expect.objectContaining({ params: { query: { accountId: 'acc-1' } } })
    );
  });

  it('creates a rule and refetches the list on success', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] });
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { ...rule, id: 'rule-new' } });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });
    fireEvent.click(screen.getByText('create'));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/reward-rules',
        expect.objectContaining({ body: expect.objectContaining({ name: 'New rule' }) })
      );
    });
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
  });

  it('updates a rule by id, allowing an explicit null-clearing field through the request-body mapping', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });
    (api.PUT as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { ...rule, activeTo: '2026-06-01' } });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('update'));

    await waitFor(() => {
      expect(api.PUT).toHaveBeenCalledWith(
        '/api/v1/reward-rules/{id}',
        expect.objectContaining({
          params: { path: { id: 'rule-1' } },
          body: expect.objectContaining({ activeTo: '2026-06-01' }),
        })
      );
    });
  });

  it('deletes a rule by id', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });
    (api.DELETE as ReturnType<typeof vi.fn>).mockResolvedValue({ data: undefined });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('delete'));

    await waitFor(() => {
      expect(api.DELETE).toHaveBeenCalledWith(
        '/api/v1/reward-rules/{id}',
        expect.objectContaining({ params: { path: { id: 'rule-1' } } })
      );
    });
  });

  it('reorders rules via the dedicated reorder endpoint', async () => {
    (api.GET as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });
    (api.POST as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [rule] });

    renderWithQuery(<Harness accountId="acc-1" />);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('reorder'));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith(
        '/api/v1/reward-rules/reorder',
        expect.objectContaining({ body: { accountId: 'acc-1', orderedIds: ['rule-2', 'rule-1'] } })
      );
    });
  });
});
