import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { pinClock } from '@/test/pinClock';

import { holding, manualPrice } from './holding/holding.fixtures';
import { holdingFigures, priceRow } from './holding/holdingModel';
import { header } from './holdings/holdings.fixtures';
import { heroModel } from './holdings/holdingsModel';
import { PricesLine } from './holdings/PricesLine';
import { priceTimeLabel } from './investmentsFormatModel';

pinClock();

describe('IST price times', () => {
  it('priceTimeLabel says Live while open and Closed after', () => {
    expect(priceTimeLabel('13 Oct', '2026-10-13T15:30:00+05:30', new Date('2026-10-14T05:00:00Z'))).toBe('Closed · 13 Oct, 3:30 pm');
    expect(priceTimeLabel('13 Oct', '2026-10-13T11:45:00+05:30', new Date('2026-10-13T06:30:00Z'))).toBe('Live · 11:45 am');
  });

  it('adds the time to the hero price date only when the header carries one', () => {
    expect(heroModel({ ...header, priceAt: '2026-10-13T15:30:00+05:30' }).priceAsOf).toBe('13 Oct, 3:30 pm');
    expect(heroModel({ ...header, priceAt: null }).priceAsOf).toBe('13 Oct');
  });

  it('PricesLine shows the time and falls back to the date', () => {
    const { rerender } = render(<PricesLine asOf="13 Oct, 3:30 pm" />);
    expect(screen.getByText('Prices as of 13 Oct, 3:30 pm')).toBeTruthy();
    rerender(<PricesLine asOf="13 Oct" />);
    expect(screen.getByText('Prices as of 13 Oct')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('puts the time on the LTP line only when the price has one', () => {
    const ltp = (priceAt: string | null) => holdingFigures({ ...holding, priceAt }, null).find((f) => f.id === 'ltp')!.context;
    expect(ltp('2026-10-13T15:30:00+05:30')).toBe('Closed · 13 Oct, 3:30 pm');
    expect(ltp(null)).toBe('13 Oct');
  });

  it('price history rows carry the time only when present', () => {
    expect(priceRow({ ...manualPrice, priceAt: '2026-10-10T15:29:00+05:30' }).time).toBe('3:29 pm');
    expect(priceRow(manualPrice).time).toBe('');
    expect(priceRow({ ...manualPrice, priceAt: '2026-10-10T15:29:00+05:30' }).date).toBe('10 Oct');
  });
});
