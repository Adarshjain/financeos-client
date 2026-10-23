import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Badge } from './Badge';

describe('Badge with hidden amounts', () => {
  it('shows the ₹ amount as it is without a ConcealProvider', () => {
    render(<Badge>Due ₹4,500</Badge>);
    expect(document.body.textContent).toMatch(/₹\d/);
    expect(document.body.textContent).not.toContain('₹ —');
  });

  it('replaces each ₹ amount with "₹ —" under ConcealProvider', () => {
    render(<ConcealProvider concealed><Badge>Due ₹4,500</Badge></ConcealProvider>);
    expect(screen.getByText('Due ₹ —')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\d/);
  });
});
