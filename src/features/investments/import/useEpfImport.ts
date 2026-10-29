'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { ApiError } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

import {
  addEpfFiles,
  assignParams,
  EPF_UPLOAD_ERROR_CODES,
  type EpfBatchPreview,
  type EpfBatchResult,
  type EpfEmployerChoices,
  type EpfRefusedFile,
} from './epfImportModel';
import { useEpfImportMutations } from './useEpfImportMutations';
import type { ImportWizardNotify } from './useImportWizard';

/** The EPF passbook import: the queued PDFs, their preview in sections, the employer each section files under, and the commit. */
export function useEpfImport(notify: ImportWizardNotify) {
  const qc = useQueryClient();
  const { previewMutation, commitMutation } = useEpfImportMutations();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [files, setFiles] = React.useState<File[]>([]);
  const [preview, setPreview] = React.useState<EpfBatchPreview | null>(null);
  // The employers each new-employer section can be filed under; kept after one is picked so the pick can be undone.
  const [choices, setChoices] = React.useState<Record<string, EpfEmployerChoices>>({});
  const [result, setResult] = React.useState<EpfBatchResult | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [queueError, setQueueError] = React.useState<string | null>(null);
  const [refusedAll, setRefusedAll] = React.useState<EpfRefusedFile[] | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isCommitting, setIsCommitting] = React.useState(false);

  const clearMessages = () => {
    setChoices({});
    setUploadError(null);
    setQueueError(null);
    setRefusedAll(null);
  };

  const addFiles = (added: File[]) => {
    const next = addEpfFiles(files, added);
    setFiles(next.files);
    clearMessages();
    setQueueError(next.error);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    clearMessages();
  };

  const clearFiles = () => {
    setFiles([]);
    clearMessages();
  };

  /** Reads the passbooks; `override` is the employer picked for one section in the review step, absent on the first read. */
  const runPreview = async (override?: { key: string; value: string }) => {
    if (files.length === 0) {
      notify.error('Select your EPFO passbook PDFs.');
      return;
    }
    setIsPreviewing(true);
    setUploadError(null);
    setRefusedAll(null);
    try {
      const data = await previewMutation.mutateAsync({
        files,
        assign: preview && override ? assignParams(preview.sections, choices, override) : [],
      });
      if (data.sections.length === 0) {
        setPreview(null);
        setRefusedAll(data.refused);
        setStep(1);
        return;
      }
      setPreview(data);
      if (!override) {
        const next: Record<string, EpfEmployerChoices> = {};
        for (const s of data.sections) {
          if (!s.preview.employer.existingId && s.preview.employerOptions.length > 0) {
            next[s.key] = { newName: s.preview.employer.name, options: s.preview.employerOptions };
          }
        }
        setChoices(next);
      }
      setStep(2);
    } catch (err) {
      if (!override && err instanceof ApiError && EPF_UPLOAD_ERROR_CODES.includes(err.response.code)) {
        setUploadError(err.response.message);
        setStep(1);
      } else {
        notify.caught(err, "Couldn't preview import");
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  /** The upload form's submit, or the action bar's Preview (no event). */
  const handlePreviewSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    void runPreview();
  };

  const commit = async () => {
    if (files.length === 0 || !preview) return;
    setIsCommitting(true);
    try {
      const data = await commitMutation.mutateAsync({ files, assign: assignParams(preview.sections, choices) });
      setResult(data);
      setStep(3);
      invalidateInvestmentQueries(qc);
      void qc.invalidateQueries({ queryKey: ['epf'] });
    } catch (err) {
      notify.caught(err, "Couldn't commit import");
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFiles([]);
    setPreview(null);
    setResult(null);
    clearMessages();
  };

  return {
    step,
    setStep,
    files,
    addFiles,
    removeFile,
    clearFiles,
    preview,
    choices,
    result,
    uploadError,
    queueError,
    refusedAll,
    isPreviewing,
    isCommitting,
    handlePreviewSubmit,
    changeEmployer: (key: string, value: string) => void runPreview({ key, value }),
    commit,
    reset,
  };
}
