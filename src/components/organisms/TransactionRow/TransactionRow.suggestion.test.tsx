import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TransactionRow } from './TransactionRow';

describe('TransactionRow suggestion line', () => {
  it('shows the suggestion on the meta line', () => {
    render(<TransactionRow compact description="HDFC card payment" amount="5,000.00" suggestion="Looks like your HDFC Regalia bill" />);
    expect(screen.getByText('Looks like your HDFC Regalia bill')).toBeInTheDocument();
  });

  it('shows nothing without one', () => {
    render(<TransactionRow compact description="HDFC card payment" amount="5,000.00" />);
    expect(screen.queryByText(/Looks like/)).not.toBeInTheDocument();
  });
});
