'use client';

import { Upload } from 'lucide-react';
import React from 'react';

import { Label } from '@/components/ui/label';

export const MAX_REQUEST_MB = Number(
  process.env.NEXT_PUBLIC_MAX_REQUEST_MB ?? 4.5
);
export const MAX_REQUEST_BYTES = MAX_REQUEST_MB * 1024 * 1024;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileDropzoneProps {
  isDragActive: boolean;
  isUploading: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileDropzone({
  isDragActive,
  isUploading,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
}: FileDropzoneProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Upload PDF or Excel Statement Files
      </Label>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
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
          onChange={onFileChange}
          disabled={isUploading}
        />
        <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-sm">
          <Upload className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
          Drag and drop your files here
        </p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
          Supports PDF, XLSX, and XLS format (up to {MAX_REQUEST_MB}MB per
          upload)
        </p>
      </div>
    </div>
  );
}
