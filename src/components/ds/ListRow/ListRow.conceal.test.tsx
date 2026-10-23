import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { ListRow } from './ListRow';

describe('ListRow with hidden amounts', () => {
  it('shows the ₹ amount as it is without a ConcealProvider', () => {
    render(<ListRow title="Rent ₹36,000" />);
    expect(document.body.textContent).toMatch(/₹\d/);
    expect(document.body.textContent).not.toContain('₹ —');
  });

  it('replaces each ₹ amount with "₹ —" under ConcealProvider', () => {
    render(<ConcealProvider concealed><ListRow title="Rent ₹36,000" /></ConcealProvider>);
    expect(screen.getByText('Rent ₹ —')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\d/);
  });
});
