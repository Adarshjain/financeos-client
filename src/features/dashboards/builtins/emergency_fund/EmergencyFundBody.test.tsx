import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock('@/features/reports/underlying/ReportUnderlyingDialog', () => ({
  ReportUnderlyingDialog: ({ request, onClose }: { request: unknown; onClose: () => void }) => (
    <div data-testid="underlying-dialog" data-request={JSON.stringify(request)}>
      <button onClick={onClose}>close dialog</button>
    </div>
  ),
}));
vi.mock('@/components/organisms', () => ({
  Chart: ({ data }: { data: { categories: string[]; series: { data: (number | null)[] }[] } }) => (
    <div data-testid="chart" data-categories={data.categories.join(',')} data-values={JSON.stringify(data.series[0].data)} />
  ),
}));

import { api, ApiError } from '@/lib/api/client';
import type { EmergencyFund } from '@/lib/query/hooks/useEmergencyFund';
import { renderWithQuery } from '@/test/renderWithQuery';

import { account, bodyProps } from '../testFixtures';
import { EmergencyFundBody } from './EmergencyFundBody';

const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

function fund(over: Partial<EmergencyFund> = {}): EmergencyFund {
  return {
    liquidBalance: 315000,
    accounts: [
      { id: 'b1', name: 'HDFC', type: 'bank_account', balance: 300000 },
      { id: 'g1', name: 'Cash', type: 'generic', balance: 15000 },
    ],
    months: MONTHS.map((month, i) => ({ month, outflow: 60000 + i * 6000, beforeHistory: false })),
    historyMonths: 6,
    medianOutflow: 75000,
    monthsCovered: 4.2,
    band: 'medium',
    ...over,
  } as EmergencyFund;
}

function serve(value: unknown) {
  vi.mocked(api.GET).mockImplementation((() =>
    value === null ? new Promise(() => {}) : value instanceof Error ? Promise.reject(value) : Promise.resolve({ data: value })) as never);
}

const render = () => renderWithQuery(<EmergencyFundBody {...bodyProps('emergency_fund')} />);

describe('EmergencyFundBody', () => {
  beforeEach(() => vi.resetAllMocks());

  it('shows the loading shape while the fund loads', () => {
    serve(null);
    render();
    expect(screen.getByTestId('widget-skeleton')).toBeInTheDocument();
  });

  it('months covered in the band\'s tone, the usual outflow and the liquid balance', async () => {
    serve(fund());
    render();
    const months = await screen.findByTestId('emergency-months');
    expect(months).toHaveTextContent('4.2 months');
    expect(months).toHaveAttribute('data-band', 'medium');
    expect(screen.getByTestId('emergency-fund')).toHaveTextContent('Usual monthly outflow ₹75,000');
    expect(screen.getByRole('button', { name: '₹3,15,000' })).toBeInTheDocument();
  });

  it('says how many months the figure rests on when there are fewer than six', async () => {
    serve(fund({ historyMonths: 3 }));
    render();
    expect(await screen.findByTestId('emergency-fund')).toHaveTextContent('based on 3 months');
  });

  it('six month bars; months before the history are left empty, not drawn as zero', async () => {
    serve(fund({ months: MONTHS.map((month, i) => ({ month, outflow: 1000, beforeHistory: i < 2 })) }));
    render();
    const chart = await screen.findByTestId('chart');
    expect(chart).toHaveAttribute('data-categories', 'Apr,May,Jun,Jul,Aug,Sep');
    expect(JSON.parse(chart.getAttribute('data-values') ?? '[]')).toEqual([null, null, 1000, 1000, 1000, 1000]);
  });

  it('no figure yet: says why, and that nothing is set aside when the balance is empty', async () => {
    serve(fund({ monthsCovered: null, band: null, historyMonths: 0, liquidBalance: 0, months: [] }));
    render();
    const none = await screen.findByTestId('emergency-no-figure');
    expect(none).toHaveTextContent('Not enough history yet');
    expect(none).toHaveTextContent('Months covered appear once your bank and cash accounts have a full month of transactions.');
    expect(screen.getByTestId('emergency-fund')).toHaveTextContent('nothing set aside yet');
  });

  it('the balance opens its accounts through the underlying data', async () => {
    const user = userEvent.setup();
    serve(fund());
    render();
    await user.click(await screen.findByRole('button', { name: '₹3,15,000' }));
    const request = JSON.parse(screen.getByTestId('underlying-dialog').getAttribute('data-request') ?? '{}');
    expect(request.datasource).toBe('net_worth');
    await user.click(screen.getByRole('button', { name: 'close dialog' }));
    expect(screen.queryByTestId('underlying-dialog')).not.toBeInTheDocument();
  });

  it('no bank or cash account: an empty state that goes to accounts', async () => {
    const user = userEvent.setup();
    serve(fund({ accounts: [] }));
    render();
    expect(await screen.findByText('No bank or cash accounts yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Go to accounts' }));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/\/accounts$/));
  });

  it('every bank and cash account excluded: says to include one', async () => {
    vi.mocked(api.GET).mockImplementation(((path: string) =>
      Promise.resolve({ data: path.includes('emergency-fund') ? fund({ accounts: [] }) : [account({ id: 'b1', excludeFromNetAsset: true })] })) as never);
    render();
    expect(await screen.findByText('Your bank and cash accounts are excluded')).toBeInTheDocument();
  });

  it('a failure names it and offers Retry', async () => {
    serve(new ApiError(500, { code: 'X', message: 'Server down' }));
    render();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load this widget");
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
