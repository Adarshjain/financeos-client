import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NpsBanners } from './NpsFigures';
import type { NpsSummary } from './npsModel';

const flags = { hasEstimated: false, unitsMismatch: false, statementStale: false, navStale: false } as NpsSummary['flags'];

describe('NpsBanners frozen', () => {
  it('hides the frozen banner when the PRAN is not frozen', () => {
    const { container } = render(<NpsBanners flags={flags} uploadHref="/x" />);
    expect(container.textContent).toBe('');
  });
  it('shows the frozen banner with the month', () => {
    render(<NpsBanners flags={flags} uploadHref="/x" frozenAsOf="2026-10-31" />);
    expect(screen.getByText('This PRAN is frozen per your latest statement (Oct 2026).')).toBeTruthy();
  });
  it('puts the frozen banner before the estimated one', () => {
    const { container } = render(<NpsBanners flags={{ ...flags, hasEstimated: true }} uploadHref="/x" frozenAsOf="2026-10-31" />);
    const t = container.textContent ?? '';
    expect(t.indexOf('frozen')).toBeGreaterThanOrEqual(0);
    expect(t.indexOf('frozen')).toBeLessThan(t.indexOf('Some units are estimated'));
  });
});
