'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { getRewardReport, listRewardLines } from '@/actions/rewards';
import { Account } from '@/lib/account.types';
import {
  PagedRewardLines,
  RewardLine,
  RewardReport,
} from '@/lib/rewards.types';
import { accountAnniversaryDate } from '@/lib/rewards.types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

import { presetRange, RangePreset } from './helpers';

interface UseRewardsBrowserProps {
  accounts: Account[];
  initialAccountId: string;
  initialFrom: string;
  initialTo: string;
  initialReport: RewardReport | null;
  initialLines: PagedRewardLines | null;
}

export function useRewardsBrowser({
  accounts,
  initialAccountId,
  initialFrom,
  initialTo,
  initialReport,
  initialLines,
}: UseRewardsBrowserProps) {
  const [accountId, setAccountId] = useState(initialAccountId);
  const [preset, setPreset] = useState<RangePreset>('THIS_ANNIVERSARY_YEAR');
  const [from, setFrom] = useState<Date>(parseCalendarDate(initialFrom));
  const [to, setTo] = useState<Date>(parseCalendarDate(initialTo));
  const [report, setReport] = useState<RewardReport | null>(initialReport);
  const [lines, setLines] = useState<PagedRewardLines | null>(initialLines);
  const [ruleFilter, setRuleFilter] = useState<string | undefined>();
  const [selectedLine, setSelectedLine] = useState<RewardLine | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialLines?.size ?? 25);
  const [loading, setLoading] = useState(false);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);

  const requestSeq = useRef(0);
  const reportKey = useRef(`${initialAccountId}|${initialFrom}|${initialTo}`);

  const fetchAll = useCallback(async () => {
    if (!accountId) return;
    const seq = ++requestSeq.current;
    const fromStr = toCalendarDate(from);
    const toStr = toCalendarDate(to);
    const key = `${accountId}|${fromStr}|${toStr}`;
    const needReport = key !== reportKey.current;

    const [linesRes, reportRes] = await Promise.all([
      listRewardLines({
        accountId,
        from: fromStr,
        to: toStr,
        ruleId: ruleFilter,
        page,
        size: pageSize,
      }),
      needReport ? getRewardReport(accountId, fromStr, toStr) : Promise.resolve(null),
    ]);
    if (seq !== requestSeq.current) return;
    if (reportRes) {
      if (reportRes.success) {
        setReport(reportRes.data);
        reportKey.current = key;
      } else {
        setReport(null);
        setRuleFilter(undefined);
        toast.error(reportRes.error.message);
      }
    }
    if (linesRes.success) {
      setLines(linesRes.data);
    } else {
      toast.error(linesRes.error.message);
    }
    setLoading(false);
  }, [accountId, from, to, ruleFilter, page, pageSize]);

  const isFirstRun = useRef(true);
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const withSpinner = (mutate: () => void) => {
    setLoading(true);
    mutate();
  };

  const anniversaryFor = (id: string) =>
    accountAnniversaryDate(accounts.find((a) => a.id === id));

  const handlePresetChange = (value: string) => {
    const next = value as RangePreset;
    if (next === 'CUSTOM') {
      setPreset(next);
      return;
    }
    withSpinner(() => {
      setPreset(next);
      const range = presetRange(next, anniversaryFor(accountId));
      setFrom(range.from);
      setTo(range.to);
      setPage(0);
    });
  };

  const handleAccountChange = (id: string) => {
    withSpinner(() => {
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
    });
  };

  const handleFromChange = (d: Date) => {
    withSpinner(() => {
      setFrom(d);
      setPage(0);
    });
  };

  const handleToChange = (d: Date) => {
    withSpinner(() => {
      setTo(d);
      setPage(0);
    });
  };

  const handleRuleFilterChange = (ruleId: string | undefined) => {
    withSpinner(() => {
      setRuleFilter(ruleId);
      setPage(0);
    });
  };

  const handlePageChange = (p: number) => {
    withSpinner(() => setPage(p));
  };

  const handleSizeChange = (s: number) => {
    withSpinner(() => {
      setPageSize(s);
      setPage(0);
    });
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
