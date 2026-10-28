import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { JobResponse } from '@/lib/types';
import { pinClock } from '@/test/pinClock';

import { JobResultBody } from './JobResultBody';

pinClock();

const body = (type: JobResponse['type'], result: unknown) =>
  render(<JobResultBody job={{ id: 'j', type, status: 'SUCCEEDED', result } as unknown as JobResponse} />);

describe('statement ingest result', () => {
  const result = {
    filesProcessed: 2,
    totalCreated: 8,
    totalDuplicatesFound: 2,
    duplicatesTruncated: 3,
    duplicateDetails: [
      { date: '2026-10-11', amount: 1249, description: 'SWIGGY', filename: 'a.pdf', transactionId: 't1' },
    ],
    fileDetails: [
      { filename: 'a.pdf', status: 'SUCCESS', linesParsed: 8, errorMessage: null, warning: 'Opening balance does not match', created: 8, duplicates: 2 },
      { filename: 'b.pdf', status: 'FAILED', linesParsed: 0, errorMessage: 'Could not read file', created: 0, duplicates: 0 },
    ],
  };

  it('shows the counters, the duplicates banner and the warned files', () => {
    body('STATEMENT_INGEST', result);
    expect(screen.getByText('Statement extraction summary')).toBeInTheDocument();
    expect(screen.getAllByTestId('sync-counter').map((c) => c.getAttribute('data-label'))).toEqual(['Files', 'Created', 'Duplicates']);
    expect(screen.getByText(/We found 2 duplicate transaction/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Transactions page' })).toHaveAttribute('href', '/transactions');
    expect(screen.getByText('Check this statement')).toBeInTheDocument();
    expect(screen.getByText('Opening balance does not match', { selector: 'span' })).toBeInTheDocument();
  });

  it('opens duplicate items with the truncation note and file details with each file outcome', () => {
    body('STATEMENT_INGEST', result);
    expect(screen.queryByText('SWIGGY')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Duplicate items \(1\)/ }));
    expect(screen.getByText('SWIGGY')).toBeInTheDocument();
    expect(screen.getByText('…and 3 more')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /File details \(2\)/ }));
    expect(screen.getByText('Could not read file')).toBeInTheDocument();
    expect(screen.getAllByText('FAILED').length).toBeGreaterThan(0);
  });

  it('has no duplicates banner or sections when there are none', () => {
    body('STATEMENT_INGEST', { filesProcessed: 1, totalCreated: 3, totalDuplicatesFound: 0, fileDetails: [] });
    expect(screen.queryByText(/duplicate transaction/)).toBeNull();
    expect(screen.queryByTestId('result-section')).toBeNull();
  });
});

describe('price refresh result', () => {
  const result = {
    refreshed: 2,
    skipped: 1,
    asOf: '2026-10-20',
    failed: [{ instrumentId: 'i3', instrumentName: 'Infy', reason: 'No quote' }],
    skippedItems: [{ instrumentId: 'i2', instrumentName: 'HDFC MF', reason: 'Closed' }],
    refreshedItems: [{ instrumentId: 'i1', instrumentName: 'TCS', close: 3500, priceDate: '2026-10-20', source: 'NSE' }],
  };

  it('counts, with failed open by default and skipped and updated closed', () => {
    body('PRICE_REFRESH', result);
    expect(screen.getByText(/Updated 2 prices \(as of 20 Oct\); 1 skipped; 1 failed\./)).toBeInTheDocument();
    expect(screen.getByText('No quote', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('Closed', { exact: false })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Skipped \(1\)/ }));
    expect(screen.getByText('Closed', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Updated \(1\)/ }));
    expect(screen.getByText('TCS')).toBeInTheDocument();
    expect(screen.getByText('NSE')).toBeInTheDocument();
  });

  it('handles a result stored before the per-instrument detail', () => {
    body('PRICE_REFRESH', { refreshed: 1, skipped: 0, failed: [], asOf: '2026-10-20' });
    expect(screen.getByText(/Updated 1 price \(as of/)).toBeInTheDocument();
    expect(screen.queryByTestId('result-section')).toBeNull();
  });
});

describe('import and reconcile commit result', () => {
  const result = {
    committed: 1,
    skipped: 1,
    failed: [{ rowIndex: 4, scrip: 'INFY', reason: 'Bad date' }],
    skippedItems: [{ rowIndex: 7, scrip: null, reason: 'Duplicate' }],
  };

  it.each(['INVESTMENT_IMPORT_COMMIT', 'BROKER_RECONCILE_COMMIT'] as const)('%s shows counts, failed rows open and skipped rows on demand', (type) => {
    body(type, result);
    expect(screen.getByText('Imported 1 row; 1 skipped; 1 failed.')).toBeInTheDocument();
    expect(screen.getByText('Row 4 · INFY')).toBeInTheDocument();
    expect(screen.getByText('Bad date', { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Skipped \(1\)/ }));
    expect(screen.getByText('Row 7')).toBeInTheDocument();
  });
});

describe('rule apply result', () => {
  it('shows the rule, what it matched, why the rest were left, and the transactions', () => {
    body('RULE_APPLY', {
      appliedCount: 5,
      requested: 6,
      allMatches: true,
      ruleName: 'Swiggy',
      matchType: 'CONTAINS',
      pattern: 'SWIGGY',
      categories: ['Food & dining'],
      skippedManuallyReviewed: 1,
      transactions: [
        { id: 't1', date: '2026-10-11', amount: 1249, type: 'DEBIT', description: 'SWIGGY BANGALORE' },
        { id: 't2', date: '2026-10-12', amount: 100, type: 'CREDIT', description: 'REFUND' },
      ],
    });
    expect(screen.getByText(/Applied to 5 of 6 transactions \(all matching\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Swiggy' })).toHaveAttribute('href', '/rules');
    expect(screen.getByText(/Contains "SWIGGY" → Food & dining/)).toBeInTheDocument();
    expect(screen.getByText('Not applied: 1 reviewed by you (left unchanged)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Transactions updated \(2\)/ }));
    expect(screen.getByText('SWIGGY BANGALORE')).toBeInTheDocument();
    expect(screen.getByText('…and 3 more')).toBeInTheDocument();
  });

  it('reads a result stored with only the count', () => {
    body('RULE_APPLY', { appliedCount: 1 });
    expect(screen.getByText('Applied to 1 transaction')).toBeInTheDocument();
    expect(screen.queryByTestId('result-section')).toBeNull();
  });
});

describe('other results', () => {
  it('Gmail sync uses the Gmail sync summary', () => {
    body('GMAIL_SYNC', { created: 1, reconciled: 0, skipped: 0, fetched: 1, failed: 0 });
    expect(screen.getByTestId('gmail-sync-result')).toBeInTheDocument();
  });
  it('an unknown shape shows its scalar fields', () => {
    body('GMAIL_SYNC' as never, null);
    expect(screen.queryByTestId('gmail-sync-result')).toBeNull();
    render(<JobResultBody job={{ id: 'j', type: 'OTHER' as never, status: 'SUCCEEDED', result: { a: 1, b: 'x', c: { d: 1 } } } as unknown as JobResponse} />);
    expect(screen.getByTestId('generic-result')).toHaveTextContent('a: 1');
    expect(screen.getByTestId('generic-result')).toHaveTextContent('b: x');
  });
});
