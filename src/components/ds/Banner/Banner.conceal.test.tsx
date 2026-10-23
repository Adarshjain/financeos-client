import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Banner } from './Banner';

describe('Banner with hidden amounts', () => {
  it('shows the ₹ amount as it is without a ConcealProvider', () => {
    render(<Banner title="Over by ₹2,400." />);
    expect(document.body.textContent).toMatch(/₹\d/);
    expect(document.body.textContent).not.toContain('₹ —');
  });

  it('replaces each ₹ amount with "₹ —" under ConcealProvider', () => {
    render(<ConcealProvider concealed><Banner title="Over by ₹2,400." /></ConcealProvider>);
    expect(screen.getByText('Over by ₹ —.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/₹\d/);
  });
});
