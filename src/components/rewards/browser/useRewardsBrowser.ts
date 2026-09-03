'use client';

import { useState } from 'react';

import { useRewardLines, useRewardReport } from '@/components/rewards/queries/useRewardReportQueries';
import { Account } from '@/lib/account.types';
import { accountAnniversaryDate, RewardLine } from '@/lib/rewards.types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

import { isRangePreset, presetRange, RangePreset } from './helpers';

interface UseRewardsBrowserProps {
  accounts: Account[];
  initialAccountId: string;
  initialFrom: string;
  initialTo: string;
}

export function useRewardsBrowser({
  accounts,
  initialAccountId,
  initialFrom,
  initialTo,
}: UseRewardsBrowserProps) {
  const [accountId, setAccountId] = useState(initialAccountId);
  const [preset, setPreset] = useState<RangePreset>('THIS_ANNIVERSARY_YEAR');
  const [from, setFrom] = useState<Date>(parseCalendarDate(initialFrom));
  const [to, setTo] = useState<Date>(parseCalendarDate(initialTo));
  const [ruleFilter, setRuleFilter] = useState<string | undefined>();
  const [selectedLine, setSelectedLine] = useState<RewardLine | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const fromStr = toCalendarDate(from);
  const toStr = toCalendarDate(to);

  // Keyed by accountId+from+to, so switching the rule filter or page never
  // re-fetches the report — the same "only refetch when the range/account
  // change" behaviour the old requestSeq/reportKey bookkeeping enforced by
  // hand, now just a consequence of the query key.
  const reportQuery = useRewardReport(accountId, fromStr, toStr);
  const linesQuery = useRewardLines({
    accountId,
    from: fromStr,
    to: toStr,
    ruleId: ruleFilter,
    page,
    size: pageSize,
  });

  const report = reportQuery.data ?? null;
  const lines = linesQuery.data ?? null;
  const loading = reportQuery.isFetching || linesQuery.isFetching;

  const anniversaryFor = (id: string) =>
    accountAnniversaryDate(accounts.find((a) => a.id === id));

  const handlePresetChange = (value: string) => {
    if (!isRangePreset(value)) return;
    const next = value;
    if (next === 'CUSTOM') {
      setPreset(next);
      return;
    }
    setPreset(next);
    const range = presetRange(next, anniversaryFor(accountId));
    setFrom(range.from);
    setTo(range.to);
    setPage(0);
  };

  const handleAccountChange = (id: string) => {
    setAccountId(id);
    setRuleFilter(undefined);
    setPage(0);
    if (
      preset === 'THIS_ANNIVERSARY_YEAR' ||
      preset === 'LAST_ANNIVERSARY_YEAR'
    ) {
      const range = presetRange(preset, anniversaryFor(id));
      setFrom(range.from);
      setTo(range.to);
    }
  };

  const handleFromChange = (d: Date) => {
    setFrom(d);
    setPage(0);
  };

  const handleToChange = (d: Date) => {
    setTo(d);
    setPage(0);
  };

  const handleRuleFilterChange = (ruleId: string | undefined) => {
    setRuleFilter(ruleId);
    setPage(0);
  };

  const handlePageChange = (p: number) => setPage(p);

  const handleSizeChange = (s: number) => {
    setPageSize(s);
    setPage(0);
  };

  return {
    accountId,
    preset,
    from,
    to,
    report,
    lines,
    ruleFilter,
    selectedLine,
    setSelectedLine,
    page,
    pageSize,
    loading,
    inProgressOpen,
    setInProgressOpen,
    completedOpen,
    setCompletedOpen,
    handleAccountChange,
    handlePresetChange,
    handleFromChange,
    handleToChange,
    handleRuleFilterChange,
    handlePageChange,
    handleSizeChange,
  };
}
