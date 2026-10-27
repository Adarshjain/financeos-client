import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { RecentTransactionsCard } from './RecentTransactionsCard';

describe('RecentTransactionsCard', () => {
  it('View all opens the account on the Transactions list for all time', () => {
    render(<RecentTransactionsCard accountId="b1" rows={[]} total={0} />);
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/transactions?account=b1&period=all_time');
  });
});
