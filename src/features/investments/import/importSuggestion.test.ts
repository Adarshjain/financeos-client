import { describe, expect, it } from 'vitest';

import { execution, reconcilePreview } from './import.fixtures';
import { mapInstrument, setCreateNew } from './importModel';
import { buildInitialReconcileRowStates, buildReconcileCommitRequest } from './importWizardModel';
import { getUnresolvedRows } from './types';

const suggestion = {
  type: 'stock' as const,
  name: 'Acme Industries Ltd',
  symbol: 'ACMEIND',
  exchange: 'NSE',
  isin: 'INE000X01011',
};

const preview = () =>
  reconcilePreview({
    executions: [
      execution({ rowIndex: 1 }),
      execution({ rowIndex: 2, symbol: 'ACMEIND', isin: 'INE000X01011', matchedInstrument: undefined, suggestedInstrument: suggestion }),
      execution({ rowIndex: 3, symbol: 'OLDSRV', isin: 'INE000X01029', matchedInstrument: undefined }),
    ],
  });

describe('import wizard: suggested instruments', () => {
  it('starts an unmatched row with a suggestion as create-new from the suggestion', () => {
    const states = buildInitialReconcileRowStates(preview().executions);
    expect(states[2].createNew).toBe(true);
    expect(states[2].newInstrument).toMatchObject(suggestion);
    expect(states[2].selectedInstrumentId).toBeUndefined();
  });

  it('keeps a matched row mapped and an unmatched row without a suggestion as before', () => {
    const states = buildInitialReconcileRowStates(preview().executions);
    expect(states[1]).toMatchObject({ createNew: false, selectedInstrumentId: 'i-zomato' });
    expect(states[3]).toEqual({
      skip: false,
      selectedInstrumentId: undefined,
      createNew: false,
      newInstrument: { type: 'stock', name: 'OLDSRV', symbol: 'OLDSRV', exchange: 'NSE', isin: 'INE000X01029', yahooSymbol: undefined },
    });
  });

  it('leaves only rows with neither a match nor a suggestion unresolved', () => {
    const p = preview();
    const states = buildInitialReconcileRowStates(p.executions);
    expect(getUnresolvedRows(p, states).map((r) => r.rowIndex)).toEqual([3]);
  });

  it('keeps the suggestion when create-new is turned off and on again', () => {
    const p = preview();
    const states = buildInitialReconcileRowStates(p.executions);
    const again = setCreateNew(setCreateNew(states, 2, false), 2, true);
    expect(again[2].newInstrument).toMatchObject(suggestion);
  });

  it('sends newInstrument for a suggestion row, and instrumentId once it is mapped', () => {
    const p = preview();
    const states = buildInitialReconcileRowStates(p.executions);
    const build = (rowStates: typeof states) =>
      buildReconcileCommitRequest({ broker: 'groww', brokerAccountId: 'b1', reconcilePreview: p, rowStates, fnoRowStates: {} }).executions.find((e) => e.rowIndex === 2)!;

    const created = build(states);
    expect(created.instrumentId).toBeUndefined();
    expect(created.newInstrument).toMatchObject(suggestion);

    const mapped = build(mapInstrument(states, 2, { id: 'i-acme', name: 'Acme Existing' }));
    expect(mapped.instrumentId).toBe('i-acme');
    expect(mapped.newInstrument).toBeUndefined();
  });
});
