import { describe, expect, it } from 'vitest';

import { reconcilePreview } from './import.fixtures';
import { buildInitialReconcileRowStates, buildReconcileCommitRequest } from './importWizardModel';

const commit = (preview: ReturnType<typeof reconcilePreview>) =>
  buildReconcileCommitRequest({
    broker: 'groww',
    brokerAccountId: 'b1',
    reconcilePreview: preview,
    rowStates: buildInitialReconcileRowStates(preview.executions),
    fnoRowStates: {},
  });

describe('reconcile commit: holdings snapshot', () => {
  it("sends the preview's holdings snapshot unchanged", () => {
    const holdingsSnapshot = {
      asOfDate: '2026-11-12',
      items: [
        { isin: 'INE154A01025', symbol: 'ITC', quantity: 120 },
        { isin: null, symbol: 'ITCHOTELS', quantity: 12 },
      ],
    };
    expect(commit(reconcilePreview({ holdingsSnapshot })).holdingsSnapshot).toBe(holdingsSnapshot);
  });

  it('sends none when the preview had none', () => {
    expect(commit(reconcilePreview()).holdingsSnapshot).toBeUndefined();
  });
});
