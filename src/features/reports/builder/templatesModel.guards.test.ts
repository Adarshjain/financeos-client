import { describe, expect, it } from 'vitest';

import type { FieldGuard, ReportCatalog } from '@/lib/reports.types';

import { catalogFixture } from './editor.fixtures';
import { initialEditorState, workingCatalog } from './editorStateModel';
import { guardProblems } from './guardsModel';
import { TEMPLATES } from './templatesModel';

// Guards as the server sends them: on measures the templates do not use, plus none on the ones they do. A template
// that picked up a blocked combination would show the warning on open and could not be saved.
const guards: Record<string, FieldGuard[]> = {
  amount: [{ kind: 'needs', fields: ['category'], aggregations: null, reason: 'mixes debits and credits' }],
  isExcluded: [],
};
const guarded: ReportCatalog = {
  ...catalogFixture,
  datasources: catalogFixture.datasources.map((ds) =>
    ds.name === 'transactions' ? { ...ds, fields: ds.fields.map((f) => (guards[f.name] ? { ...f, guards: guards[f.name] } : f)) } : ds,
  ),
};

describe('templates and guards', () => {
  it('open with no guard problem', () => {
    for (const t of TEMPLATES) {
      const state = initialEditorState({ catalog: guarded, templateId: t.id });
      expect(state.name, t.id).toBe(t.name);
      expect(guardProblems(state, workingCatalog(guarded, t.datasource)), t.id).toEqual([]);
    }
  });
});
