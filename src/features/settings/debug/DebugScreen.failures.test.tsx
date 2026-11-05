import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { DebugScreen } from './DebugScreen';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/settings/debug',
  useSearchParams: () => new URLSearchParams(),
}));

describe('DebugScreen Failures entry', () => {
  it('links to Failures for a failures admin', () => {
    renderWithQuery(<DebugScreen admin failuresAdmin />);
    expect(screen.getByRole('link', { name: /Failures/ })).toHaveAttribute('href', '/settings/debug/failures');
  });

  it('hides it for everyone else', () => {
    renderWithQuery(<DebugScreen admin />);
    expect(screen.queryByRole('link', { name: /Failures/ })).toBeNull();
  });
});
