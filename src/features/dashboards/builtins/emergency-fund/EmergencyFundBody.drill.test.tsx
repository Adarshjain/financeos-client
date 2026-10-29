import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The actions run in-process here and reach the API through the same mocked `api` these tests already drive.
vi.mock('@/lib/api/server', async () => ({ serverApi: (await import('@/lib/api/client')).api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ request, title, onClose }: { request: unknown; title?: string; onClose: () => void }) => (
    <div data-testid="underlying-dialog" data-request={JSON.stringify(request)} data-title={title}>
      <button onClick={onClose}>close dialog</button>
    </div>
  ),
}));
vi.mock('@/components/organisms/Chart/Chart', () => ({
  Chart: ({ onSelectEntry }: { onSelectEntry?: (e: { key: string; label: string; seriesKey?: string; value: number }) => void }) => (
    <div>
      <button onClick={() => onSelectEntry?.({ key: 'Jun', label: 'Jun', seriesKey: 'Outflow', value: 72000 })}>press Jun</button>
      <button onClick={() => onSelectEntry?.({ key: 'Apr', label: 'Apr', seriesKey: 'Outflow', value: 0 })}>press Apr</button>
    </div>
  ),
}));

import { bodyProps } from '@/features/dashboards/builtins/testFixtures';
import { api } from '@/lib/api/client';
import type { EmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import { renderWithQuery } from '@/test/renderWithQuery';

import { EmergencyFundBody } from './EmergencyFundBody';
import { monthOutflowRequest } from './emergencyFundRequestsModel';

const fund = {
  liquidBalance: 315000,
  accounts: [
    { id: 'b1', name: 'HDFC', type: 'bank_account', balance: 300000 },
    { id: 'g1', name: 'Cash', type: 'generic', balance: 15000 },
  ],
  months: [
    { month: '2026-04', outflow: 0, beforeHistory: true },
    { month: '2026-05', outflow: 66000, beforeHistory: false },
    { month: '2026-06', outflow: 72000, beforeHistory: false },
  ],
  historyMonths: 2,
  medianOutflow: 69000,
  monthsCovered: 4.6,
  band: 'medium',
} as unknown as EmergencyFund;

describe('EmergencyFundBody drills', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: fund } as never);
  });

  it('the balance dialog is titled "Bank and cash" with the figure', async () => {
    renderWithQuery(<EmergencyFundBody {...bodyProps('emergency_fund')} />);
    await userEvent.click(await screen.findByRole('button', { name: '₹3,15,000' }));
    expect(screen.getByTestId('underlying-dialog')).toHaveAttribute('data-title', 'Bank and cash · ₹3,15,000');
  });

  it('a month bar opens that month\'s outflow over the fund\'s accounts, titled with month and figure', async () => {
    renderWithQuery(<EmergencyFundBody {...bodyProps('emergency_fund')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'press Jun' }));
    const dialog = screen.getByTestId('underlying-dialog');
    expect(JSON.parse(dialog.getAttribute('data-request') as string)).toEqual(monthOutflowRequest('2026-06', ['b1', 'g1']));
    expect(dialog).toHaveAttribute('data-title', 'Outflow · Jun 2026 · ₹72,000');
    await userEvent.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByTestId('underlying-dialog')).not.toBeInTheDocument();
  });

  it('a month before the history opens nothing', async () => {
    renderWithQuery(<EmergencyFundBody {...bodyProps('emergency_fund')} />);
    await userEvent.click(await screen.findByRole('button', { name: 'press Apr' }));
    expect(screen.queryByTestId('underlying-dialog')).not.toBeInTheDocument();
  });
});
