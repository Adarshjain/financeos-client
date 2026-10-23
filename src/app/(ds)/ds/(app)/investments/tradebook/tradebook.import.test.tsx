import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { trade, tradesPage } from '@/features/investments/tradebook/tradebook.fixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsTradebookPage from './page';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/ds/investments/tradebook',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/features/investments/investmentsServerApi', () => ({ fetchBrokers: vi.fn().mockResolvedValue([]) }));
const tradebook = vi.hoisted(() => ({ fetchTradebookPage: vi.fn(), fetchLastImportJob: vi.fn(), fetchLastReconcileJob: vi.fn() }));
vi.mock('@/features/investments/tradebook/tradebookServerApi', () => tradebook);

beforeEach(() => {
  tradebook.fetchTradebookPage.mockResolvedValue(tradesPage([trade()], { totalElements: 1, totalPages: 1 }));
  tradebook.fetchLastImportJob.mockResolvedValue(null);
  tradebook.fetchLastReconcileJob.mockResolvedValue(null);
});

describe('/ds/investments/tradebook: Import tradebook', () => {
  it('links to the Import tradebook page', async () => {
    renderWithQuery(await DsTradebookPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('link', { name: 'Import tradebook' })).toHaveAttribute('href', '/ds/investments/import');
  });
});
