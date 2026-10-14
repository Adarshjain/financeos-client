import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppBar, BrandMark, DesktopRail, DesktopTopBar } from './AppBar';

describe('BrandMark', () => {
  it('renders default rupee symbol', () => {
    render(<BrandMark />);
    expect(screen.getByText('₹')).toBeInTheDocument();
  });
});

describe('AppBar (Phone)', () => {
  it('renders title, crumb, and brand mark in top-level mode', () => {
    render(
      <AppBar
        title="Transactions"
        crumb="Money"
        onAsk={() => {}}
        onSearch={() => {}}
        onAdd={() => {}}
      />,
    );

    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('renders back button in detail mode and fires onBack', () => {
    const handleBack = vi.fn();
    render(
      <AppBar
        back
        title="HDFC Regalia Gold"
        crumb="Accounts"
        onBack={handleBack}
      />,
    );

    expect(screen.getByText('HDFC Regalia Gold')).toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('triggers onAsk, onSearch, and onAdd action callbacks', () => {
    const handleAsk = vi.fn();
    const handleSearch = vi.fn();
    const handleAdd = vi.fn();

    render(
      <AppBar
        title="Overview"
        onAsk={handleAsk}
        onSearch={handleSearch}
        onAdd={handleAdd}
        addAriaLabel="Add item"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ask the data' }));
    expect(handleAsk).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(handleSearch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});

describe('DesktopTopBar', () => {
  it('renders desktop page title and triggers actions', () => {
    const handleAdd = vi.fn();
    const handleAsk = vi.fn();
    const handleNotifications = vi.fn();

    render(
      <DesktopTopBar
        title="Settings"
        onAdd={handleAdd}
        onAsk={handleAsk}
        onNotifications={handleNotifications}
      />,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(handleAdd).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Ask the data' }));
    expect(handleAsk).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(handleNotifications).toHaveBeenCalledTimes(1);
  });
});

describe('DesktopRail', () => {
  it('renders primary navigation and calls onNavigate', () => {
    const handleNavigate = vi.fn();
    const handleSearch = vi.fn();

    render(
      <DesktopRail
        activeHref="/transactions"
        onNavigate={handleNavigate}
        onSearch={handleSearch}
      />,
    );

    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accounts'));
    expect(handleNavigate).toHaveBeenCalledWith('/accounts');

    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });
});
