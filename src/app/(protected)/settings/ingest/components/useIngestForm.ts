'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobStatusPolling } from '@/components/jobs/useJobStatusPolling';
import { type Account, isAccountClosed, supportsIngestion } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { multipartBodySerializer } from '@/lib/api/multipart';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

import {
  formatFileSize,
  MAX_REQUEST_BYTES,
  MAX_REQUEST_MB,
} from './FileDropzone';

interface UseIngestFormProps {
  accounts: Account[];
}

export function useIngestForm({ accounts }: UseIngestFormProps) {
  const qc = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { isPolling } = useJobStatusPolling(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED') {
      toast.success('Statement ingestion completed — see results below.');
      qc.invalidateQueries({ queryKey: keys.transactions.all });
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Ingestion failed.');
    } else {
      toast.info('Ingestion cancelled.');
    }
    // The toast points at the jobs panel, so refresh it now rather than on its next poll tick.
    qc.invalidateQueries({ queryKey: keys.jobs.all });
    setActiveJobId(null);
  });

  const ingestMutation = useMutation({
    mutationFn: (input: { accountId: string; files: File[] }) =>
      api
        .POST('/api/v1/accounts/{accountId}/ingest', {
          params: { path: { accountId: input.accountId } },
          body: { files: input.files },
          bodySerializer: multipartBodySerializer,
        })
        .then((r) => r.data!),
  });

  // Two busy phases: the multipart POST itself (can take a while for large PDFs), then the
  // background job. Both lock the form so the user always sees that something is happening.
  const isSending = ingestMutation.isPending;
  const isProcessing = Boolean(activeJobId) && isPolling;
  const isUploading = isSending || isProcessing;

  // Statements exist only for bank/credit card accounts (server rejects the rest); exclude closed
  const uploadableAccounts = accounts.filter(
    (acc) => supportsIngestion(acc.type) && !isAccountClosed(acc)
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    const oversizedFiles: string[] = [];

    newFiles.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf' && ext !== 'xlsx' && ext !== 'xls') {
        invalidFiles.push(file.name);
        return;
      }
      if (file.size > MAX_REQUEST_BYTES) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        return;
      }
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(
        `Invalid file format: ${invalidFiles.join(
          ', '
        )}. Only PDF and Excel are allowed.`
      );
    }

    if (oversizedFiles.length > 0) {
      toast.error(
        `Too large (max ${MAX_REQUEST_MB}MB per upload): ${oversizedFiles.join(
          ', '
        )}.`
      );
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} file(s) to the queue.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUploading) return;
    if (!selectedAccountId) {
      toast.error('Please select an account first.');
      return;
    }
    if (files.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_REQUEST_BYTES) {
      toast.error(
        `Upload is ${formatFileSize(
          totalBytes
        )}; the limit is ${MAX_REQUEST_MB}MB per upload. Remove some files and try again.`
      );
      return;
    }

    const toastId = toast.loading(
      `Uploading ${files.length} file${files.length === 1 ? '' : 's'}…`
    );
    try {
      const response = await ingestMutation.mutateAsync({
        accountId: selectedAccountId,
        files,
      });
      if (response?.jobId) {
        const jobId = response.jobId;
        setActiveJobId(jobId);
        emitJobStarted(jobId);
        setFiles([]);
        toast.info('Upload complete — processing in the background.', {
          id: toastId,
        });
      } else {
        toast.dismiss(toastId);
      }
    } catch (err: unknown) {
      toast.dismiss(toastId);
      toastError(err, 'Failed to start ingestion job');
    }
  };

  return {
    selectedAccountId,
    setSelectedAccountId,
    files,
    isDragActive,
    isUploading,
    isSending,
    uploadableAccounts,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    removeFile,
    clearAllFiles,
    handleSubmit,
  };
}
