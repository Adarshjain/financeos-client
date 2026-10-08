import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/jobs/useJobsListPolling', () => ({
  useJobsListPolling: () => ({ jobs: [], loading: false, expandedJobIds: new Set(), toggleExpand: vi.fn() }),
}));

import { JobsPanel } from '../JobsPanel';

describe('JobsPanel view-all link', () => {
  it('filters by type when a single type is shown', () => {
    render(<JobsPanel types={['GMAIL_SYNC']} title="Gmail" />);
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/settings/activity?type=GMAIL_SYNC');
  });

  it('is unfiltered for multiple types', () => {
    render(<JobsPanel types={['GMAIL_SYNC', 'RULE_APPLY']} title="Jobs" />);
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/settings/activity');
  });
});
