import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DsInvestmentsImportPage from './page';

vi.mock('@/lib/auth', () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }));
const server = vi.hoisted(() => ({ fetchBrokers: vi.fn() }));
vi.mock('@/features/investments/investmentsServerApi', () => server);
vi.mock('@/features/shell/loadHelpers', () => ({ guardSession: (p: Promise<unknown>) => p }));
vi.mock('@/features/investments/import/ImportTradebookScreen', () => ({
  ImportTradebookScreen: ({ initialMode }: { initialMode?: string }) => <p>mode: {initialMode ?? 'default'}</p>,
}));

beforeEach(() => server.fetchBrokers.mockResolvedValue([]));

describe('/investments/import?type=', () => {
  it('opens on the EPF passbook for ?type=epf, read on the server', async () => {
    render(await DsInvestmentsImportPage({ searchParams: Promise.resolve({ type: 'epf' }) }));
    expect(screen.getByText('mode: epf_passbook')).toBeInTheDocument();
  });

  it('keeps the default type for no or another type', async () => {
    render(await DsInvestmentsImportPage({ searchParams: Promise.resolve({ type: 'x' }) }));
    expect(screen.getByText('mode: default')).toBeInTheDocument();
  });
});
