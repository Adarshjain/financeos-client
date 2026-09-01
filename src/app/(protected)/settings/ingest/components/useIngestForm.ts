'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

import { ingestStatementFiles } from '@/actions/ingestion';
import { emitJobStarted } from '@/components/jobs/jobsBus';
import { useJobPolling } from '@/hooks/useJobPolling';
import { type Account, isAccountClosed } from '@/lib/account.types';

import {
  formatFileSize,
  MAX_REQUEST_BYTES,
  MAX_REQUEST_MB,
} from './FileDropzone';

interface UseIngestFormProps {
  accounts: Account[];
}

export function useIngestForm({ accounts }: UseIngestFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { isPolling } = useJobPolling(activeJobId, (job) => {
    if (job.status === 'SUCCEEDED') {
      toast.success('Statement ingestion completed — see results below.');
    } else if (job.status === 'FAILED') {
      toast.error(job.errorMessage || 'Ingestion failed.');
    } else {
      toast.info('Ingestion cancelled.');
    }
    setActiveJobId(null);
  });

  const isUploading = Boolean(activeJobId) && isPolling;

  // Filter accounts to standard bank/credit cards for transaction statement upload (excluding closed)
  const uploadableAccounts = accounts.filter(
    (acc) =>
      (acc.type === 'bank_account' || acc.type === 'credit_card') &&
      !isAccountClosed(acc)
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

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await ingestStatementFiles(
        selectedAccountId,
        formData
      );
      if (response.success && response.data?.jobId) {
        const jobId = response.data.jobId;
        setActiveJobId(jobId);
        emitJobStarted(jobId);
        setFiles([]);
        toast.info('Ingestion job started in background.');
      } else if (!response.success) {
        toast.error(
          response.error.message ||
            'An error occurred while starting ingestion.'
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(msg);
    }
  };

  return {
    selectedAccountId,
    setSelectedAccountId,
    files,
    isDragActive,
    isUploading,
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
