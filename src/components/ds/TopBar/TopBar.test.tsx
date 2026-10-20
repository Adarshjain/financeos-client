import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar, type TopBarAction } from './TopBar';

describe('TopBar component', () => {
  it('renders title and crumb correctly', () => {
    render(<TopBar crumb="Settings" title="Profile" />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders custom leading slot on phone', () => {
    render(
      <TopBar
        title="Home"
        leading={<span data-testid="custom-leading">LogoMark</span>}
      />,
    );
    expect(screen.getByTestId('custom-leading')).toBeInTheDocument();
  });

  it('renders back button when onBack prop is provided', () => {
    const handleBack = vi.fn();
    render(
      <TopBar
        crumb="Accounts"
        title="HDFC Regalia Gold"
        onBack={handleBack}
      />,
    );
    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders back as anchor link when backHref is provided', () => {
    render(
      <TopBar
        title="Details"
        backHref="/dashboard"
      />,
    );
    const backLink = screen.getByRole('link', { name: 'Back' });
    expect(backLink).toHaveAttribute('href', '/dashboard');
  });

  it('renders actions passed through props and handles callbacks', () => {
    const handleAdd = vi.fn();
    const handleChat = vi.fn();

    const actions: TopBarAction[] = [
      { id: 'add', icon: 'add', label: 'Add', variant: 'primary', onSelect: handleAdd },
      { id: 'chat', icon: 'chat', label: 'Chat', onSelect: handleChat },
    ];

    render(
      <TopBar
        title="Dashboard"
        actions={actions}
      />,
    );

    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);

    const chatBtn = screen.getByRole('button', { name: 'Chat' });
    expect(chatBtn).toBeInTheDocument();
    fireEvent.click(chatBtn);
    expect(handleChat).toHaveBeenCalledTimes(1);
  });

  it('supports asChild rendering on actions', () => {
    const handleSelect = vi.fn();
    const actions: TopBarAction[] = [
      {
        id: 'link-action',
        icon: 'search',
        label: 'Search Link',
        onSelect: handleSelect,
        asChild: true,
        children: <a href="/search">Search Link</a>,
      },
    ];

    render(
      <TopBar
        title="Dashboard"
        actions={actions}
      />,
    );

    const actionLink = screen.getByRole('link', { name: 'Search Link' });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('href', '/search');
    fireEvent.click(actionLink);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});

describe('TopBar action icon size', () => {
  it('uses labelIconSize beside the desktop label and md for the phone icon-only form', () => {
    const { container } = render(
      <TopBar title="Accounts" actions={[{ id: 'add', icon: 'add', label: 'Add', showLabel: true, labelIconSize: 'xs' }]} />
    );
    const icons = container.querySelectorAll('button svg');
    expect(icons).toHaveLength(2);
    expect(icons[0].getAttribute('class')).toContain('desk:hidden');
    expect(icons[1].getAttribute('class')).toContain('hidden desk:inline-block');
    expect(icons[0].getAttribute('class')).toContain('w-icon-md');
    expect(icons[1].getAttribute('class')).toContain('w-icon-xs');
  });

  it('draws one md icon when no labelIconSize is given', () => {
    const { container } = render(<TopBar title="Accounts" actions={[{ id: 'add', icon: 'add', label: 'Add', showLabel: true }]} />);
    const icons = container.querySelectorAll('button svg');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('class')).toContain('w-icon-md');
  });
});

describe('TopBar back control (UAT)', () => {
  it('shows the back link at every width when backHref is set', () => {
    render(<TopBar title="HDFC Regalia Gold" backHref="/accounts" />);
    const back = screen.getByRole('link', { name: 'Back' });
    expect(back).toHaveAttribute('href', '/accounts');
    expect(back.parentElement).not.toHaveClass('desk:hidden');
  });

  it('shows the onBack button at every width', () => {
    render(<TopBar title="Detail" onBack={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Back' }).parentElement).not.toHaveClass('desk:hidden');
  });

  it('keeps a custom leading slot phone only', () => {
    render(<TopBar title="Home" leading={<span data-testid="lead">x</span>} />);
    expect(screen.getByTestId('lead').parentElement).toHaveClass('desk:hidden');
  });
});
