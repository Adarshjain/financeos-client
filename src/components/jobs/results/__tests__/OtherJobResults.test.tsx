import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { JobResponse, JobType } from '@/lib/types';

import { JobResultDetails } from '..';

function job(type: JobType, result: unknown): JobResponse {
  return {
    id: 'j1',
    type,
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: '2026-10-12T00:00:00Z',
    result,
  };
}

describe('Price refresh result', () => {
  const result = {
    refreshed: 1,
    skipped: 1,
    asOf: '2026-10-09',
    failed: [{ instrumentId: 'i3', instrumentName: 'Old Fund', reason: 'AMFI has no current NAV' }],
    refreshedItems: [{ instrumentId: 'i1', instrumentName: 'Infosys (INFY)', close: 1500, priceDate: '2026-10-09', source: 'YAHOO' }],
    skippedItems: [{ instrumentId: 'i2', instrumentName: 'TCS', reason: 'A manually entered price already exists' }],
  };

  it('summarises and lists failures open', () => {
    render(<JobResultDetails job={job('PRICE_REFRESH', result)} />);
    expect(screen.getByText(/Updated 1 price \(as of 9 Oct 26\); 1 skipped; 1 failed\./)).toBeInTheDocument();
    expect(screen.getByText('Old Fund').parentElement).toHaveTextContent('AMFI has no current NAV');
  });

  it('names skipped and updated instruments on demand', () => {
    render(<JobResultDetails job={job('PRICE_REFRESH', result)} />);
    expect(screen.queryByText('TCS')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Skipped (1)'));
    expect(screen.getByText('TCS').parentElement).toHaveTextContent('A manually entered price already exists');
    fireEvent.click(screen.getByText('Updated (1)'));
    expect(screen.getByText('Infosys (INFY)')).toBeInTheDocument();
    expect(screen.getByText(/YAHOO/)).toHaveTextContent('1,500');
  });

  it('renders a result stored before the item lists existed', () => {
    render(<JobResultDetails job={job('PRICE_REFRESH', { refreshed: 3, skipped: 0, failed: [], asOf: '2026-10-01' })} />);
    expect(screen.getByText(/Updated 3 prices/)).toBeInTheDocument();
    expect(screen.queryByText(/Updated \(/)).not.toBeInTheDocument();
  });
});

describe.each(['INVESTMENT_IMPORT_COMMIT', 'BROKER_RECONCILE_COMMIT'] as const)('%s result', (type) => {
  it('lists failed rows open and skipped rows on demand, with reasons', () => {
    render(
      <JobResultDetails
        job={job(type, {
          committed: 4,
          skipped: 1,
          failed: [{ rowIndex: 7, scrip: 'RELIANCE', reason: 'No instrument mapped' }],
          skippedItems: [{ rowIndex: 2, scrip: 'INFY', reason: 'Duplicate — already in your portfolio' }],
        })}
      />,
    );

    expect(screen.getByText('Imported 4 rows; 1 skipped; 1 failed.')).toBeInTheDocument();
    expect(screen.getByText('Row 7 · RELIANCE').parentElement).toHaveTextContent('No instrument mapped');
    expect(screen.queryByText('Row 2 · INFY')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Skipped (1)'));
    expect(screen.getByText('Row 2 · INFY').parentElement).toHaveTextContent('Duplicate — already in your portfolio');
  });

  it('shows no lists when nothing was skipped or failed', () => {
    render(<JobResultDetails job={job(type, { committed: 2, skipped: 0, failed: [], skippedItems: [] })} />);
    expect(screen.getByText('Imported 2 rows; 0 skipped; 0 failed.')).toBeInTheDocument();
    expect(screen.queryByText(/Failed \(/)).not.toBeInTheDocument();
  });
});

describe('Rule apply result', () => {
  it('names the rule, what it sets and why some were left alone', () => {
    render(
      <JobResultDetails
        job={job('RULE_APPLY', {
          appliedCount: 3,
          ruleId: 'r1',
          ruleName: 'Cab rides',
          matchType: 'STARTS_WITH',
          pattern: 'UBER',
          categories: ['Food', 'travel'],
          allMatches: true,
          requested: 6,
          skippedManuallyReviewed: 1,
          skippedNoLongerMatching: 1,
          notFound: 1,
          transactions: [{ id: 't1', date: '2026-10-02', amount: 310, type: 'DEBIT', description: 'UBER TRIP' }],
        })}
      />,
    );

    expect(screen.getByText('Applied to 3 of 6 transactions (all matching)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cab rides' })).toHaveAttribute('href', '/legacy/rules');
    expect(screen.getByText(/Starts with "UBER" → Food, travel/)).toBeInTheDocument();
    expect(
      screen.getByText("Not applied: 1 reviewed by you (left unchanged) · 1 don't match the pattern · 1 no longer exist"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByText('Transactions updated (1)'));
    expect(screen.getByText('UBER TRIP')).toBeInTheDocument();
    expect(screen.getByText('…and 2 more')).toBeInTheDocument();
  });

  it('says when the user picked the transactions', () => {
    render(<JobResultDetails job={job('RULE_APPLY', { appliedCount: 1, requested: 1, allMatches: false, ruleName: 'X', transactions: [] })} />);
    expect(screen.getByText('Applied to 1 of 1 transaction (picked by you)')).toBeInTheDocument();
    expect(screen.queryByText(/Not applied/)).not.toBeInTheDocument();
  });

  it('renders a result stored before the detail existed', () => {
    render(<JobResultDetails job={job('RULE_APPLY', { appliedCount: 5 })} />);
    expect(screen.getByText('Applied to 5 transactions')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
