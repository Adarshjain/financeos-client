import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { api } from '@/lib/api/client';
import type { CardCycleSummary } from '@/lib/statement.types';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CardCycleSummaryCard } from '../statements-dialog/CardCycleSummaryCard';

const summary = (utilizationPct: number | null): CardCycleSummary =>
  ({
    statementId: 's1',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    totalAmountDue: 5000,
    minimumAmountDue: 500,
    paymentDueDate: '2026-10-20',
    daysUntilDue: 10,
    history: [],
    utilizationPct,
  }) as CardCycleSummary;

const render = (pct: number | null) =>
  renderWithQuery(
    <CardCycleSummaryCard cardSummary={summary(pct)} isLoadingCardSummary={false} cardSummaryError={null} onRetry={vi.fn()} />,
  );

describe('CardCycleSummaryCard utilisation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.GET).mockResolvedValue({ data: undefined } as never);
  });

  it.each([
    [12, 'emerald'],
    [30, 'amber'],
    [70, 'rose'],
  ])('%s%% uses the shared %s band for figure and bar', (pct, tone) => {
    const { container } = render(pct);
    expect(screen.getByText(`${pct.toFixed(1)}%`)).toHaveClass(`text-${tone}-600`);
    expect(container.querySelector('.h-1\\.5 > div')).toHaveClass(`bg-${tone}-500`);
  });

  it('without a server value shows a dash and no bar', () => {
    const { container } = render(null);
    const label = screen.getByText('Utilization');
    expect(label.nextElementSibling).toHaveTextContent('—');
    expect(container.querySelector('.h-1\\.5 > div')).toBeNull();
  });
});
