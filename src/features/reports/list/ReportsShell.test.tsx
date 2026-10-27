import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportsShell } from './ReportsShell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/reports',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ReportsShell', () => {
  it('puts New report on the + and opens the Dinero editor', () => {
    renderWithQuery(<ReportsShell>body</ReportsShell>);
    expect(screen.getByRole('link', { name: 'New report' })).toHaveAttribute('href', '/reports/new');
  });
});
