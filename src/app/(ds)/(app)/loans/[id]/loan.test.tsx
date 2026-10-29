import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { detailFixture, scheduleFixture } from '@/features/loans/detail/loanDetail.fixtures';
import type { LoanDetailScreenProps } from '@/features/loans/detail/LoanDetailScreen';

import DsLoanPage from './page';

const loadLoanPage = vi.hoisted(() => vi.fn());
vi.mock('@/features/loans/detail/loanDetailData', () => ({ loadLoanPage }));

let viewProps: LoanDetailScreenProps | undefined;
vi.mock('@/features/loans/detail/LoanDetailScreen', () => ({
  LoanDetailScreen: (props: LoanDetailScreenProps) => {
    viewProps = props;
    return <p>loan view</p>;
  },
}));

vi.mock('@/lib/date-range', async (orig) => ({
  ...(await orig<typeof import('@/lib/date-range')>()),
  todayInAppZone: () => '2026-10-13',
}));

async function renderPage(searchParams: { installment?: string | string[] } = {}) {
  const element = await DsLoanPage({ params: Promise.resolve({ id: 'l1' }), searchParams: Promise.resolve(searchParams) });
  render(element);
}

beforeEach(() => {
  vi.clearAllMocks();
  viewProps = undefined;
  loadLoanPage.mockResolvedValue({ detail: detailFixture(), schedule: scheduleFixture() });
});

describe('/loans/[id]', () => {
  it('loads this loan and hands the page its data and today', async () => {
    await renderPage();
    expect(screen.getByText('loan view')).toBeInTheDocument();
    expect(loadLoanPage).toHaveBeenCalledWith('l1');
    expect(viewProps?.today).toBe('2026-10-13');
    expect(viewProps?.schedule).toHaveLength(7);
    expect(viewProps?.highlightSeq).toBeNull();
  });

  it('passes ?installment=N on as the EMI to highlight', async () => {
    await renderPage({ installment: '14' });
    expect(viewProps?.highlightSeq).toBe(14);
  });

  it('ignores a ?installment that is not a positive whole number', async () => {
    await renderPage({ installment: 'abc' });
    expect(viewProps?.highlightSeq).toBeNull();
    await renderPage({ installment: '-3' });
    expect(viewProps?.highlightSeq).toBeNull();
  });
});
