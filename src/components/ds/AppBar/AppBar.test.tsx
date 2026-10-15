import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppBar, BrandMark } from './AppBar';

describe('BrandMark', () => {
  it('renders default ₹ symbol', () => {
    render(<BrandMark />);
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('renders custom symbol', () => {
    render(<BrandMark symbol="$" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });
});

describe('AppBar component', () => {
  it('renders title and crumb for top-level screen', () => {
    render(<AppBar crumb="Money" title="Transactions" />);
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('renders back button on detail screen and triggers onBack', () => {
    const handleBack = vi.fn();
    render(
      <AppBar
        back
        crumb="Accounts"
        title="HDFC Regalia"
        onBack={handleBack}
      />,
    );
    expect(screen.queryByText('₹')).not.toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('calls action callbacks when clicked', () => {
    const handleAsk = vi.fn();
    const handleSearch = vi.fn();
    const handleAdd = vi.fn();

    render(
      <AppBar
        title="Transactions"
        onAsk={handleAsk}
        onSearch={handleSearch}
        onAdd={handleAdd}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ask the data' }));
    expect(handleAsk).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(handleSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
