import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { FileIngestionResult } from '@/lib/types';

import { IngestionResultDetails } from '../IngestionResultDetails';

describe('IngestionResultDetails Component', () => {
  it('renders old result shape without crashing or showing detail section', () => {
    const oldResult: FileIngestionResult = {
      filesProcessed: 1,
      totalCreated: 5,
      totalDuplicatesFound: 0,
      fileDetails: [
        {
          filename: 'statement.pdf',
          status: 'SUCCESS',
          linesParsed: 5,
          errorMessage: null,
        },
      ],
    };

    render(<IngestionResultDetails result={oldResult} />);
    expect(screen.getByText('Statement Extraction Summary')).toBeInTheDocument();
    
    // Expand file details
    fireEvent.click(screen.getByText(/File Details/i));
    expect(screen.getAllByText('statement.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SUCCESS').length).toBeGreaterThan(0);
    expect(screen.queryByText('Duplicates Detected')).not.toBeInTheDocument();
  });

  it('renders new result shape with status badge variants, warnings, errors, and duplicate details', () => {
    const newResult: FileIngestionResult = {
      filesProcessed: 3,
      totalCreated: 10,
      totalDuplicatesFound: 2,
      fileDetails: [
        {
          filename: 'success_stmt.pdf',
          status: 'SUCCESS',
          linesParsed: 10,
          errorMessage: null,
          warning: 'Warning: statement account number does not match this account',
          created: 10,
          duplicates: 1,
        },
        {
          filename: 'skipped_stmt.pdf',
          status: 'SKIPPED',
          linesParsed: 0,
          errorMessage: 'Statement already ingested',
          created: 0,
          duplicates: 0,
        },
        {
          filename: 'failed_stmt.pdf',
          status: 'FAILED',
          linesParsed: 0,
          errorMessage: 'File is empty',
          created: 0,
          duplicates: 0,
        },
      ],
      duplicateDetails: [
        {
          date: '2026-08-01',
          amount: 500,
          description: 'Uber Ride',
          filename: 'success_stmt.pdf',
          transactionId: 'tx-1',
          matchedTransactionId: 'tx-db-1',
        },
      ],
      duplicatesTruncated: 1,
    };

    render(<IngestionResultDetails result={newResult} />);

    expect(screen.getByText('Duplicates Detected')).toBeInTheDocument();

    // Expand both collapsible sections
    fireEvent.click(screen.getByText(/Show duplicate items/i));
    fireEvent.click(screen.getByText(/File Details/i));

    expect(screen.getAllByText('success_stmt.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('skipped_stmt.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('failed_stmt.pdf').length).toBeGreaterThan(0);

    expect(screen.getAllByText('SUCCESS').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SKIPPED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FAILED').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Warning: statement account number does not match this account').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Statement already ingested').length).toBeGreaterThan(0);
    expect(screen.getAllByText('File is empty').length).toBeGreaterThan(0);

    expect(screen.getAllByText('Uber Ride').length).toBeGreaterThan(0);
    expect(screen.getByText('…and 1 more')).toBeInTheDocument();
  });
  it('shows file warnings up front without expanding File Details', () => {
    const result: FileIngestionResult = {
      filesProcessed: 2,
      totalCreated: 6,
      totalDuplicatesFound: 0,
      fileDetails: [
        {
          filename: '27FEB2026.pdf',
          status: 'SUCCESS',
          linesParsed: 1,
          errorMessage: null,
          warning: "Statement totals don't add up: the transactions found don't take the opening balance to the closing balance. Some may be missing or wrong; check them against the statement.",
          created: 1,
          duplicates: 0,
        },
        {
          filename: '26JUN2026.pdf',
          status: 'SUCCESS',
          linesParsed: 5,
          errorMessage: null,
          warning: null,
          created: 5,
          duplicates: 0,
        },
      ],
    };

    render(<IngestionResultDetails result={result} />);

    expect(screen.getByText('Check this statement')).toBeInTheDocument();
    expect(screen.getByText('27FEB2026.pdf:')).toBeInTheDocument();
    expect(screen.getByText(/Statement totals don't add up/)).toBeInTheDocument();
    expect(screen.queryByText('26JUN2026.pdf:')).not.toBeInTheDocument();
  });

  it('titles the warning for several statements in the plural', () => {
    const warning = 'Warning: statement account number does not match this account';
    const result: FileIngestionResult = {
      filesProcessed: 2,
      totalCreated: 2,
      totalDuplicatesFound: 0,
      fileDetails: [
        { filename: 'a.pdf', status: 'SUCCESS', linesParsed: 1, errorMessage: null, warning, created: 1, duplicates: 0 },
        { filename: 'b.pdf', status: 'SUCCESS', linesParsed: 1, errorMessage: null, warning, created: 1, duplicates: 0 },
      ],
    };

    render(<IngestionResultDetails result={result} />);

    expect(screen.getByText('Check these statements')).toBeInTheDocument();
    expect(screen.getByText('a.pdf:')).toBeInTheDocument();
    expect(screen.getByText('b.pdf:')).toBeInTheDocument();
  });

  it('shows no warning alert when no file has a warning', () => {
    const result: FileIngestionResult = {
      filesProcessed: 1,
      totalCreated: 5,
      totalDuplicatesFound: 0,
      fileDetails: [
        { filename: 'statement.pdf', status: 'SUCCESS', linesParsed: 5, errorMessage: null, created: 5, duplicates: 0 },
      ],
    };

    render(<IngestionResultDetails result={result} />);

    expect(screen.queryByText(/Check (this|these) statement/)).not.toBeInTheDocument();
  });
});
