import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }));
vi.mock('@/lib/lazy/LazyChart', () => ({ LazyChart: () => <div data-testid="sample-chart" /> }));

import { api } from '@/lib/api/client';

import { sampleHeatmap } from './previewSamples';
import { hasPreview, WIDGET_PREVIEWS, WidgetPreview } from './WidgetPreview';

const KEYS = [
  'net_worth',
  'attention',
  'upcoming',
  'bills_due',
  'card_utilisation',
  'milestone_progress',
  'cap_headroom',
  'portfolio_snapshot',
  'top_movers',
  'allocation',
  'tax_harvest',
  'spend_heatmap',
  'loan_payoff',
  'lending_balances',
  'account_tile',
  'emergency_fund',
  'rewards_earned',
  'shortcuts',
];

describe('WidgetPreview', () => {
  it('has its own preview for each of the 18 built-ins', () => {
    expect(Object.keys(WIDGET_PREVIEWS).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) expect(hasPreview(key)).toBe(true);
  });

  it.each(KEYS)('%s renders sample content without fetching', (key) => {
    render(<WidgetPreview builtinKey={key} title="Widget" />);
    const frame = screen.getByTestId('widget-preview-frame');
    expect(frame.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(within(frame).queryByTestId('generic-preview')).toBeNull();
    expect(api.GET).not.toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('captions the preview above its frame, outside it, and shows the widget under its title', () => {
    render(<WidgetPreview builtinKey="net_worth" title="Net worth" />);
    const caption = screen.getByText('Preview · sample data');
    const frame = screen.getByTestId('widget-preview-frame');
    expect(frame).not.toContainElement(caption);
    expect(caption.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(frame).getByText('Net worth')).toBeInTheDocument();
    expect(within(frame).getByText('₹48,62,300')).toBeInTheDocument();
  });

  it('says there is no preview for an unknown or prototype key', () => {
    expect(hasPreview('nope')).toBe(false);
    expect(hasPreview('toString')).toBe(false);
    render(<WidgetPreview builtinKey="nope" title="Nope" />);
    expect(screen.getByTestId('generic-preview')).toHaveTextContent('No preview for this widget yet.');
    expect(screen.getByText('Preview · sample data')).toBeInTheDocument();
  });

  it('the heatmap sample covers the 12 weeks up to today', () => {
    const now = new Date('2026-10-15T06:00:00Z');
    const data = sampleHeatmap(now);
    expect(data.categories).toHaveLength(84);
    expect(data.categories.at(-1)).toBe('2026-10-15');
    expect(data.categories[0]).toBe('2026-07-24');
    expect(data.series[0].data.some((v) => (v ?? 0) > 0)).toBe(true);
  });
});
