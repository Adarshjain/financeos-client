import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({ api: { GET: vi.fn(), POST: vi.fn() } }));

import { api } from '@/lib/api/client';

import { GenericPreview, previewFor, WIDGET_PREVIEWS, WidgetPreview } from '../WidgetPreview';

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
    for (const key of KEYS) expect(previewFor(key)).not.toBe(GenericPreview);
  });

  it.each(KEYS)('%s renders sample content without fetching', (key) => {
    render(<WidgetPreview builtinKey={key} />);
    const frame = screen.getByTestId('widget-preview-frame');
    expect(frame.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(within(frame).queryByTestId('generic-preview')).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
    expect(api.POST).not.toHaveBeenCalled();
  });

  it('captions the preview above its frame, outside it', () => {
    render(<WidgetPreview builtinKey="net_worth" />);
    const caption = screen.getByText('Preview · sample data');
    const frame = screen.getByTestId('widget-preview-frame');
    expect(frame).not.toContainElement(caption);
    expect(caption.compareDocumentPosition(frame) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(frame).getByText('₹48,62,300')).toBeInTheDocument();
  });

  it('falls back to the generic placeholder for an unknown or prototype key', () => {
    expect(previewFor('nope')).toBe(GenericPreview);
    expect(previewFor('toString')).toBe(GenericPreview);
    render(<WidgetPreview builtinKey="nope" />);
    expect(screen.getByTestId('generic-preview')).toBeInTheDocument();
    expect(screen.getByText('Preview · sample data')).toBeInTheDocument();
  });

  it('colours sample utilisation on the shared 30/70 scale', () => {
    render(<WidgetPreview builtinKey="card_utilisation" />);
    const bars = Array.from(screen.getByTestId('widget-preview-frame').querySelectorAll('.h-1\\.5 > div'));
    expect(bars.map((b) => b.className.match(/bg-(emerald|amber|rose)-500/)?.[1])).toEqual(['emerald', 'amber', 'rose']);
  });
});
