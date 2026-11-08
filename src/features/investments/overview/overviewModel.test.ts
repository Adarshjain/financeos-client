import { describe, expect, it } from 'vitest';

import { employer, summary as epfSummary } from '../epf/epf.fixtures';
import { holdingRow, holdingsResponse } from '../holdings/holdings.fixtures';
import { npsAccount, npsSummary } from '../retirement/retirement.fixtures';
import { EPF_UPLOAD_HREF } from '../retirement/retirementModel';
import { epfCard, npsCards, overviewCards, overviewHero, overviewShare, shareText, stocksCard } from './overviewModel';

const ok = <T,>(data: T) => ({ ok: true as const, data });
const bad = { ok: false as const, reference: 'req-1' };
const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 90000, gain: 5260, schemes: [] }] });
const product = (card: ReturnType<typeof stocksCard>) => {
  if (card.kind !== 'product') throw new Error('product expected');
  return card;
};

describe('stocksCard', () => {
  it('has the Holdings hero numbers: value, day move, unrealised P&L with its percent and XIRR, prices date', () => {
    const card = product(stocksCard(ok(holdingsResponse([holdingRow(), holdingRow({ instrumentId: 'i2' })]))));
    expect(card).toMatchObject({
      title: 'Stocks & funds',
      subtitle: '2 holdings',
      href: '/investments/holdings',
      value: 638208,
      valueText: '₹6,38,208',
      dayMove: { text: '+₹3,566 today', tone: 'positive' },
      gain: { text: '+₹1,44,909', tone: 'positive', caption: '+29.4% · XIRR 24.1%' },
      delta: { text: '+₹1,44,909', tone: 'positive' },
      updated: '13 Oct',
      inNetWorth: true,
    });
  });

  it('is an import row when there are no holdings, with the Holdings empty wording', () => {
    expect(stocksCard(ok(holdingsResponse([])))).toEqual({
      kind: 'empty',
      id: 'stocks',
      title: 'Stocks & funds',
      line: 'Record a trade or import your tradebook.',
      action: { label: 'Import tradebook', href: '/investments/import' },
    });
  });

  it('is an error row when holdings could not be read', () => {
    expect(stocksCard(bad)).toEqual({ kind: 'error', id: 'stocks', title: 'Stocks & funds', what: 'holdings' });
  });
});

describe('epfCard', () => {
  it('has the balance, the hero interest as the gain, and the passbook month', () => {
    expect(product(epfCard(ok(epfSummary()), ok([employer()])))).toMatchObject({
      title: 'EPF',
      subtitle: 'Northwind Labs',
      href: '/investments/epf',
      value: 843210,
      valueText: '₹8,43,210',
      dayMove: null,
      gain: { text: '≈ ₹32,880', tone: undefined, caption: 'Interest so far' },
      delta: { text: '≈ ₹32,880 interest', tone: undefined },
      updated: 'Sep 2026',
    });
  });

  it('falls back to the UAN tail when there is no current employer, and has no gain without an interest figure', () => {
    expect(epfCard(ok(epfSummary({ interestEstimate: undefined })), ok([]))).toMatchObject({ subtitle: 'UAN ••4321', gain: null, delta: null });
  });

  it('is an upload row when no passbook was added', () => {
    expect(epfCard(ok(epfSummary({ hasData: false })), ok([]))).toMatchObject({
      kind: 'empty',
      title: 'EPF',
      line: 'Upload your EPFO passbook to see your balance here',
      action: { label: 'Upload passbook', href: EPF_UPLOAD_HREF },
    });
  });

  it('is an error row when the summary or the employers failed', () => {
    expect(epfCard(bad, ok([]))).toMatchObject({ kind: 'error', title: 'EPF' });
    expect(epfCard(ok(epfSummary()), bad)).toMatchObject({ kind: 'error', title: 'EPF' });
  });
});

describe('npsCards', () => {
  const cards = () => npsCards(ok(npsSummary([npsAccount(), child], { a1: '2026-11-05', a2: '2026-08-31' }))).map(product);

  it('has one row per account: yours, then the child as NPS Vatsalya, not in net worth', () => {
    expect(cards().map((c) => [c.title, c.subtitle, c.href, c.inNetWorth])).toEqual([
      ['NPS', 'PRAN ••7731', '/investments/nps?account=a1', true],
      ['NPS Vatsalya', 'For Aarav', '/investments/nps?account=a2', false],
    ]);
  });

  it("has each account's own value, gain and NAV date", () => {
    const [own, kid] = cards();
    expect(own).toMatchObject({ value: 594880, valueText: '₹5,94,880', gain: { text: '+₹1,44,880', tone: 'positive' }, updated: '5 Nov' });
    expect(kid).toMatchObject({ value: 95260, gain: { text: '+₹5,260', tone: 'positive' }, updated: '31 Aug' });
  });

  it('marks a loss danger and has no date when no holding has one', () => {
    const [card] = npsCards(ok(npsSummary([npsAccount({ tiers: [{ tier: 'I', value: 900, invested: 1000, gain: -100, schemes: [] }] })]))).map(product);
    expect(card.updated).toBe('');
    expect(card.gain).toEqual({ text: '−₹100', tone: 'danger' });
  });

  it('is one upload row with no accounts', () => {
    expect(npsCards(ok(npsSummary([])))).toEqual([
      { kind: 'empty', id: 'nps', title: 'NPS', line: 'Upload an NPS statement. New ones in Gmail come in on their own', action: { label: 'Upload statement', href: '/investments/import?type=nps' } },
    ]);
  });

  it('is an error row when NPS could not be read', () => {
    expect(npsCards(bad)).toEqual([{ kind: 'error', id: 'nps', title: 'NPS', what: 'NPS' }]);
  });
});

