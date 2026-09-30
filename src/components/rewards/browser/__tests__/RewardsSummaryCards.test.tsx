import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RewardReport, RewardSummary } from '@/lib/rewards.types';
import { formatMoney } from '@/lib/utils';

import { RewardsSummaryCards } from '../RewardsSummaryCards';

function report(summary: Partial<RewardSummary>): RewardReport {
  return {
    summary: {
      basisSpend: 10000,
      transactionCount: 2,
      matchedCount: 2,
      cashbackInr: 50,
      points: 0,
      milestonesInr: 0,
      milestonesPts: 0,
      grossValueInr: 50,
      discounts: 0,
      fees: 0,
      effectiveValueInr: 50,
      grossPct: 0.5,
      effectivePct: 0.4,
      pointsValueInr: null,
      ...summary,
    },
    rules: [],
    milestones: [],
    cycleFallback: false,
    anniversaryFallback: false,
  };
}

describe('RewardsSummaryCards gross rewards', () => {
  it('counts valued points inside the rupee total and shows their value', () => {
    render(
      <RewardsSummaryCards
        report={report({ points: 400, milestonesPts: 100, pointsValueInr: 125, grossValueInr: 175, grossPct: 1.75 })}
        loading={false}
      />,
    );
    expect(screen.getByText(formatMoney(175))).toBeInTheDocument();
    expect(screen.queryByText(/\+ 500 pts/)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`\\(pts = ${formatMoney(125).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`))).toBeInTheDocument();
    expect(screen.getByText(/1\.75% of spend/)).toBeInTheDocument();
  });

  it('keeps unvalued points beside the rupee total and labels the rate as cash', () => {
    render(<RewardsSummaryCards report={report({ points: 400, pointsValueInr: null })} loading={false} />);
    expect(screen.getByText('+ 400 pts')).toBeInTheDocument();
    expect(screen.queryByText(/pts = /)).not.toBeInTheDocument();
    expect(screen.getByText(/0\.5% cash/)).toBeInTheDocument();
  });

  it('labels the rate as of spend when there are no points', () => {
    render(<RewardsSummaryCards report={report({})} loading={false} />);
    expect(screen.queryByText(/pts/)).not.toBeInTheDocument();
    expect(screen.getByText(/0\.5% of spend/)).toBeInTheDocument();
  });
});
