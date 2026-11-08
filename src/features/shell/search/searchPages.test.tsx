import { describe, expect, it } from 'vitest';

import { appHref } from '../routes';
import { buildSearchGroups } from './searchItems';
import { searchPages } from './searchPages';

const labels = () => searchPages().map((p) => p.label);

describe('searchPages', () => {
  it('lists every tab and section next to the rail pages', () => {
    for (const label of [
      'Home', 'Settings', 'Tags', 'Import', 'Stocks & funds', 'EPF', 'NPS', 'Dividends', 'Corporate actions', 'F&O',
      'Instruments', 'Updates', 'Calendar', 'Which card?', 'Earning rules', 'Sync health', 'Connections', 'Imports',
      'Notifications', 'AI', 'Debug', 'Loans', 'Import a file',
    ]) {
      expect(labels(), label).toContain(label);
    }
  });

  it('has no duplicate hrefs and skips a tab that equals its parent page', () => {
    const hrefs = searchPages().map((p) => appHref(p.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(searchPages().find((p) => p.label === 'Tradebook')).toMatchObject({ href: '/investments/tradebook', context: 'Investments · Stocks & funds' });
    const all = searchPages();
    for (const label of ['All', 'Holdings', 'To do', 'List', 'Overview']) expect(all.filter((p) => p.label === label)).toHaveLength(0);
  });

  it('gives each nested page its area as context and the area icon', () => {
    const find = (label: string) => searchPages().find((p) => p.label === label)!;
    expect(find('Sync health').context).toBe('Settings · Data sources');
    for (const label of ['Dividends', 'Tradebook', 'F&O', 'Corporate actions']) expect(find(label).context, label).toBe('Investments · Stocks & funds');
    expect(find('Stocks & funds')).toMatchObject({ href: '/investments/holdings', context: 'Investments' });
    expect(find('EPF')).toMatchObject({ href: '/investments/epf', context: 'Investments' });
    expect(find('NPS')).toMatchObject({ href: '/investments/nps', context: 'Investments' });
    expect(searchPages().some((p) => p.label === 'Retirement' || p.label === 'Activity' || p.label === 'Trades')).toBe(false);
    expect(find('Updates').icon).toBe(searchPages().find((p) => p.id === 'inbox')!.icon);
    expect(find('Home').context).toBeUndefined();
    expect(find('Import a file').icon).toBe('upload');
    expect(find('Import a file').context).toBeUndefined();
  });

  it('matches on context words', () => {
    const pages = searchPages();
    const hits = (query: string) => {
      const groups = buildSearchGroups({ query, result: null, pages, actions: [], go: () => {}, onAddTransaction: () => {}, onMarkBillPaid: () => {} });
      return groups.find((g) => g.id === 'pages')!.items.map((i) => i.id);
    };
    expect(hits('settings')).toEqual(expect.arrayContaining(['pages:settings', 'pages:settings:ai', 'pages:data-sources:sync']));
    expect(hits('epf')).toContain('pages:investments:epf');
    expect(hits('stocks')).toEqual(expect.arrayContaining(['pages:investments:stocks', 'pages:investments:tradebook', 'pages:investments:fno']));
    expect(hits('nps')).toContain('pages:investments:nps');
    expect(hits('investments').length).toBeLessThanOrEqual(8);
    expect(hits('tradebook')).toContain('pages:investments:tradebook');
  });
});
