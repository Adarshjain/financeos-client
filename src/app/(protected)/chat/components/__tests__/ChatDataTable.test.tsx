import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ChatDataTable,
  ChatTableBlock,
} from '../ChatDataTable';

describe('ChatDataTable', () => {
  it('renders table headers and rows with column alignments and INR formatting', () => {
    const table: ChatTableBlock = {
      title: 'Top Merchants',
      columns: [
        { key: 'merchant', label: 'Merchant', align: 'left', format: 'text' },
        { key: 'amount', label: 'Amount', align: 'right', format: 'inr' },
        { key: 'txnCount', label: 'Count', align: 'right', format: 'number' },
      ],
      rows: [
        { merchant: 'Swiggy', amount: 4200, txnCount: 12 },
        { merchant: 'Amazon', amount: 15450, txnCount: 5 },
      ],
    };

    render(<ChatDataTable table={table} />);

    expect(screen.getByText('Top Merchants')).toBeInTheDocument();
    expect(screen.getByText('Merchant')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();

    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    // Currency formatted with ₹ and no decimals (e.g. ₹4,200)
    expect(screen.getByText('₹4,200')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('₹15,450')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    const amountHeader = screen.getByText('Amount');
    expect(amountHeader.className).toContain('text-right');
    expect(amountHeader.className).toContain('tabular-nums');
  });

  it('renders null when columns or rows are empty', () => {
    const { container } = render(
      <ChatDataTable table={{ columns: [], rows: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
