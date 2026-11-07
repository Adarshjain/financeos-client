import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { employer, summary } from '@/features/investments/epf/epf.fixtures';
import { npsAccount, npsSummary } from '@/features/investments/retirement/retirement.fixtures';
import { renderWithQuery } from '@/test/renderWithQuery';

import DsRetirementPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), redirect: vi.fn() }));

const epf = vi.hoisted(() => ({ fetchEpfSummary: vi.fn(), fetchEpfEmployers: vi.fn() }));
const nps = vi.hoisted(() => ({ fetchNpsSummary: vi.fn() }));
vi.mock('@/features/investments/epf/epfServerApi', () => epf);
vi.mock('@/features/investments/nps/npsServerApi', () => nps);

beforeEach(() => {
  vi.clearAllMocks();
  epf.fetchEpfSummary.mockResolvedValue(summary());
  epf.fetchEpfEmployers.mockResolvedValue([employer()]);
  nps.fetchNpsSummary.mockResolvedValue(npsSummary([npsAccount()]));
});

describe('/investments/retirement', () => {
  it('reads the EPF and NPS summaries and lists both', async () => {
    renderWithQuery(await DsRetirementPage());
    expect(screen.getAllByText('UAN ••4321').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PRAN ••7731').length).toBeGreaterThan(0);
  });

  it('says what failed when a summary does not load', async () => {
    nps.fetchNpsSummary.mockRejectedValue(new Error('boom'));
    renderWithQuery(await DsRetirementPage());
    expect(screen.getByText(/retirement/i)).toBeInTheDocument();
  });
});
