import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InvestmentsShell } from './InvestmentsShell';

vi.mock('next/navigation', () => ({
  usePathname: () => '/investments/import',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('InvestmentsShell on the Import tradebook page', () => {
  it('renders the page on its own, with no tab strip', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <InvestmentsShell>
          <p>import page</p>
        </InvestmentsShell>
      </QueryClientProvider>,
    );
    expect(screen.getByText('import page')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
