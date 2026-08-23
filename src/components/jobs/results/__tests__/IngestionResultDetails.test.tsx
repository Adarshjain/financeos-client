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
});
