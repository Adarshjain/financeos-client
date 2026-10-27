'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { ApiError } from '@/lib/api/client';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';

import { EPF_UPLOAD_ERROR_CODES, type EpfEmployerChoices, type EpfImportResult, type EpfPreview, NEW_EMPLOYER } from './epfImportModel';
import { useEpfImportMutations } from './useEpfImportMutations';
import type { ImportWizardNotify } from './useImportWizard';

/** The EPF passbook import: one PDF, its preview, the employer it files under, and the commit. */
export function useEpfImport(notify: ImportWizardNotify) {
  const qc = useQueryClient();
  const { previewMutation, commitMutation } = useEpfImportMutations();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<EpfPreview | null>(null);
  const [employer, setEmployer] = React.useState(NEW_EMPLOYER);
  // The employers a new-employer passbook can be filed under; kept after one is picked so the pick can be undone.
  const [choices, setChoices] = React.useState<EpfEmployerChoices | null>(null);
  const [result, setResult] = React.useState<EpfImportResult | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = React.useState(false);
  const [isCommitting, setIsCommitting] = React.useState(false);

  const employerId = (value: string) => (value === NEW_EMPLOYER ? undefined : value);

  const pickFile = (next: File | null) => {
    setFile(next);
    setChoices(null);
    setUploadError(null);
  };

  /** Reads the passbook; `value` is the employer chosen in the review step, absent on the first read. */
  const runPreview = async (value?: string) => {
    if (!file) {
      notify.error('Please select your EPFO passbook PDF.');
      return;
    }
    setIsPreviewing(true);
    setUploadError(null);
    try {
      const data = await previewMutation.mutateAsync({ file, employerId: value === undefined ? undefined : employerId(value) });
      setPreview(data);
      if (value === undefined) {
        setChoices(!data.employer.existingId && data.employerOptions.length > 0 ? { newName: data.employer.name, options: data.employerOptions } : null);
      }
      setEmployer(value ?? data.employer.existingId ?? NEW_EMPLOYER);
      setStep(2);
    } catch (err) {
      if (err instanceof ApiError && EPF_UPLOAD_ERROR_CODES.includes(err.response.code)) {
        setUploadError(err.response.message);
        setStep(1);
      } else {
        notify.caught(err, 'Failed to preview import');
      }
    } finally {
      setIsPreviewing(false);
    }
  };

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runPreview();
  };

  const commit = async () => {
    if (!file) return;
    setIsCommitting(true);
    try {
      const data = await commitMutation.mutateAsync({ file, employerId: employerId(employer) });
      setResult(data);
      setStep(3);
      invalidateInvestmentQueries(qc);
      void qc.invalidateQueries({ queryKey: ['epf'] });
    } catch (err) {
      notify.caught(err, 'Failed to commit import');
    } finally {
      setIsCommitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    setUploadError(null);
    setChoices(null);
    setEmployer(NEW_EMPLOYER);
  };

  return {
    step,
    setStep,
    file,
    pickFile,
    preview,
    choices,
    employer,
    result,
    uploadError,
    isPreviewing,
    isCommitting,
    handlePreviewSubmit,
    changeEmployer: (value: string) => void runPreview(value),
    commit,
    reset,
  };
}
