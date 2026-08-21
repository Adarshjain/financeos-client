'use client';

import { AlertTriangle, CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FileIngestionResult, FileSummary } from '@/lib/types';

export function IngestionResultDetails({ result }: { result: FileIngestionResult }) {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    return <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />;
  };

  return (
    <div className="p-3 bg-emerald-50/10 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950 rounded-xl space-y-3 text-2xs">
      <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <span>Statement Extraction Summary</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Files
          </div>
          <div className="text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
            {result.filesProcessed}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Created
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {result.totalCreated}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Duplicates
          </div>
          <div className="text-base font-black text-amber-500 mt-0.5">
            {result.totalDuplicatesFound}
          </div>
        </div>
      </div>

      {result.totalDuplicatesFound > 0 && (
        <Alert variant="warning" className="rounded-lg p-2.5 border-amber-200/60 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/30">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <AlertTitle className="text-amber-800 dark:text-amber-400 font-semibold text-2xs">
            Duplicates Detected
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-500 text-2xs mt-0.5">
            We found {result.totalDuplicatesFound} duplicate transaction(s). Markings applied as{' '}
            <Badge variant="warning" className="h-4 py-0 px-1 text-2xs">NEEDS_REVIEW</Badge>. Visit{' '}
            <Link href="/transactions" className="underline font-bold">Transactions Page</Link> to resolve.
          </AlertDescription>
        </Alert>
      )}

      {result.fileDetails && result.fileDetails.length > 0 && (
        <div className="border border-slate-200/60 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableHead className="py-1.5 px-2 text-2xs">Filename</TableHead>
                <TableHead className="py-1.5 px-2 text-2xs w-20">Status</TableHead>
                <TableHead className="py-1.5 px-2 text-2xs w-20 text-right">Transactions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.fileDetails.map((file: FileSummary, idx: number) => (
                <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-900">
                  <TableCell className="py-1.5 px-2 font-medium text-2xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[180px]">
                    {getFileIcon(file.filename)}
                    <span className="truncate">{file.filename}</span>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-2xs">
                    <Badge variant={file.status === 'SUCCESS' ? 'success' : 'destructive'} className="text-2xs py-0 px-1">
                      {file.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-1.5 px-2 text-2xs text-right tabular-nums">
                    {file.linesParsed}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
