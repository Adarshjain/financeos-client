'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { getErrorMessage } from '@/lib/api/errorMessage';
import { invalidateInvestmentQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

import {
  addNpsFiles,
  commitBody,
  importable,
  type NewAccountPicks,
  type NpsImportFile,
  type NpsImportResult,
} from '../nps/npsImportModel';
import type { ImportWizardNotify } from './useImportWizard';
import { useNpsImportMutations } from './useNpsImportMutations';

/** The NPS statement import: the queued PDFs, what each read said, the password and account picks, and the commit. */
export function useNpsImport(notify: ImportWizardNotify) {
  const qc = useQueryClient();
  const { previewMutation, commitMutation } = useNpsImportMutations();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [files, setFiles] = React.useState<NpsImportFile[]>([]);
  const [results, setResults] = React.useState<NpsImportResult[] | null>(null);
  const [queueError, setQueueError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [isPreviewing, setPreviewing] = React.useState(false);
  const [isCommitting, setCommitting] = React.useState(false);

  const patch = (id: string, change: Partial<NpsImportFile>) => setFiles((current) => current.map((f) => (f.id === id ? { ...f, ...change } : f)));

  const addFiles = (added: File[]) => {
    const next = addNpsFiles(files, added);
    setFiles(next.files);
    setQueueError(next.error);
  };
  const removeFile = (id: string) => setFiles(files.filter((f) => f.id !== id));

  /** Reads one file; the server's refusal becomes that file's own message. */
  const read = async (f: NpsImportFile, password?: string): Promise<NpsImportFile> => {
    try {
      const preview = await previewMutation.mutateAsync({ file: f.file, password });
      return { ...f, preview, error: null };
    } catch (err) {
      return { ...f, preview: null, error: getErrorMessage(err, "Couldn't read this statement.") };
    }
  };

  /** Reads every file not yet read, one after another so a password the server learns helps the next. */
  const previewAll = async () => {
    if (files.length === 0) {
      notify.error('Select your NPS statement PDFs.');
      return;
    }
    setPreviewing(true);
    const next: NpsImportFile[] = [];
    for (const f of files) next.push(f.preview && !f.preview.passwordNeeded ? f : await read(f, f.password || undefined));
    setFiles(next);
    setPreviewing(false);
    setStep(2);
  };

  /** Reads a locked file again with the password typed for it. */
  const unlock = async (id: string) => {
    const f = files.find((x) => x.id === id);
    if (!f || !f.password) return;
    setBusyId(id);
    const done = await read(f, f.password);
    setBusyId(null);
    setFiles((current) => current.map((x) => (x.id === id ? done : x)));
    if (done.preview?.passwordNeeded) notify.error("That password didn't open the statement.");
  };

  const commit = async () => {
    const todo = files.filter(importable);
    if (todo.length === 0) return;
    setCommitting(true);
    const done = new Map<string, NpsImportResult>();
    const created: Record<string, string> = {};
    const remember = (f: NpsImportFile, result: NpsImportResult) => {
      const pran = f.preview?.statement?.pranMasked;
      if (pran && result.accountId && !f.preview?.account?.id) created[pran] = result.accountId;
    };
    // A retry: the account an earlier, committed file made is used for the rest of that PRAN.
    for (const f of files) if (f.committed) remember(f, f.committed);
    try {
      // One after another: Tier I and Tier II of a new account must not both create it, so the account the first one made is used for the rest of that PRAN.
      for (const f of todo) {
        const result = await commitMutation.mutateAsync(commitBody(f, created));
        done.set(f.id, result);
        remember(f, result);
      }
      setResults(files.map((f) => f.committed ?? done.get(f.id)).filter((r): r is NpsImportResult => !!r));
      setStep(3);
    } catch (err) {
      // The files that went in are done: they keep their result and a retry commits only the rest.
      if (done.size > 0) {
        setFiles((current) => current.map((f) => (done.has(f.id) ? { ...f, committed: done.get(f.id) } : f)));
        setResults(files.map((f) => f.committed ?? done.get(f.id)).filter((r): r is NpsImportResult => !!r));
      }
      notify.caught(err, "Couldn't commit import");
    } finally {
      setCommitting(false);
      if (done.size > 0) {
        void invalidateInvestmentQueries(qc);
        void qc.invalidateQueries({ queryKey: keys.nps.all });
      }
    }
  };

  const reset = () => {
    setStep(1);
    setFiles([]);
    setResults(null);
    setQueueError(null);
  };

  return {
    step,
    setStep,
    files,
    addFiles,
    removeFile,
    setPassword: (id: string, password: string) => patch(id, { password }),
    setPicks: (id: string, picks: NewAccountPicks) => setFiles((current) => current.map((f) => (f.id === id ? { ...f, picks: { ...f.picks, ...picks } } : f))),
    results,
    queueError,
    busyId,
    isPreviewing,
    isCommitting,
    previewAll,
    unlock,
    commit,
    reset,
  };
}
