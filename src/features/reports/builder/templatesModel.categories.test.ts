import { describe, expect, it } from 'vitest';

import { REPORT_TEMPLATES } from '@/features/reports/list/reportsListModel';

import { catalogWithCountsFixture } from './editor.fixtures';
import { initialEditorState, workingCatalog } from './editorStateModel';
import { guardProblems } from './guardsModel';
import { serializeDefinition, validationIssues } from './serializeModel';
import { findTemplate } from './templatesModel';

const counts = { field: 'countsInTotals', operator: 'is', value: true };
const catalog = workingCatalog(catalogWithCountsFixture, 'transactions');

const open = (id: string) => initialEditorState({ catalog: catalogWithCountsFixture, templateId: id });

describe('the category templates', () => {
  it.each([
    ['spend-by-category-and-sub-category', 'Spend by category and sub-category'],
    ['category-spend-by-month', 'Category spend by month'],
    ['income-by-category', 'Income by category'],
  ])('lists %s on the Reports page and defines it', (id, label) => {
    expect(REPORT_TEMPLATES.find((t) => t.id === id)?.label).toBe(label);
    expect(findTemplate(id)?.name).toBe(label);
    expect(open(id)).toMatchObject({ mode: 'create', name: label, type: 'CHART', datasource: 'transactions' });
  });

  it('breaks spend down by category and sub-category this month', () => {
    expect(serializeDefinition(open('spend-by-category-and-sub-category'), catalog)).toEqual({
      chartType: 'breakdown',
      dimension: { field: 'category' },
      subDimension: { field: 'subcategory' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [{ field: 'date', operator: 'this_month' }, counts],
    });
  });

  it('stacks monthly spend by category over the last 6 months', () => {
    expect(serializeDefinition(open('category-spend-by-month'), catalog)).toEqual({
      chartType: 'stackedBar',
      dimension: { field: 'date', granularity: 'month' },
      series: { field: 'category' },
      measure: { field: 'spend', aggregation: 'sum' },
      filters: [{ field: 'date', operator: 'last_x_months', value: { amount: 6 } }, counts],
    });
  });

  it('sums income by category this month: credits that count', () => {
    expect(serializeDefinition(open('income-by-category'), catalog)).toEqual({
      chartType: 'bar',
      dimension: { field: 'category' },
      measure: { field: 'amount', aggregation: 'sum' },
      filters: [{ field: 'date', operator: 'this_month' }, { field: 'type', operator: 'is', value: 'CREDIT' }, counts],
    });
  });

  it.each(['spend-by-category-and-sub-category', 'category-spend-by-month', 'income-by-category'])('%s is a valid draft with no guard problem', (id) => {
    const state = open(id);
    expect(validationIssues(state, catalog)).toEqual([]);
    expect(guardProblems(state, catalog)).toEqual([]);
  });

  it('spend vs last month counts real spend instead of hiding excluded rows', () => {
    const def = serializeDefinition(open('spend-vs-last-month-by-category'), catalog) as { filters: unknown[] };
    expect(def.filters).toEqual([{ field: 'date', operator: 'this_month' }, counts]);
  });

  it('opens blank when the catalog has no counts field', async () => {
    const { catalogFixture } = await import('./editor.fixtures');
    for (const id of ['spend-by-category-and-sub-category', 'category-spend-by-month', 'income-by-category']) {
      expect(initialEditorState({ catalog: catalogFixture, templateId: id })).toMatchObject({ type: 'KPI' });
    }
  });
});
