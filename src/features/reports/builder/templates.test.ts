import { describe, expect, it } from 'vitest';

import { REPORT_TEMPLATES } from '@/features/reports/list/reportsList';
import type { ReportCatalog } from '@/lib/reports.types';

import { catalogFixture, savedChart } from './editor.fixtures';
import { initialEditorState, snapshot, workingCatalog } from './editorState';
import { serializeDefinition } from './serialize';
import { findTemplate, templateFits,TEMPLATES } from './templates';

describe('templates', () => {
  it('defines every template the list offers, so no Use opens a blank report', () => {
    expect(TEMPLATES.map((t) => t.id).sort()).toEqual(REPORT_TEMPLATES.map((t) => t.id).sort());
  });

  it('only uses fields the datasource has', () => {
    for (const t of TEMPLATES) expect(templateFits(t, workingCatalog(catalogFixture, t.datasource))).toBe(true);
  });

  it('is unusable when a field it uses is missing', () => {
    const [spend] = TEMPLATES;
    const fields = workingCatalog(catalogFixture, 'transactions').fields.filter((f) => f.name !== 'category');
    expect(templateFits(spend, { ...workingCatalog(catalogFixture, 'transactions'), fields })).toBe(false);
  });

  it('reads the template id from a string or the first of a list', () => {
    expect(findTemplate('dividend-income-by-fy')?.id).toBe('dividend-income-by-fy');
    expect(findTemplate(['dividend-income-by-fy', 'x'])?.id).toBe('dividend-income-by-fy');
    expect(findTemplate('nope')).toBeUndefined();
    expect(findTemplate(undefined)).toBeUndefined();
  });
});

describe('initialEditorState', () => {
  it('starts a blank KPI on the first datasource, hiding excluded transactions', () => {
    const s = initialEditorState({ catalog: catalogFixture });
    expect(s).toMatchObject({ mode: 'create', type: 'KPI', datasource: 'transactions', name: '' });
    expect(s.filters).toEqual([{ field: 'isExcluded', operator: 'is', value: false }]);
  });

  it('prefills the draft from a template, as a new report', () => {
    const s = initialEditorState({ catalog: catalogFixture, templateId: 'spend-vs-last-month-by-category' });
    expect(s).toMatchObject({ mode: 'create', reportId: undefined, type: 'CHART', datasource: 'transactions', name: 'Spend vs last month by category' });
    expect(serializeDefinition(s, workingCatalog(catalogFixture, 'transactions'))).toMatchObject({
      chartType: 'bar',
      dimension: { field: 'category' },
      measure: { field: 'spend', aggregation: 'sum' },
      limit: 8,
      other: true,
      comparison: { enabled: true, period: 'previous_period', higherIsBetter: false },
      filters: [
        { field: 'date', operator: 'this_month' },
        { field: 'isExcluded', operator: 'is', value: false },
      ],
    });
  });

  it('prefills the dividend template on its own datasource', () => {
    const s = initialEditorState({ catalog: catalogFixture, templateId: 'dividend-income-by-fy' });
    expect(s).toMatchObject({ datasource: 'dividends', chart: { dimensionField: 'payDate', dimensionGranularity: 'fy' } });
  });

  it('opens blank for an unknown template, or one whose datasource is gone', () => {
    const blank = snapshot(initialEditorState({ catalog: catalogFixture }));
    expect(snapshot(initialEditorState({ catalog: catalogFixture, templateId: 'no-such-template' }))).toBe(blank);
    expect(snapshot(initialEditorState({ catalog: catalogFixture, templateId: 'bogus' }))).toBe(blank);
    const noDividends: ReportCatalog = { ...catalogFixture, datasources: catalogFixture.datasources.filter((d) => d.name !== 'dividends') };
    expect(initialEditorState({ catalog: noDividends, templateId: 'dividend-income-by-fy' })).toMatchObject({ type: 'KPI' });
  });

  it('opens a saved report in edit mode and ignores a template', () => {
    const s = initialEditorState({ catalog: catalogFixture, report: savedChart, templateId: 'dividend-income-by-fy' });
    expect(s).toMatchObject({ mode: 'edit', reportId: 'r1', name: 'Spend by category', description: 'Where it goes', type: 'CHART' });
  });
});
