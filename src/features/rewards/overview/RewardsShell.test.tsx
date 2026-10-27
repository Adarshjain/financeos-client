import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { useRewardsAdd } from './RewardsAdd';
import { RewardsShell } from './RewardsShell';

let pathname = '/rewards/rules';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

const add = vi.fn();
function Tab({ enabled = true }: { enabled?: boolean }) {
  useRewardsAdd(add, enabled);
  return <div>tab body</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  pathname = '/rewards/rules';
});

describe('RewardsShell +', () => {
  it('shows the + on Earning rules once the page registers it, and runs it', () => {
    renderWithQuery(
      <RewardsShell>
        <Tab />
      </RewardsShell>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'New rule' }));
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('has no + on the other tabs, even if a page registers one', () => {
    pathname = '/rewards';
    renderWithQuery(
      <RewardsShell>
        <Tab />
      </RewardsShell>,
    );
    expect(screen.queryByRole('button', { name: 'New rule' })).not.toBeInTheDocument();
  });

  it('has no + on Earning rules while no card is registered', () => {
    renderWithQuery(
      <RewardsShell>
        <Tab enabled={false} />
      </RewardsShell>,
    );
    expect(screen.queryByRole('button', { name: 'New rule' })).not.toBeInTheDocument();
  });
});
