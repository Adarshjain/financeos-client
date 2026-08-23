import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';

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
import type { DuplicateDetail, FileIngestionResult, FileSummary } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export function IngestionResultDetails({ result }: { result: FileIngestionResult }) {
  const [duplicatesExpanded, setDuplicatesExpanded] = useState(false);
  const [filesExpanded, setFilesExpanded] = useState(false);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    return <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />;
  };

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'SUCCESS') return 'success';
    if (status === 'SKIPPED') return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-2.5 text-2xs pt-1">
      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Statement Extraction Summary</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Files
          </div>
          <div className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-200 mt-0.5">
            {result.filesProcessed}
          </div>
        </div>
        <div className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Created
          </div>
          <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {result.totalCreated}
          </div>
        </div>
        <div className="p-1.5 sm:p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-center">
          <div className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
            Duplicates
          </div>
          <div className="text-sm sm:text-base font-black text-amber-500 mt-0.5">
            {result.totalDuplicatesFound}
          </div>
        </div>
      </div>

      {result.totalDuplicatesFound > 0 && (
        <Alert variant="warning" iconLayout="inline" className="rounded-md p-2 sm:p-2.5 border-amber-200/80 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40">
          <AlertTitle className="text-amber-800 dark:text-amber-400 font-semibold text-2xs flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Duplicates Detected</span>
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-500 text-2xs mt-0.5 space-y-2 w-full">
            <div>
              We found {result.totalDuplicatesFound} duplicate transaction(s). Markings applied as{' '}
              <Badge variant="warning" className="h-4 py-0 px-1 text-2xs">NEEDS_REVIEW</Badge>. Visit{' '}
              <Link href="/transactions" className="underline font-bold">Transactions Page</Link> to resolve.
            </div>

            {result.duplicateDetails && result.duplicateDetails.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setDuplicatesExpanded(!duplicatesExpanded)}
                  className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-400 hover:underline focus:outline-none mb-1.5"
                >
                  {duplicatesExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>{duplicatesExpanded ? 'Hide duplicate items' : `Show duplicate items (${result.duplicateDetails.length})`}</span>
                </button>

                {duplicatesExpanded && (
                  <div className="border border-amber-200/80 dark:border-amber-900/40 rounded-md overflow-hidden bg-white dark:bg-slate-900">
                    {/* Mobile Card List (< sm) */}
                    <div className="block sm:hidden divide-y divide-amber-100/60 dark:divide-amber-950/40">
                      {result.duplicateDetails.map((dup: DuplicateDetail, idx: number) => (
                        <div key={idx} className="p-2 space-y-1">
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-slate-500 tabular-nums">{formatDate(dup.date)}</span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatCurrency(dup.amount)}
                            </span>
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                            {dup.description}
                          </div>
                          <div className="text-slate-400 text-2xs truncate">
                            File: {dup.filename}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-50/60 dark:bg-amber-950/40">
                            <TableHead className="py-1 px-2 text-2xs whitespace-nowrap">Date</TableHead>
                            <TableHead className="py-1 px-2 text-2xs text-right whitespace-nowrap">Amount</TableHead>
                            <TableHead className="py-1 px-2 text-2xs">Description</TableHead>
                            <TableHead className="py-1 px-2 text-2xs whitespace-nowrap">File</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.duplicateDetails.map((dup: DuplicateDetail, idx: number) => (
                            <TableRow key={idx} className="border-b border-amber-100/60 dark:border-amber-950/40">
                              <TableCell className="py-1 px-2 text-2xs tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                                {formatDate(dup.date)}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-2xs text-right tabular-nums whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                                {formatCurrency(dup.amount)}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-2xs text-slate-700 dark:text-slate-300 min-w-[100px] max-w-[180px] truncate">
                                {dup.description}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-2xs text-slate-500 whitespace-nowrap truncate max-w-[100px]">
                                {dup.filename}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {result.duplicatesTruncated ? (
                      <div className="py-1 px-2 text-2xs text-slate-500 italic bg-amber-50/40 dark:bg-amber-950/30 border-t border-amber-100/60 dark:border-amber-950/40">
                        …and {result.duplicatesTruncated} more
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {result.fileDetails && result.fileDetails.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => setFilesExpanded(!filesExpanded)}
            className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 hover:underline focus:outline-none"
          >
            {filesExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>File Details ({result.fileDetails.length})</span>
          </button>

          {filesExpanded && (
            <div className="border border-slate-200/70 dark:border-slate-800 rounded-md overflow-hidden bg-white dark:bg-slate-900">
              {/* Mobile Card List (< sm) */}
              <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {result.fileDetails.map((file: FileSummary, idx: number) => {
                  const hasMessage = !!(file.errorMessage || file.warning);
                  return (
                    <div key={idx} className="p-2 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 font-medium text-slate-800 dark:text-slate-200 truncate">
                          {getFileIcon(file.filename)}
                          <span className="truncate">{file.filename}</span>
                        </div>
                        <Badge variant={getStatusBadgeVariant(file.status)} className="text-2xs py-0 px-1 shrink-0">
                          {file.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 pt-0.5 border-t border-slate-100 dark:border-slate-800/60 text-2xs tabular-nums">
                        <span>Created: <strong className="text-slate-800 dark:text-slate-200">{file.created ?? '—'}</strong></span>
                        <span>Dups: <strong className="text-slate-800 dark:text-slate-200">{file.duplicates ?? '—'}</strong></span>
                        <span>Lines: <strong className="text-slate-800 dark:text-slate-200">{file.linesParsed}</strong></span>
                      </div>
                      {hasMessage && (
                        <div className="text-2xs pt-0.5">
                          {file.errorMessage && (
                            <span className={file.status === 'FAILED' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500'}>
                              {file.errorMessage}
                            </span>
                          )}
                          {file.warning && (
                            <span className="text-amber-700 dark:text-amber-500 font-medium block">
                              {file.warning}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= sm) */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 dark:bg-slate-900/60">
                      <TableHead className="py-1.5 px-2 text-2xs">Filename</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs w-16 whitespace-nowrap">Status</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs w-14 text-right whitespace-nowrap">Created</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs w-14 text-right whitespace-nowrap">Dups</TableHead>
                      <TableHead className="py-1.5 px-2 text-2xs w-16 text-right whitespace-nowrap">Lines</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.fileDetails.map((file: FileSummary, idx: number) => {
                      const hasMessage = !!(file.errorMessage || file.warning);
                      return (
                        <React.Fragment key={idx}>
                          <TableRow className={hasMessage ? 'border-b-0' : 'border-b border-slate-100 dark:border-slate-900'}>
                            <TableCell className="py-1.5 px-2 font-medium text-2xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[200px]">
                              {getFileIcon(file.filename)}
                              <span className="truncate">{file.filename}</span>
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-2xs whitespace-nowrap">
                              <Badge variant={getStatusBadgeVariant(file.status)} className="text-2xs py-0 px-1">
                                {file.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-2xs text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                              {file.created ?? '—'}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-2xs text-right tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                              {file.duplicates ?? '—'}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-2xs text-right tabular-nums whitespace-nowrap">
                              {file.linesParsed}
                            </TableCell>
                          </TableRow>
                          {hasMessage && (
                            <TableRow className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/40 dark:bg-slate-900/40">
                              <TableCell colSpan={5} className="py-1 px-2 text-2xs">
                                {file.errorMessage && (
                                  <span className={file.status === 'FAILED' ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-500'}>
                                    {file.errorMessage}
                                  </span>
                                )}
                                {file.warning && (
                                  <span className="text-amber-700 dark:text-amber-500 font-medium block">
                                    {file.warning}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

