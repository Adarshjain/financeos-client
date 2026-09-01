'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { ingestStatementFiles } from '@/actions/ingestion';
import { emitJobStarted } from '@/components/jobs/jobsBus';
import { JobsPanel } from '@/components/jobs/JobsPanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJobPolling } from '@/hooks/useJobPolling';
import { type Account, isAccountClosed } from '@/lib/account.types';
import type { FileIngestionResult, FileSummary } from '@/lib/types';

/**
 * Upload limit, read from next.config.mjs via `env` so the form validates
 * against the value the runtime actually enforces and cannot drift from it.
 * 4.5MB is Vercel's hard cap on serverless request bodies — anything larger
 * fails at the platform edge regardless of app config, so the whole upload
 * (all queued files together, one server-action request) must fit under it.
 */
const MAX_REQUEST_MB = Number(process.env.NEXT_PUBLIC_MAX_REQUEST_MB ?? 4.5);
const MAX_REQUEST_BYTES = MAX_REQUEST_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface IngestFormProps {
  accounts: Account[];
}

export function IngestForm({ accounts }: IngestFormProps) {
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
    (acc) => (acc.type === 'bank_account' || acc.type === 'credit_card') && !isAccountClosed(acc),
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
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
      // Reset input value so the same files can be selected again
      e.target.value = '';
    }
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
      // A single file over the request cap can never be uploaded — reject it
      // here so the user finds out at add time, not at submit.
      if (file.size > MAX_REQUEST_BYTES) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        return;
      }
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid file format: ${invalidFiles.join(', ')}. Only PDF and Excel are allowed.`);
    }

    if (oversizedFiles.length > 0) {
      toast.error(
        `Too large (max ${MAX_REQUEST_MB}MB per upload): ${oversizedFiles.join(', ')}.`,
      );
    }

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} file(s) to the queue.`);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

    // All queued files go up as a single server-action request, so the total is
    // what Vercel's 4.5MB body cap applies to. Checked here so the user gets a
    // specific message instead of an opaque platform 413.
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_REQUEST_BYTES) {
      toast.error(
        `Upload is ${formatFileSize(totalBytes)}; the limit is ${MAX_REQUEST_MB}MB per upload. Remove some files and try again.`,
      );
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await ingestStatementFiles(selectedAccountId, formData);
      if (response.success && response.data?.jobId) {
        const jobId = response.data.jobId;
        setActiveJobId(jobId);
        emitJobStarted(jobId);
        setFiles([]); // clear files queue on enqueue
        toast.info('Ingestion job started in background.');
      } else if (!response.success) {
        toast.error(response.error.message || 'An error occurred while starting ingestion.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'An unexpected error occurred.');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-6 w-6 text-rose-500" />;
    }
    return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
  };

  return (
    <div className="space-y-4 p-4 max-w-4xl pb-20">
      {/* Header & Navigation */}
      <div className="flex items-center gap-3">
        <Button asChild size="icon-sm" variant="ghost">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statement Ingestion</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upload PDF or Excel statements to automatically import transactions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Upload Form */}
        <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-2">
              {/* Account Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="account-select" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Select Financial Account
                </Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={isUploading}>
                  <SelectTrigger id="account-select" className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 focus:ring-emerald-500">
                    <SelectValue placeholder="Choose an account..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {uploadableAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="rounded-lg">
                        <div className="flex items-center justify-between w-full min-w-[280px]">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{acc.name}</span>
                          <span className="text-xs font-semibold text-slate-400 uppercase bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded ml-2">
                            {acc.type.replace('_', ' ')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Dropzone */}
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Upload PDF or Excel Statement Files
                </Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer group ${
                    isDragActive
                      ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 scale-[0.99]'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-950/20'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                  <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
                    <Upload className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                    Drag and drop your files here
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Supports PDF, XLSX, and XLS format (up to {MAX_REQUEST_MB}MB per upload)
                  </p>
                </div>
              </div>

              {/* Files Queue */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Selected Files ({files.length})
                    </span>
                    <Button
                      type="button"
                      variant="ghost-destructive"
                      size="xs"
                      onClick={() => setFiles([])}
                      disabled={isUploading}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 bg-slate-50/30 dark:bg-slate-950/10 max-h-60 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl group hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.name)}
                          <div className="min-w-0 flex flex-col">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[280px]">
                              {file.name}
                            </span>
                            <span className="text-2xs text-slate-400 dark:text-slate-500 tabular-nums">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          variant="outline"
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit / Upload Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <Button
                  type="submit"
                  disabled={!selectedAccountId || files.length === 0 || isUploading}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/15 hover:from-emerald-500 hover:to-teal-500 transition-all text-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                      Ingesting statements via Gemini...
                    </>
                  ) : (
                    'Upload & Process Statements'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Jobs Panel */}
        <JobsPanel types={['STATEMENT_INGEST']} title="Recent statement ingestion jobs" />
      </div>
    </div>
  );
}
