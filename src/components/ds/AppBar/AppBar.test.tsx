import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppBar, BrandMark, DesktopRail, DesktopTopBar } from './AppBar';

describe('BrandMark', () => {
  it('renders default rupee symbol with 32px control tokens', () => {
    const { container } = render(<BrandMark />);
    expect(screen.getByText('₹')).toBeInTheDocument();
    const mark = container.firstChild as HTMLElement;
    expect(mark).toHaveClass('w-control-md');
    expect(mark).toHaveClass('h-control-md');
  });
});

describe('AppBar (Phone)', () => {
  it('renders title, sentence-case crumb, and brand mark in top-level mode', () => {
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
    const crumb = screen.getByText('Money');
    expect(crumb).toBeInTheDocument();
    expect(crumb).toHaveClass('text-label');
    expect(crumb).not.toHaveClass('uppercase');
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('renders 32px back button in detail mode and fires onBack', () => {
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
    expect(backBtn).toHaveClass('h-control-md');
    expect(backBtn).toHaveClass('aspect-square');
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders 32px bordered icon buttons and brand add button', () => {
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

    const askBtn = screen.getByRole('button', { name: 'Ask the data' });
    expect(askBtn).toHaveClass('h-control-md');
    expect(askBtn).toHaveClass('aspect-square');
    fireEvent.click(askBtn);
    expect(handleAsk).toHaveBeenCalledTimes(1);

    const searchBtn = screen.getByRole('button', { name: 'Search' });
    expect(searchBtn).toHaveClass('h-control-md');
    expect(searchBtn).toHaveClass('aspect-square');
    fireEvent.click(searchBtn);
    expect(handleSearch).toHaveBeenCalledTimes(1);

    const addBtn = screen.getByRole('button', { name: 'Add item' });
    expect(addBtn).toHaveClass('h-control-md');
    expect(addBtn).toHaveClass('aspect-square');
    expect(addBtn).toHaveClass('bg-brand');
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});

describe('DesktopTopBar', () => {
  it('renders desktop page title, crumb, and triggers actions', () => {
    const handleAdd = vi.fn();
    const handleAsk = vi.fn();
    const handleNotifications = vi.fn();

    render(
      <DesktopTopBar
        title="Settings"
        crumb="Workspace"
        onAdd={handleAdd}
        onAsk={handleAsk}
        onNotifications={handleNotifications}
      />,
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Add/i });
    expect(addBtn).toHaveClass('h-control-md');
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);

    const askBtn = screen.getByRole('button', { name: 'Ask the data' });
    expect(askBtn).toHaveClass('h-control-md');
    fireEvent.click(askBtn);
    expect(handleAsk).toHaveBeenCalledTimes(1);

    const notifBtn = screen.getByRole('button', { name: 'Notifications' });
    expect(notifBtn).toHaveClass('h-control-md');
    fireEvent.click(notifBtn);
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
        userName="Priya Sharma"
      />,
    );

    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('PS')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Accounts'));
    expect(handleNavigate).toHaveBeenCalledWith('/accounts');

    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('renders cleanly without userName or userInitials props', () => {
    render(<DesktopRail activeHref="/" />);
    expect(screen.getByText('FinanceOS')).toBeInTheDocument();
    expect(screen.queryByText('Arjun Mehta')).not.toBeInTheDocument();
    expect(screen.queryByText('AM')).not.toBeInTheDocument();
  });
});
