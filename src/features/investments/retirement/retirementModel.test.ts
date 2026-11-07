import { describe, expect, it } from 'vitest';

import { employer, settled, summary as epfSummary, transferred } from '../epf/epf.fixtures';
import { npsAccount, npsSummary } from './retirement.fixtures';
import { EPF_UPLOAD_HREF, retirementModel, retirementNetWorthTotal, retirementTableRows } from './retirementModel';

describe('retirementModel', () => {
  it('has an EPF row with the UAN tail, employer line, balance and passbook month', () => {
    const model = retirementModel(epfSummary(), [employer(), transferred(), settled()], npsSummary([]));
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      name: 'EPF',
      idLabel: 'UAN ••4321',
      sub: 'Northwind Labs · 2 earlier employers',
      href: '/investments/retirement/epf',
      valueText: '₹8,43,210',
      updated: 'Sep 2026',
      status: null,
    });
    expect(model.epfMissing).toBe(false);
    expect(model.npsMissing).toBe(true);
  });

  it('says Update passbook (warning) when the passbook is behind', () => {
    const model = retirementModel(epfSummary({ staleThrough: '2026-06-01' }), [employer()], npsSummary([]));
    expect(model.rows[0].status).toEqual({ label: 'Update passbook', tone: 'warning' });
  });

  it('has one row per NPS account: yours, and a child as its own row for the child', () => {
    const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 90000, gain: 5260, schemes: [] }] });
    const model = retirementModel(epfSummary({ hasData: false }), [], npsSummary([npsAccount(), child], { a1: '2026-11-05', a2: '2026-08-31' }));
    expect(model.epfMissing).toBe(true);
    expect(model.rows.map((r) => [r.name, r.idLabel, r.sub, r.valueText, r.updated])).toEqual([
      ['NPS', 'PRAN ••7731', 'Tier I + II', '₹5,94,880', '05/11/26'],
      ['NPS Vatsalya', 'PRAN ••5208', 'For Aarav', '₹95,260', '31/08/26'],
    ]);
  });

  it('links each NPS row to that account on the NPS screen', () => {
    const model = retirementModel(epfSummary({ hasData: false }), [], npsSummary([npsAccount(), npsAccount({ id: 'a2', pranMasked: 'XXXXXXX3390' })]));
    expect(model.rows.map((r) => r.href)).toEqual(['/investments/retirement/nps?account=a1', '/investments/retirement/nps?account=a2']);
  });

  it('flags a frozen Tier I as Frozen (danger)', () => {
    const model = retirementModel(epfSummary({ hasData: false }), [], npsSummary([npsAccount({ tier1Status: 'FROZEN' })]));
    expect(model.rows[0].status).toEqual({ label: 'Frozen', tone: 'danger' });
  });

  it('totals every row', () => {
    const model = retirementModel(epfSummary({ balance: 1000 }), [employer()], npsSummary([npsAccount()]));
    expect(model.total).toBe(1000 + 594880);
  });

  it('turns an EPF or NPS with nothing into an upload line, EPF first', () => {
    const none = retirementTableRows(retirementModel(epfSummary({ hasData: false }), [], npsSummary([])));
    expect(none.map((r) => [r.name, r.upload?.label, r.upload?.href])).toEqual([
      ['EPF', 'Upload passbook', EPF_UPLOAD_HREF],
      ['NPS', 'Upload statement', '/investments/import?type=nps'],
    ]);
    expect(EPF_UPLOAD_HREF).toBe('/investments/import?type=epf');
    const partial = retirementTableRows(retirementModel(epfSummary(), [employer()], npsSummary([])));
    expect(partial.map((r) => [r.name, r.upload?.label ?? null])).toEqual([
      ['EPF', null],
      ['NPS', 'Upload statement'],
    ]);
  });

  it('counts EPF and your own NPS in net worth, never a child Vatsalya account', () => {
    const child = npsAccount({ id: 'a2', relation: 'CHILD', sector: 'VATSALYA', holderName: 'Aarav', pranMasked: 'XXXXXXX5208', tier1Status: null, tiers: [{ tier: 'I', value: 95260, invested: 1, gain: 1, schemes: [] }] });
    const model = retirementModel(epfSummary(), [employer()], npsSummary([npsAccount(), child]));
    expect(model.rows.map((r) => [r.name, r.inNetWorth])).toEqual([['EPF', true], ['NPS', true], ['NPS Vatsalya', false]]);
    expect(model.total).toBe(1533350);
    expect(retirementNetWorthTotal(model)).toBe(843210 + 594880);
  });

  it('floors EPF and your own NPS each at zero in net worth, like the server', () => {
    const model = retirementModel(epfSummary(), [employer()], npsSummary([npsAccount()]));
    const negativeEpf = { ...model, rows: model.rows.map((r) => (r.kind === 'epf' ? { ...r, value: -5000 } : r)) };
    expect(retirementNetWorthTotal(negativeEpf)).toBe(594880);
  });
});
