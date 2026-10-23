import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Card } from './Card';

describe('Card with hidden amounts', () => {
  it('shows the ₹ amount as it is without a ConcealProvider', () => {
    render(<Card title="Spend" subtitle="₹12,000 of ₹20,000" />);
    expect(document.body.textContent).toMatch(/₹\d/);
    expect(document.body.textContent).not.toContain('₹ —');
  });

  it('replaces each ₹ amount with "₹ —" under ConcealProvider', () => {
    render(<ConcealProvider concealed><Card title="Spend" subtitle="₹12,000 of ₹20,000" /></ConcealProvider>);
    expect(screen.getByText('₹ — of ₹ —')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\d/);
  });
});
