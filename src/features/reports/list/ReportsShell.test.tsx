import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { ReportsShell } from './ReportsShell';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/ds/reports',
  useSearchParams: () => new URLSearchParams(),
}));

describe('ReportsShell', () => {
  it('has Dashboards and Reports tabs: Dashboards falls through to Legacy, Reports is this page', () => {
    renderWithQuery(<ReportsShell>body</ReportsShell>);
    expect(screen.getByRole('tab', { name: 'Dashboards' })).toHaveAttribute('href', '/dashboards');
    const reports = screen.getByRole('tab', { name: 'Reports' });
    expect(reports).toHaveAttribute('href', '/ds/reports');
    expect(reports).toHaveAttribute('data-state', 'active');
  });

  it('puts New report on the + and leaves New report on Legacy until it is built', () => {
    renderWithQuery(<ReportsShell>body</ReportsShell>);
    expect(screen.getByRole('link', { name: 'New report' })).toHaveAttribute('href', '/reports/new');
  });
});
