'use client';

import { Trash2, Upload } from 'lucide-react';
import React, { forwardRef, useRef, useState } from 'react';

import { Banner } from '../Banner/Banner';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { cn } from '../cn';
import { Icon } from '../Icon/Icon';

export interface QueuedFile {
  id: string;
  name: string;
  size: string;
  error?: string;
}

export interface RecentImport {
  id: string;
  name: string;
  status: string;
  statusTone?: 'positive' | 'warning' | 'danger';
}

export interface DropZoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop' | 'title'> {
  /** Main title (default: "Add statements") */
  title?: React.ReactNode;
  /** Subtitle / accepted formats info (default: "PDF, XLSX or XLS · up to 25 MB per upload") */
  hint?: React.ReactNode;
  /** Choose files button label (default: "Choose files") */
  buttonLabel?: React.ReactNode;
  /** Title when dragging files over (default: "Drop to add") */
  dragTitle?: React.ReactNode;
  /** Hint when dragging files over (e.g. "3 files") */
  dragHint?: React.ReactNode;
  /** Controlled dragging state */
  isDragging?: boolean;
  /** Accepted file formats for the hidden input (e.g. ".pdf,.xlsx,.xls") */
  accept?: string;
  /** Callback when files are selected via picker or drop */
  onFilesSelected?: (files: File[]) => void;

  /** Error message on the drop zone */
  error?: React.ReactNode;

  /** Whether to show the drop zone upload area box (default: true) */
  showDropArea?: boolean;

  /** Staged / queued files */
  queuedFiles?: QueuedFile[];
  /** Callback when remove trash button is clicked for a queued file */
  onRemoveFile?: (file: QueuedFile) => void;

  /** Recent import history rows */
  recentImports?: RecentImport[];
}

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  (
    {
      title = 'Add statements',
      hint = 'PDF, XLSX or XLS · up to 25 MB per upload',
      buttonLabel = 'Choose files',
      dragTitle = 'Drop to add',
      dragHint,
      isDragging,
      accept = '.pdf,.xlsx,.xls',
      onFilesSelected,
      error,
      showDropArea = true,
      queuedFiles,
      onRemoveFile,
      recentImports,
      className,
      ...props
    },
    ref,
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const activeDragging = isDragging ?? isDragOver;
    const hasError = Boolean(error);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesSelected?.(Array.from(e.dataTransfer.files));
      }
    };

    const handleChooseFiles = () => {
      fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected?.(Array.from(e.target.files));
      }
    };

    return (
      <div ref={ref} className={cn('flex flex-col gap-space-12', className)} {...props}>
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Drop zone box */}
        {showDropArea ? (
          <div
            onClick={handleChooseFiles}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'border border-dashed rounded-ds-xl px-space-16 py-space-20 flex flex-col items-center text-center gap-space-6 select-none transition-colors duration-fast cursor-pointer',
              activeDragging
                ? 'border-brand bg-brand-tint'
                : hasError
                  ? 'border-danger bg-danger-tint'
                  : 'border-line-handle bg-sunken',
            )}
          >
            <div
              className={cn(
                'w-control-xl h-control-xl rounded-ds-lg flex items-center justify-center shrink-0',
                hasError
                  ? 'bg-surface text-danger'
                  : 'bg-brand-tint text-brand',
              )}
            >
              <Icon icon={Upload} size="lg" />
            </div>

            <div>
              <b className="block text-heading font-extrabold text-ink">
                {activeDragging ? dragTitle : title}
              </b>
              <div className="text-label font-medium text-ink-3 mt-space-2">
                {activeDragging && dragHint ? dragHint : hint}
              </div>
              {hasError ? (
                <div className="text-caption font-bold text-danger mt-space-4">
                  {error}
                </div>
              ) : null}
            </div>

            {!activeDragging && (
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChooseFiles();
                }}
              >
                {buttonLabel}
              </Button>
            )}
          </div>
        ) : null}

        {/* Queued files */}
        {queuedFiles && queuedFiles.length > 0 && (
          <Card className="px-space-14 py-0 overflow-hidden">
            {queuedFiles.map((f, idx) => (
              <div
                key={f.id ?? idx}
                className={cn(
                  'flex items-center gap-space-10 py-space-10',
                  idx > 0 && 'border-t border-line-soft',
                )}
              >
                <span className="flex-1 min-w-0 font-bold text-body text-ink truncate">
                  {f.name}
                </span>
                <span
                  className={cn(
                    'text-caption font-medium shrink-0',
                    f.error ? 'text-danger' : 'text-ink-3',
                  )}
                >
                  {f.error ? `${f.size} · ${f.error}` : f.size}
                </span>
                {onRemoveFile && (
                  <Button
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label={`Remove ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(f);
                    }}
                  >
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Recent imports */}
        {recentImports && recentImports.length > 0 && (
          <Card className="px-space-14 py-0 overflow-hidden">
            <div className="py-space-8 text-overline font-extrabold uppercase text-ink-4 border-b border-line-soft">
              Recent imports
            </div>
            {recentImports.map((imp, idx) => (
              <div
                key={imp.id ?? idx}
                className={cn(
                  'flex items-center justify-between gap-space-10 py-space-10',
                  idx > 0 && 'border-t border-line-soft',
                )}
              >
                <span className="font-bold text-body text-ink truncate">
                  {imp.name}
                </span>
                <span
                  className={cn(
                    'text-caption font-bold shrink-0',
                    imp.statusTone === 'positive' && 'text-positive',
                    imp.statusTone === 'warning' && 'text-warning',
                    imp.statusTone === 'danger' && 'text-danger',
                    !imp.statusTone && 'text-ink-3',
                  )}
                >
                  {imp.status}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  },
);

DropZone.displayName = 'DropZone';
