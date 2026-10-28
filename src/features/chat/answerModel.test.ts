import { describe, expect, it } from 'vitest';

import { answerText, type AssistantRecord, formatAnswerCell, metaLine, stepLabel, stepMeta, tableToTsv } from './answerModel';

const record = (over: Partial<AssistantRecord> = {}): AssistantRecord => ({ kind: 'assistant', id: 'a', status: 'COMPLETE', steps: [], ...over });

describe('tableToTsv', () => {
  it('writes headers then rows, tab separated, with money formatted', () => {
    const tsv = tableToTsv({
      columns: [
        { key: 'c', label: 'Category' },
        { key: 's', label: 'Spent', format: 'inr' },
      ],
      rows: [{ c: 'Food', s: 42180 }, { c: 'Other\tname', s: null }],
    });
    expect(tsv).toBe('Category\tSpent\nFood\t₹42,180\nOther name\t—');
  });
});

describe('formatAnswerCell', () => {
  it('groups numbers the Indian way', () => {
    expect(formatAnswerCell(1234567, 'number')).toBe('12,34,567');
    expect(formatAnswerCell(true)).toBe('true');
  });
});

describe('metaLine', () => {
  it('counts the queries, singular or plural, with seconds to one decimal', () => {
    const step = { action: 'run_sql', summary: 's' };
    expect(metaLine(record({ steps: [step], durationMs: 2140 }))).toBe('Ran 1 query · 2.1 s');
    expect(metaLine(record({ steps: [step, step], durationMs: 4200 }))).toBe('Ran 2 queries · 4.2 s');
    expect(metaLine(record({ steps: [step] }))).toBe('Ran 1 query');
  });
});

describe('steps', () => {
  it('prefers the label and falls back to the summary', () => {
    expect(stepLabel({ action: 'x', label: 'Read your categories', summary: 's' })).toBe('Read your categories');
    expect(stepLabel({ action: 'x', summary: 'Ran a query' })).toBe('Ran a query');
  });

  it('shows rows and time as the meta', () => {
    expect(stepMeta({ action: 'x', summary: 's', rowCount: 1284, durationMs: 1600 })).toBe('1,284 rows · 1.6 s');
    expect(stepMeta({ action: 'x', summary: 's', rowCount: 1 })).toBe('1 row');
    expect(stepMeta({ action: 'x', summary: 's' })).toBeUndefined();
  });
});

describe('answerText', () => {
  it('is the prose, or the question the assistant asked', () => {
    expect(answerText(record({ answer: ' Hello ' }))).toBe('Hello');
    expect(answerText(record({ clarify: 'Which period?' }))).toBe('Which period?');
    expect(answerText(record())).toBe('');
  });
});
