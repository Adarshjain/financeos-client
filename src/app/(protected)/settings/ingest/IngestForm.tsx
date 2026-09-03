'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { JobsPanel } from '@/components/jobs/JobsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Account } from '@/lib/account.types';
import { useAccounts } from '@/lib/query';

import { FileDropzone } from './components/FileDropzone';
import { FilesQueueList } from './components/FilesQueueList';
import { useIngestForm } from './components/useIngestForm';

interface IngestFormProps {
  initialAccounts: Account[];
}

export function IngestForm({ initialAccounts }: IngestFormProps) {
  // Shared accounts lookup — page.tsx seeds the same key server-side, so this
  // read is free on first paint and stays live for the rest of the session.
  const { data: accounts = initialAccounts } = useAccounts(initialAccounts);

  const {
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
  } = useIngestForm({ accounts });

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Statement Ingestion
          </h1>
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
                <Label
                  htmlFor="account-select"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300"
                >
                  Select Financial Account
                </Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                  disabled={isUploading}
                >
                  <SelectTrigger
                    id="account-select"
                    className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 focus:ring-emerald-500"
                  >
                    <SelectValue placeholder="Choose an account..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {uploadableAccounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        className="rounded-lg"
                      >
                        <div className="flex items-center justify-between w-full min-w-[280px]">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {acc.name}
                          </span>
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
              <FileDropzone
                isDragActive={isDragActive}
                isUploading={isUploading}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileChange={handleFileChange}
              />

              {/* Files Queue */}
              <FilesQueueList
                files={files}
                isUploading={isUploading}
                onClearAll={clearAllFiles}
                onRemoveFile={removeFile}
              />

              {/* Submit / Upload Actions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    !selectedAccountId || files.length === 0 || isUploading
                  }
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
        <JobsPanel
          types={['STATEMENT_INGEST']}
          title="Recent statement ingestion jobs"
        />
      </div>
    </div>
  );
}
