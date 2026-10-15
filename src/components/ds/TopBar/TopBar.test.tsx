import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TopBar } from './TopBar';

describe('TopBar component', () => {
  it('renders top-level page title', () => {
    render(<TopBar title="Home" />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders crumb and slash on detail screen', () => {
    render(<TopBar crumb="Accounts" title="HDFC Regalia Gold" />);
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia Gold')).toBeInTheDocument();
  });

  it('triggers action callbacks when buttons are clicked', () => {
    const handleAdd = vi.fn();
    const handleChat = vi.fn();
    const handleNotifications = vi.fn();

    render(
      <TopBar
        title="Dashboard"
        onAdd={handleAdd}
        onChat={handleChat}
        onNotifications={handleNotifications}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(handleAdd).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    expect(handleChat).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(handleNotifications).toHaveBeenCalledTimes(1);
  });
});
