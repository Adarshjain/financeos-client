import { describe, expect, it } from 'vitest';

import type { WidgetResponse } from '@/lib/dashboards.types';

import { KPI_BUILTIN_KEYS, widgetMenuItems } from './widgetFrame.model';

const builtin = (key: string, kind: 'template' | 'component'): WidgetResponse =>
  ({
    id: 'w',
    kind: 'builtin',
    reportId: null,
    builtinKey: key,
    params: {},
    title: null,
    layout: { x: 0, y: 0, w: 50, h: 24 },
    builtin: { key, label: key, minW: 50, kind, href: null, category: 'overview' },
  }) as unknown as WidgetResponse;

describe('widgetMenuItems for KPI built-ins', () => {
  it('Net worth has no View underlying data item (its value tap opens it)', () => {
    expect(KPI_BUILTIN_KEYS).toEqual(['net_worth']);
    expect(widgetMenuItems(builtin('net_worth', 'template'), { canEditSettings: true })).toEqual(['settings', 'duplicate']);
  });

  it('other built-ins have none', () => {
    for (const key of ['allocation', 'spend_heatmap', 'rewards_earned', 'upcoming', 'milestone_progress', 'cap_headroom']) {
      expect(widgetMenuItems(builtin(key, 'template'), { canEditSettings: true })).not.toContain('underlying');
    }
    for (const key of ['top_movers', 'card_utilisation', 'account_tile', 'bills_due']) {
      expect(widgetMenuItems(builtin(key, 'component'), { canEditSettings: true })).not.toContain('underlying');
    }
  });
});
