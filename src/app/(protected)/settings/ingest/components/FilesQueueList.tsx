'use client';

import { FileSpreadsheet, FileText, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

import { formatFileSize } from './FileDropzone';

export function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return <FileText className="h-6 w-6 text-rose-500" />;
  }
  return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
}

interface FilesQueueListProps {
  files: File[];
  isUploading: boolean;
  onClearAll: () => void;
  onRemoveFile: (index: number) => void;
}

export function FilesQueueList({
  files,
  isUploading,
  onClearAll,
  onRemoveFile,
}: FilesQueueListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 pt-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Selected Files ({files.length})
        </span>
        <Button
          type="button"
          variant="ghost-destructive"
          size="xs"
          onClick={onClearAll}
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
              onClick={() => onRemoveFile(index)}
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
  );
}
