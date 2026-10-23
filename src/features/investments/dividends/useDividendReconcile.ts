'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import type {
  ConfirmItem,
  ConfirmResult,
  DividendMatchCandidate,
  DividendMatchItem,
  DividendReconciliation,
} from './receiptTypes';

const MAX_SKIPPED_TOASTS = 3;

/** Where the hook reports a result. Without one it uses the Legacy toaster. */
export type Notify = (message: string, tone?: 'danger') => void;

interface UseDividendReconcileProps {
  brokerAccountId?: string;
  /** Called after any confirm so the page can refresh its list + summaries. */
  onLinked?: () => void;
  notify?: Notify;
}

/** True when the candidate implies a TDS figure and the dividend has none. */
export function canRecordTds(item: DividendMatchItem, candidate: DividendMatchCandidate | undefined): boolean {
  return candidate?.impliedTds != null && !item.dividend.tds;
}

/**
 * On-demand "receipt matching" for unmatched dividends. The server only
 * returns unresolved dividends with at least one candidate and assigns each
 * bank credit to at most one dividend, so every row is confirmable as-is.
 */
export function useDividendReconcile({ brokerAccountId, onLinked, notify }: UseDividendReconcileProps = {}) {
  const qc = useQueryClient();
  const params = brokerAccountId ? { brokerAccountId } : {};

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [tdsOverrides, setTdsOverrides] = useState<Record<string, boolean>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const query = useQuery({
    queryKey: keys.investments.dividendReconciliation(params),
    queryFn: async () =>
      (
        await api.GET('/api/v1/investments/dividends/reconciliation', {
          params: { query: params },
        })
      ).data as DividendReconciliation,
    enabled: false,
  });

  const items = useMemo<DividendMatchItem[]>(() => query.data?.items ?? [], [query.data]);

  /** dividendId -> chosen transactionId (override, else best candidate). */
  const selected = useMemo(() => {
    const map: Record<string, string> = {};
    for (const it of items) {
      const override = overrides[it.dividend.id];
      const valid = override && it.candidates.some((c) => c.transaction.id === override);
      const chosen = valid ? override : it.candidates[0]?.transaction.id;
      if (chosen) map[it.dividend.id] = chosen;
    }
    return map;
  }, [items, overrides]);

  const selectedCandidate = (item: DividendMatchItem) =>
    item.candidates.find((c) => c.transaction.id === selected[item.dividend.id]);

  const select = (dividendId: string, transactionId: string) =>
    setOverrides((prev) => ({ ...prev, [dividendId]: transactionId }));

  /** Whether "Record TDS" is offered for the row's current selection. */
  const tdsOffered = (item: DividendMatchItem) => canRecordTds(item, selectedCandidate(item));

  /** Checkbox state — defaults to checked whenever it is offered. */
  const recordTds = (item: DividendMatchItem) =>
    tdsOffered(item) && (tdsOverrides[item.dividend.id] ?? true);

  const setRecordTds = (dividendId: string, value: boolean) =>
    setTdsOverrides((prev) => ({ ...prev, [dividendId]: value }));

  const toConfirmItem = (item: DividendMatchItem): ConfirmItem | null => {
    const transactionId = selected[item.dividend.id];
    if (!transactionId) return null;
    return { dividendId: item.dividend.id, transactionId, updateTds: recordTds(item) };
  };

  const confirm = async (confirmItems: ConfirmItem[]) => {
    const { data } = await api.POST('/api/v1/investments/dividends/reconciliation/confirm', {
      body: { items: confirmItems },
    });
    const result = data as ConfirmResult;
    const skipped = result?.skipped ?? [];
    const say = (message: string, tone?: 'danger') => (notify ? notify(message, tone) : tone ? toast.error(message) : toast.success(message));
    say(`Linked ${result?.linked?.length ?? 0} of ${confirmItems.length}`);
    skipped.slice(0, MAX_SKIPPED_TOASTS).forEach((s) => say(s.reason, 'danger'));
    if (skipped.length > MAX_SKIPPED_TOASTS) {
      say(`+${skipped.length - MAX_SKIPPED_TOASTS} more`, 'danger');
    }
    await Promise.all([
      invalidateInvestmentQueries(qc),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
    ]);
    await query.refetch();
    // Picks made against the previous result must not leak into the refreshed one.
    setOverrides({});
    setTdsOverrides({});
    onLinked?.();
  };

  const reportFailure = (err: unknown, fallback: string) =>
    notify ? notify(getErrorMessage(err, fallback), 'danger') : toastError(err, fallback);

  const confirmOne = async (dividendId: string) => {
    const item = items.find((i) => i.dividend.id === dividendId);
    const body = item ? toConfirmItem(item) : null;
    if (!body) return;
    setConfirmingId(dividendId);
    try {
      await confirm([body]);
    } catch (err) {
      reportFailure(err, 'Failed to link dividend');
    } finally {
      setConfirmingId(null);
    }
  };

  const confirmAll = async () => {
    const body = items.map(toConfirmItem).filter((i): i is ConfirmItem => i !== null);
    if (body.length === 0) return;
    setConfirmingAll(true);
    try {
      await confirm(body);
    } catch (err) {
      reportFailure(err, 'Failed to link dividends');
    } finally {
      setConfirmingAll(false);
    }
  };

  return {
    loading: query.isFetching,
    fetched: query.isFetched,
    isError: query.isError,
    error: query.error,
    items,
    meta: query.data
      ? {
          coverageEnd: query.data.coverageEnd ?? null,
          unresolvedCount: query.data.unresolvedCount,
          withCandidates: query.data.withCandidates,
        }
      : null,
    selected,
    select,
    selectedCandidate,
    tdsOffered,
    recordTds,
    setRecordTds,
    confirmOne,
    confirmAll,
    confirmingId,
    confirmingAll,
    refetch: query.refetch,
  };
}
