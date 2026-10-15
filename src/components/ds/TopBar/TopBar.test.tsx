import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar, type TopBarAction } from './TopBar';

describe('TopBar component', () => {
  it('renders title and phone logo mark when no back prop is passed', () => {
    render(<TopBar title="Home" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    // Logo mark with ₹ symbol exists for phone viewport
    expect(screen.getByText('₹')).toBeInTheDocument();
  });

  it('renders crumb and back button when back prop is provided', () => {
    const handleBack = vi.fn();
    render(
      <TopBar
        crumb="Accounts"
        title="HDFC Regalia Gold"
        back={handleBack}
      />,
    );
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia Gold')).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: 'Back' });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renders back as anchor link when string href is provided', () => {
    render(
      <TopBar
        title="Details"
        back="/dashboard"
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
});
