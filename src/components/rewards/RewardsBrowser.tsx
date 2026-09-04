'use client';

import { useMemo } from 'react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Card } from '@/components/ui/card';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

import { MilestoneSections } from './browser/MilestoneSections';
import { RewardLineDetailDialog } from './browser/RewardLineDetailDialog';
import { RewardLinesTable } from './browser/RewardLinesTable';
import { RewardsBrowserFilterBar } from './browser/RewardsBrowserFilterBar';
import { RewardsSummaryCards } from './browser/RewardsSummaryCards';
import { RuleBreakdownGrid } from './browser/RuleBreakdownGrid';
import { useRewardsBrowser } from './browser/useRewardsBrowser';

interface RewardsBrowserProps {
  initialAccountId: string;
  initialFrom: string;
  initialTo: string;
}

export default function RewardsBrowser({
  initialAccountId,
  initialFrom,
  initialTo,
}: RewardsBrowserProps) {
  const { data: rawAccounts = [] } = useAccounts();
  const accounts = useMemo(() => rewardEligibleAccounts(rawAccounts), [rawAccounts]);

  const {
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
  } = useRewardsBrowser({
    accounts,
    initialAccountId,
    initialFrom,
    initialTo,
  });

  const milestones = report?.milestones ?? [];

  const renderActionBar = (isMobile = false) => (
    <RewardsBrowserFilterBar
      accounts={accounts}
      accountId={accountId}
      onAccountChange={handleAccountChange}
      preset={preset}
      onPresetChange={handlePresetChange}
      from={from}
      onFromChange={handleFromChange}
      to={to}
      onToChange={handleToChange}
      ruleFilter={ruleFilter}
      onRuleFilterChange={handleRuleFilterChange}
      report={report}
      loading={loading}
      isMobile={isMobile}
      lines={lines}
      onPageChange={handlePageChange}
      onSizeChange={handleSizeChange}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop Filter / Action Bar */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      {/* Mobile: filters live in the bottom PageActionBar */}
      <PageActionBar>{renderActionBar(true)}</PageActionBar>

      {/* Summary and By-Card breakdown */}
      <RewardsSummaryCards report={report} loading={loading} />

      {/* Milestones — open by default; completed ones collapsed */}
      <MilestoneSections
        milestones={milestones}
        loading={loading}
        inProgressOpen={inProgressOpen}
        setInProgressOpen={setInProgressOpen}
        completedOpen={completedOpen}
        setCompletedOpen={setCompletedOpen}
      />

      {/* Per-rule cards */}
      <RuleBreakdownGrid
        report={report}
        ruleFilter={ruleFilter}
        onSelectRule={handleRuleFilterChange}
        loading={loading}
      />

      {/* Drill-down lines */}
      <RewardLinesTable
        lines={lines}
        loading={loading}
        onSelectLine={setSelectedLine}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onSizeChange={handleSizeChange}
      />

      {/* Reward line → source transaction detail dialog */}
      <RewardLineDetailDialog
        selectedLine={selectedLine}
        onClose={() => setSelectedLine(null)}
      />
    </div>
  );
}