describe('overviewCards', () => {
  it('orders Stocks & funds, EPF, then the NPS accounts, and one failure leaves the others', () => {
    const cards = overviewCards({ holdings: bad, epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount(), child])) });
    expect(cards.map((c) => [c.kind, c.title])).toEqual([
      ['error', 'Stocks & funds'],
      ['product', 'EPF'],
      ['product', 'NPS'],
      ['product', 'NPS Vatsalya'],
    ]);
  });
});

describe('shareText', () => {
  it('reads whole percents, and <1% for a part above 0 and below 1%', () => {
    expect(shareText(50, 200)).toBe('25%');
    expect(shareText(1, 1000)).toBe('<1%');
    expect(shareText(10, 1000)).toBe('1%');
    expect(shareText(0, 1000)).toBe('0%');
    expect(shareText(5, 0)).toBe('0%');
  });
});

describe('overviewHero', () => {
  const all = () => overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount(), child])) });

  it('totals every product, child included, and shows the net-worth figure without the child', () => {
    const hero = overviewHero(all());
    expect(hero.totalText).toBe('₹21,71,558');
    expect(hero.netWorthText).toBe('₹20,76,298');
    expect(hero.without).toBeNull();
  });

  it('has no net-worth figure without a child account', () => {
    const hero = overviewHero(overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount()])) }));
    expect(hero.netWorthText).toBeNull();
    expect(hero.totalText).toBe('₹20,76,298');
  });

  it('has one segment per product with a value, in row order, with chart colours and legend shares', () => {
    const hero = overviewHero(all());
    expect(hero.segments.map((s) => [s.label, s.color])).toEqual([
      ['Stocks & funds 29%', 'chart-1'],
      ['EPF 39%', 'chart-2'],
      ['NPS 27%', 'chart-3'],
      ['NPS Vatsalya 4%', 'chart-4'],
    ]);
  });

  it('skips a product worth nothing, reads "<1%", and runs out of colours into chart-rest', () => {
    const tiny = npsAccount({ id: 'a9', tiers: [{ tier: 'I', value: 100, invested: 100, gain: 0, schemes: [] }] });
    const zero = npsAccount({ id: 'a8', tiers: [{ tier: 'I', value: 0, invested: 0, gain: 0, schemes: [] }] });
    const hero = overviewHero(overviewCards({ holdings: ok(holdingsResponse([holdingRow()])), epf: ok(epfSummary()), employers: ok([employer()]), nps: ok(npsSummary([npsAccount(), child, tiny, zero, npsAccount({ id: 'a7' })])) }));
    expect(hero.segments.map((s) => s.label)).toContain('NPS <1%');
    expect(hero.segments.every((s) => !s.label.startsWith('NPS 0%'))).toBe(true);
    expect(hero.segments.map((s) => s.color).slice(4)).toEqual(['chart-5', 'chart-rest']);
  });

  it('says what is missing when a product failed, never a silent partial total', () => {
    const hero = overviewHero(overviewCards({ holdings: bad, epf: bad, employers: ok([]), nps: ok(npsSummary([npsAccount()])) }));
    expect(hero.without).toBe('Without Stocks & funds and EPF');
    expect(hero.totalText).toBe('₹5,94,880');
    expect(overviewHero(overviewCards({ holdings: bad, epf: ok(epfSummary()), employers: ok([]), nps: ok(npsSummary([])) })).without).toBe('Without Stocks & funds');
  });

  it('has no bar with nothing loaded', () => {
    const hero = overviewHero(overviewCards({ holdings: bad, epf: bad, employers: bad, nps: bad }));
    expect(hero.segments).toEqual([]);
    expect(hero.totalText).toBe('₹0');
  });
});

describe('overviewShare', () => {
  it('is a product part of the total, and blank for an empty or failed row', () => {
    const cards = overviewCards({ holdings: ok(holdingsResponse([])), epf: ok(epfSummary()), employers: ok([]), nps: bad });
    expect(overviewShare(cards, cards[1])).toBe('100%');
    expect(overviewShare(cards, cards[0])).toBe('');
    expect(overviewShare(cards, cards[2])).toBe('');
  });
});
