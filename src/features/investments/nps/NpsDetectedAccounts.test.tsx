import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } }));
vi.mock('@/components/ds/Toast/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('./npsImportRefetch', () => ({ scheduleNpsImportRefetch: vi.fn() }));

import { serverApi as api } from '@/lib/api/server';
import { renderWithQuery } from '@/test/renderWithQuery';

import { NpsDetectedAccounts } from './NpsDetectedAccounts';
import type { NpsSummary } from './npsModel';

const detection = { key: 'k1', pranLast4: '1234', holderName: 'Ravi', statementCount: 3, firstPeriodStart: '2025-01-01', lastPeriodEnd: '2025-03-31' } as NpsSummary['pendingGmail'][number];
const second = { key: 'k2', pranLast4: '5678', statementCount: 1 } as NpsSummary['pendingGmail'][number];

describe('NpsDetectedAccounts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: {} } as never);
    vi.mocked(api.POST).mockResolvedValue({ data: { accountId: 'a1', importing: 3 } } as never);
    vi.mocked(api.DELETE).mockResolvedValue({ data: undefined } as never);
  });

  it('shows one block per detection with its details, inside the card with the children', () => {
    renderWithQuery(
      <NpsDetectedAccounts detections={[detection, second]}>
        <div>empty state here</div>
      </NpsDetectedAccounts>,
    );
    expect(screen.getAllByTestId('nps-gmail-new-account')).toHaveLength(2);
    expect(screen.getByText('PRAN ••1234, Ravi · 3 statements · Jan 2025 – Mar 2025. Whose is it?')).toBeInTheDocument();
    expect(screen.getByText('PRAN ••5678 · 1 statement. Whose is it?')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ignore' })).toHaveLength(2);
    expect(screen.getByText('empty state here')).toBeInTheDocument();
  });

  it('Mine sends relation SELF', async () => {
    renderWithQuery(<NpsDetectedAccounts detections={[detection]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mine' }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/{key}/account', { params: { path: { key: 'k1' } }, body: { relation: 'SELF' } }),
    );
  });

  it("My child's sends relation CHILD", async () => {
    renderWithQuery(<NpsDetectedAccounts detections={[detection]} />);
    fireEvent.click(screen.getByRole('button', { name: "My child's" }));
    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/{key}/account', { params: { path: { key: 'k1' } }, body: { relation: 'CHILD' } }),
    );
  });

  it('Ignore deletes the detection', async () => {
    renderWithQuery(<NpsDetectedAccounts detections={[detection]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
    await waitFor(() => expect(api.DELETE).toHaveBeenCalledWith('/api/v1/nps/gmail-detections/{key}', { params: { path: { key: 'k1' } } }));
  });

  it('Ignore shows loading while saving and the buttons cannot be pressed twice', async () => {
    let release: (v: unknown) => void = () => {};
    vi.mocked(api.DELETE).mockReturnValue(new Promise((r) => (release = r)) as never);
    renderWithQuery(<NpsDetectedAccounts detections={[detection]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ignore' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Mine' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
    expect(api.DELETE).toHaveBeenCalledTimes(1);
    release({ data: undefined });
  });
});
