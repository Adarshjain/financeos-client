import { describe, expect, it } from 'vitest';

import { holding, instrument } from './holding.fixtures';
import { holdingFigures } from './holdingModel';

const figures = (over: Partial<typeof holding>) => Object.fromEntries(holdingFigures({ ...holding, ...over }, instrument).map((f) => [f.id, f]));

describe('holdingFigures for a stock that stopped trading', () => {
  it('a delisted holding reads Delisted on the price and keeps its return', () => {
    const f = figures({ delisted: true, noPrice: true, ltp: 0, unrealised: -1000, unrealisedPct: -100 });
    expect(f.ltp.value).toBe('₹0.00');
    expect(f.ltp.context).toMatch(/^Delisted/);
    expect(f.return.context).not.toBe('no price');
    expect(f.return.value).not.toBe('—');
  });

  it('a not-trading holding says so beside its price', () => {
    expect(figures({ notTrading: true }).ltp.context).toMatch(/^Not trading/);
  });

  it('an unpriced holding still reads no price', () => {
    const f = figures({ noPrice: true });
    expect(f.return.context).toBe('no price');
    expect(f.return.value).toBe('—');
  });
});
