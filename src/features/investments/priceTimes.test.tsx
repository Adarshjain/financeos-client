import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { holding, manualPrice } from './holding/holding.fixtures';
import { holdingFigures, priceRow } from './holding/holdingModel';
import { header } from './holdings/holdings.fixtures';
import { heroModel } from './holdings/holdingsModel';
import { PricesLine } from './holdings/PricesLine';
import { dayWithTime, istTime } from './investmentsFormat';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('./useRefreshPrices', () => ({ useRefreshPrices: () => ({ refresh: vi.fn(), busy: false, jobId: null }) }));

describe('IST price times', () => {
  it('formats an offset timestamp as 24h IST, whatever the offset written', () => {
    expect(istTime('2026-10-13T15:30:00+05:30')).toBe('15:30');
    expect(istTime('2026-10-13T10:00:00Z')).toBe('15:30');
    expect(istTime(null)).toBe('');
    expect(istTime('nope')).toBe('');
    expect(dayWithTime('13 Oct', '2026-10-13T09:05:00+05:30')).toBe('13 Oct, 09:05');
    expect(dayWithTime('13 Oct', null)).toBe('13 Oct');
  });

  it('adds the time to the hero price date only when the header carries one', () => {
    expect(heroModel({ ...header, priceAt: '2026-10-13T15:30:00+05:30' }).priceAsOf).toBe('13 Oct, 15:30');
    expect(heroModel({ ...header, priceAt: null }).priceAsOf).toBe('13 Oct');
  });

  it('PricesLine shows the time and falls back to the date', () => {
    const { rerender } = render(<PricesLine asOf="13 Oct, 15:30" latestJobId={null} />);
    expect(screen.getByText(/Prices as of 13 Oct, 15:30/)).toBeTruthy();
    rerender(<PricesLine asOf="13 Oct" latestJobId={null} />);
    expect(screen.getByText(/Prices as of 13 Oct ·/)).toBeTruthy();
  });

  it('puts the time on the LTP line only when the price has one', () => {
    const ltp = (priceAt: string | null) => holdingFigures({ ...holding, priceAt }, null, 0).find((f) => f.id === 'ltp')!.context;
    expect(ltp('2026-10-13T15:30:00+05:30')).toBe('13 Oct, 15:30');
    expect(ltp(null)).toBe('13 Oct');
  });

  it('price history rows carry the time only when present', () => {
    expect(priceRow({ ...manualPrice, priceAt: '2026-10-10T15:29:00+05:30' }).time).toBe('15:29');
    expect(priceRow(manualPrice).time).toBe('');
    expect(priceRow({ ...manualPrice, priceAt: '2026-10-10T15:29:00+05:30' }).date).toBe('10 Oct 26');
  });
});
