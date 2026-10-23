import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { Toast } from './Toast';

describe('Toast with hidden amounts', () => {
  it('masks ₹ amounts although it is mounted outside the provider (the Toaster), and shows them again', () => {
    const { rerender } = render(<ConcealProvider concealed>{null}</ConcealProvider>);
    render(<Toast message="Paid ₹1,250 to Uber" />);
    expect(screen.getByText('Paid ₹ — to Uber')).toBeInTheDocument();
    rerender(<ConcealProvider concealed={false}>{null}</ConcealProvider>);
    expect(screen.getByText('Paid ₹1,250 to Uber')).toBeInTheDocument();
  });
});
