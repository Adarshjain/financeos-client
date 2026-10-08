import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('@/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 2 } }) }));

import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('puts a Chat button linking to /chat in the header', () => {
    render(<Sidebar userEmail="me@example.com" />);
    const chat = screen.getByRole('link', { name: 'Chat' });
    expect(chat).toHaveAttribute('href', '/chat');
    expect(chat.textContent).toContain('Chat');
  });

  it('keeps the logo link home, the nav tree, email and sign out', () => {
    render(<Sidebar userEmail="me@example.com" />);
    expect(screen.getAllByRole('link').some((l) => l.getAttribute('href') === '/dashboard')).toBe(true);
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign out/ })).toBeInTheDocument();
    expect(screen.getByTestId('inbox-nav-badge')).toHaveTextContent('2');
  });
});
