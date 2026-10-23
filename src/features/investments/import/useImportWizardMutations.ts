'use client';

import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { multipartBodySerializer } from '@/lib/api/multipart';
import type { Schemas } from '@/lib/api/types';
import {
  EnqueueResponse,
  ImportCommitRequest,
  ImportPreview,
  ReconcileCommitRequest,
  ReconcilePreview,
  ReconciliationBroker,
} from '@/lib/types';

import { ImportAssetScope } from './types';

// The wizard's four network calls, isolated from useImportWizard.ts so that
// hook only has to orchestrate them (validate, call, route to the next
// step/job) rather than also carry their request/response wiring.
export function useImportWizardMutations() {
  const previewImportMutation = useMutation({
    mutationFn: (input: { file: File; brokerAccountId: string; password?: string }) =>
      api
        .POST('/api/v1/investments/imports/preview', {
          params: {
            query: {
              source: 'mf_cas',
              brokerAccountId: input.brokerAccountId,
              password: input.password,
            },
          },
          body: { file: input.file },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as ImportPreview),
  });
  const previewReconcileMutation = useMutation({
    mutationFn: (input: {
      broker: ReconciliationBroker;
      brokerAccountId: string;
      assetScope?: ImportAssetScope;
      tradebookFiles: File[];
      taxpnlFiles: File[];
      holdingsFile: File | null;
    }) =>
      api
        .POST('/api/v1/investments/imports/reconcile/preview', {
          params: {
            query: {
              broker: input.broker,
              brokerAccountId: input.brokerAccountId,
              assetScope: input.assetScope,
            },
          },
          body: {
            tradebookFiles: input.tradebookFiles,
            taxpnlFiles: input.taxpnlFiles,
            holdingsFile: input.holdingsFile ?? undefined,
          },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data! as ReconcilePreview),
  });

  // Both commit endpoints' generated request schemas mark fields required (e.g.
  // CommitRowDto/CommitExecutionDto.newInstrument, ParsedRowData.*) that are actually
  // optional/absent in practice — see "Spec follow-ups" in the migration report.
  const commitImportMutation = useMutation({
    mutationFn: (body: ImportCommitRequest) =>
      api
        .POST('/api/v1/investments/imports/commit', { body: body as Schemas['ImportCommitRequest'] })
        .then((r) => r.data! as EnqueueResponse),
  });
  const commitReconcileMutation = useMutation({
    mutationFn: (body: ReconcileCommitRequest) =>
      api
        .POST('/api/v1/investments/imports/reconcile/commit', {
          body: body as Schemas['ReconcileCommitRequest'],
        })
        .then((r) => r.data! as EnqueueResponse),
  });

  return {
    previewImportMutation,
    previewReconcileMutation,
    commitImportMutation,
    commitReconcileMutation,
  };
}
