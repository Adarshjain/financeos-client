'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { ingestStatementFiles } from '@/actions/ingestion';
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
import type { Account } from '@/lib/account.types';
import type { FileIngestionResult, FileSummary } from '@/lib/types';

interface IngestFormProps {
  accounts: Account[];
}

export function IngestForm({ accounts }: IngestFormProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<FileIngestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out stock/mutual fund accounts if they aren't standard bank/credit cards (optional, but keep it open)
  const uploadableAccounts = accounts.filter(
    (acc) => acc.type === 'bank_account' || acc.type === 'credit_card',
  );

  const selectedAccount = accounts.find((acc) => acc.id === selectedAccountId);

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

    newFiles.forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || ext === 'xlsx' || ext === 'xls') {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid file format: ${invalidFiles.join(', ')}. Only PDF and Excel are allowed.`);
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

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await ingestStatementFiles(selectedAccountId, formData);
      if (response.success) {
        setResult(response.data);
        setFiles([]); // clear files queue on success
        toast.success('Ingestion completed successfully!');
      } else {
        setError(response.error.message || 'An error occurred during ingestion.');
        toast.error('Ingestion failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
      toast.error('An unexpected error occurred.');
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
  };

  return (
    <div className="space-y-6 p-4 max-w-4xl pb-20">
      {/* Header & Navigation */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 p-0 rounded-lg">
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
        {/* Error Banner */}
        {error && (
          <Alert variant="destructive" className="rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
            <div className="flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <AlertTitle className="font-semibold">Upload Failed</AlertTitle>
                <AlertDescription className="text-sm mt-1">{error}</AlertDescription>
              </div>
            </div>
            {files.length > 0 && (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isUploading}
                variant="outline"
                className="shrink-0 rounded-xl bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-950/40 font-semibold"
              >
                Retry Upload
              </Button>
            )}
          </Alert>
        )}


        {/* Success / Result Summary */}
        {result && (
          <Card className="border-emerald-100 bg-emerald-50/5 dark:bg-emerald-950/5 dark:border-emerald-950 rounded-xl overflow-hidden shadow-sm">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/5 dark:to-teal-500/5 border-b border-emerald-100/50 dark:border-emerald-950/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-emerald-800 dark:text-emerald-400">Ingestion Results</CardTitle>
              </div>
              <CardDescription className="text-emerald-700/80 dark:text-emerald-400/80">
                Summary of the transaction extraction process
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Files Processed
                  </span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
                    {result.filesProcessed}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Transactions Created
                  </span>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {result.totalCreated}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Duplicates Found
                  </span>
                  <span className="text-2xl font-black text-amber-500 mt-1">
                    {result.totalDuplicatesFound}
                  </span>
                </div>
              </div>

              {result.totalDuplicatesFound > 0 && (
                <Alert variant="warning" className="rounded-xl border-amber-200/60 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/30">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400 font-semibold">Duplicates Detected</AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                    We found {result.totalDuplicatesFound} transaction(s) that match existing records. Both the old and new copies have been marked as <Badge variant="warning" className="h-5 py-0 px-1.5 text-[10px]">NEEDS_REVIEW</Badge>. Please visit the{' '}
                    <Link href="/transactions" className="underline font-bold hover:text-amber-950 dark:hover:text-amber-300">
                      Transactions Page
                    </Link>{' '}
                    to review and resolve them.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableHead className="font-semibold text-xs text-slate-500 dark:text-slate-400">Filename</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-500 dark:text-slate-400 w-32">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-500 dark:text-slate-400 w-32 text-right">Transactions</TableHead>
                      <TableHead className="font-semibold text-xs text-slate-500 dark:text-slate-400">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.fileDetails.map((file: FileSummary, idx) => (
                      <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-900">
                        <TableCell className="font-medium text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                          {file.filename}
                        </TableCell>
                        <TableCell>
                          <Badge variant={file.status === 'SUCCESS' ? 'success' : 'danger'}>
                            {file.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-right pr-6">
                          {file.linesParsed}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                          {file.errorMessage ? (
                            <span className="text-red-500 dark:text-red-400">{file.errorMessage}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Form */}
        <Card className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                {selectedAccount && 'statementPassword' in selectedAccount && selectedAccount.statementPassword && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                    <Info className="h-3.5 w-3.5" />
                    <span>Statement decryption password configured for this account.</span>
                  </div>
                )}
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
                    Supports PDF, XLSX, and XLS format (up to 10MB per file)
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
                      variant="ghost"
                      size="sm"
                      onClick={() => setFiles([])}
                      disabled={isUploading}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/25 h-7 px-2 rounded-lg"
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
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          disabled={isUploading}
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-850"
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
      </div>
    </div>
  );
}
