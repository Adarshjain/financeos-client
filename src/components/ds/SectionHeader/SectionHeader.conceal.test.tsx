import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { SectionHeader } from './SectionHeader';

describe('SectionHeader with hidden amounts', () => {
  it('shows the ₹ amount as it is without a ConcealProvider', () => {
    render(<SectionHeader>Total ₹12,000</SectionHeader>);
    expect(document.body.textContent).toMatch(/₹\d/);
    expect(document.body.textContent).not.toContain('₹ —');
  });

  it('replaces each ₹ amount with "₹ —" under ConcealProvider', () => {
    render(<ConcealProvider concealed><SectionHeader>Total ₹12,000</SectionHeader></ConcealProvider>);
    expect(screen.getByText('Total ₹ —')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\d/);
  });
});
