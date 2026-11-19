import { expectStatus } from '../fixtures/api';
import { runAdHoc, seedCategoriesDataset } from '../fixtures/seed/reports';
import { expect, freshUser, test } from '../fixtures/test';

type Filter = { field: string; operator: string; value?: unknown };
type ChartResult = { categories: string[]; series: Array<{ data: Array<number | null> }> };
type TableResult = { rows: Array<Record<string, unknown>> };

const thisMonth: Filter = { field: 'date', operator: 'this_month' };
const counts: Filter = { field: 'countsInTotals', operator: 'is', value: true };

/** The bucket label to value map of a chart's first series. */
function buckets(data: ChartResult): Record<string, number> {
  return Object.fromEntries(data.categories.map((c, i) => [c, Number(data.series[0].data[i] ?? 0)]));
}

test.describe('Report categories API (@api)', () => {
  test('countsInTotals keeps real spend and leaves out the self transfer and an excluded row', async ({ request }) => {
    const { api } = await freshUser(request, 'report-counts');
    const seed = await seedCategoriesDataset(api);
    const total = (filters: Filter[]) =>
      runAdHoc(api, { type: 'KPI', datasource: 'transactions', definition: { measure: 'spend', aggregation: 'sum', filters } } as never).then(
        (d) => (d as unknown as { value: number }).value,
      );

    expect(await total([thisMonth, counts])).toBe(seed.countedSpend);
    // Everything, as a report without the rule would add it up.
    expect(await total([thisMonth])).toBe(seed.countedSpend + seed.amounts.selfTransfer + seed.amounts.excluded);
    // The other side of the rule: only what it leaves out.
    expect(await total([thisMonth, { field: 'countsInTotals', operator: 'is', value: false }])).toBe(seed.amounts.selfTransfer + seed.amounts.excluded);
  });

  test('the rule leaves out the self transfer and the excluded row from the listed rows too', async ({ request }) => {
    const { api } = await freshUser(request, 'report-counts-rows');
    const seed = await seedCategoriesDataset(api);
    const table = (await runAdHoc(api, {
      type: 'TABLE',
      datasource: 'transactions',
      definition: { mode: 'raw', columns: ['date', 'description', 'amount'], filters: [thisMonth, counts] },
    } as never)) as unknown as TableResult;
    const names = table.rows.map((r) => r.description).sort();
    const { selfTransfer, excluded, ...kept } = seed.descriptions;
    expect(names).toEqual(Object.values(kept).sort());
    expect(names).not.toContain(selfTransfer);
    expect(names).not.toContain(excluded);
  });

  test('the sub-category dimension names buckets "Category · Sub", "Category · Others" and "Uncategorized"', async ({ request }) => {
    const { api } = await freshUser(request, 'report-subcategory');
    const seed = await seedCategoriesDataset(api);
    const data = (await runAdHoc(api, {
      type: 'CHART',
      datasource: 'transactions',
      definition: {
        chartType: 'bar',
        dimension: { field: 'subcategory' },
        measure: { field: 'spend', aggregation: 'sum' },
        filters: [thisMonth, counts],
      },
    } as never)) as unknown as ChartResult;

    expect(buckets(data)).toEqual({
      'Food · Delivery': seed.amounts.delivery,
      'Food · Dining': seed.amounts.dining,
      'Food · Others': seed.amounts.foodOthers,
      'Transport · Cabs': seed.amounts.cabs,
      'Transport · Others': seed.amounts.transportOthers,
      Uncategorized: seed.amounts.uncategorised,
    });
    expect(data.categories).not.toContain('(none)');
  });

  test('a category breakdown nests the same labels as its sub-rows', async ({ request }) => {
    const { api } = await freshUser(request, 'report-breakdown');
    const seed = await seedCategoriesDataset(api);
    const data = (await runAdHoc(api, {
      type: 'CHART',
      datasource: 'transactions',
      definition: {
        chartType: 'breakdown',
        dimension: { field: 'category' },
        subDimension: { field: 'subcategory' },
        subLimit: 10,
        measure: { field: 'spend', aggregation: 'sum' },
        filters: [thisMonth, counts],
      },
    } as never)) as unknown as ChartResult & { breakdown: { rows: Array<{ subRows: Array<{ label: string; value: number }> }> } };

    const food = data.breakdown.rows[data.categories.indexOf('Food')];
    expect(Object.fromEntries(food.subRows.map((s) => [s.label, s.value]))).toEqual({
      'Food · Delivery': seed.amounts.delivery,
      'Food · Dining': seed.amounts.dining,
      'Food · Others': seed.amounts.foodOthers,
    });
  });

  test('filtering a sub-category by "Category · Others" returns only that category\'s rows without a sub-category', async ({ request }) => {
    const { api } = await freshUser(request, 'report-others');
    const seed = await seedCategoriesDataset(api);
    const rows = async (value: string) => {
      const table = (await runAdHoc(api, {
        type: 'TABLE',
        datasource: 'transactions',
        definition: {
          mode: 'raw',
          columns: ['date', 'description', 'amount'],
          filters: [thisMonth, { field: 'subcategory', operator: 'is', value }],
        },
      } as never)) as unknown as TableResult;
      return table.rows.map((r) => r.description);
    };

    // Food's own row without a sub-category: not Transport's, not a sub-category row, not the uncategorised one.
    expect(await rows('Food · Others')).toEqual([seed.descriptions.foodOthers]);
    expect(await rows('Transport · Others')).toEqual([seed.descriptions.transportOthers]);
  });

  test('the transactions catalog lists Category, Sub-category, Tag in that order and has the counts field', async ({ request }) => {
    const { api } = await freshUser(request, 'report-catalog');
    const res = await api.GET('/api/v1/report/datasource');
    expectStatus(res, 200);
    const fields = res.data!.datasources.find((d) => d.name === 'transactions')!.fields;
    const names = fields.map((f) => f.name);
    expect(names.indexOf('category')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('category')).toBeLessThan(names.indexOf('subcategory'));
    expect(names.indexOf('subcategory')).toBeLessThan(names.indexOf('tag'));
    expect(fields.find((f) => f.name === 'countsInTotals')).toMatchObject({
      label: 'Counts as spend or income',
      type: 'boolean',
      role: 'filter',
    });
  });
});
