import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NetWorthValue } from './AccountsStreamed';

async function renderNetWorth(value: number) {
  render(await NetWorthValue({ netWorth: Promise.resolve(value) }));
}

describe('NetWorthValue', () => {
  it('shows a negative net worth in danger', async () => {
    await renderNetWorth(-1500);
    expect(screen.getByText(/1,500/).className).toMatch(/danger/);
  });

  it('keeps a positive net worth neutral', async () => {
    await renderNetWorth(1500);
    expect(screen.getByText(/1,500/).className).not.toMatch(/danger/);
  });
});
