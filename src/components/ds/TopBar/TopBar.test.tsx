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
