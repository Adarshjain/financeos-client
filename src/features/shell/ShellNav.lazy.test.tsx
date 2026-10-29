import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AddLendingProvider } from '@/features/lendings/form/AddLendingProvider';

import { ShellTabBar } from './ShellNav';

vi.mock('next/navigation', () => ({ usePathname: () => '/accounts', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/query/hooks/useInbox', () => ({ useInboxSummary: () => ({ data: { badge: 0 } }) }));
vi.mock('@/features/transactions/useNeedsReviewCount', () => ({ useNeedsReviewCount: () => ({ data: 0 }) }));

const gate = vi.hoisted(() => ({ release: () => {}, ready: null as Promise<void> | null }));
vi.mock('@/features/lendings/form/AddLendingDialog', async () => {
  await gate.ready;
  return { AddLendingDialog: () => <p>lending dialog</p> };
});

describe('More sheet Quick add Lending loads on press', () => {
  it('shows the pressed tile loading, keeps the sheet open, then opens the dialog and closes the sheet', async () => {
    gate.ready = new Promise<void>((resolve) => {
      gate.release = resolve;
    });
    render(
      <AddLendingProvider>
        <ShellTabBar user={{ email: 'arjun@example.test' }} />
      </AddLendingProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /Menu/i }));
    const tile = screen.getByRole('button', { name: /Lending/i });
    expect(tile).not.toHaveAttribute('aria-busy');

    fireEvent.pointerDown(tile);
    fireEvent.click(tile);
    expect(await screen.findByRole('button', { name: /Lending/i })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.queryByText('lending dialog')).not.toBeInTheDocument();

    await act(async () => gate.release());
    expect(await screen.findByText('lending dialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument();
  });
});
