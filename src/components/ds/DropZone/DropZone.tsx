'use client';

import React, { forwardRef, useRef, useState } from 'react';

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

export interface DropZoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop' | 'title'> {
  /** Main title, required */
  title: React.ReactNode;
  /** Subtitle / accepted formats info, required */
  hint: React.ReactNode;
  /** Choose files button label, required */
  buttonLabel: React.ReactNode;
  /** Title when dragging files over (default: "Drop to add") */
  dragTitle?: React.ReactNode;
  /** Hint when dragging files over (e.g. "3 files") */
  dragHint?: React.ReactNode;
  /** Controlled dragging state */
  isDragging?: boolean;
  /** Accepted file formats for the hidden input (e.g. ".pdf,.xlsx,.xls") */
  accept?: string;
  /** Whether multiple files can be selected (default: true) */
  multiple?: boolean;
  /** Callback when files are selected via picker or drop */
  onFilesSelected?: (files: File[]) => void;

  /** Error message on the drop zone */
  error?: React.ReactNode;

  /** Locks the zone: no picker, no drop, no removing queued files (an upload is running) */
  disabled?: boolean;

  /** Whether to show the drop zone upload area box (default: true) */
  showDropArea?: boolean;

  /** Staged / queued files */
  queuedFiles?: QueuedFile[];
  /** Callback when remove trash button is clicked for a queued file */
  onRemoveFile?: (file: QueuedFile) => void;

  /** Optional content under the drop zone */
  children?: React.ReactNode;
}

/** True when the file matches an input `accept` list (".pdf,.xlsx", "image/*", "application/pdf"); no list accepts everything. */
function isAccepted(file: File, accept?: string): boolean {
  const tokens = (accept ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((t) =>
    t.startsWith('.') ? name.endsWith(t) : t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : type === t,
  );
}

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  (
    {
      title,
      hint,
      buttonLabel,
      dragTitle = 'Drop to add',
      dragHint,
      isDragging,
      accept,
      multiple = true,
      onFilesSelected,
      error,
      showDropArea = true,
      disabled = false,
      queuedFiles,
      onRemoveFile,
      children,
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
      if (disabled) return;
      setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const accepted = Array.from(e.dataTransfer.files).filter((f) => isAccepted(f, accept));
        if (accepted.length > 0) onFilesSelected?.(accepted);
      }
    };

    const handleChooseFiles = () => {
      if (disabled) return;
      fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesSelected?.(Array.from(e.target.files));
      }
      // Clear the input, so choosing the same file again (after removing it) still fires a change.
      e.target.value = '';
    };

    return (
      <div
        ref={ref}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn('flex flex-col gap-space-8 desk:gap-space-12', className)}
        {...props}
      >
        {/* Hidden native file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Drop zone box */}
        {showDropArea ? (
          <div
            onClick={handleChooseFiles}
            className={cn(
              'border border-dashed rounded-ds-xl px-space-16 py-space-20 flex flex-col items-center text-center gap-space-6 select-none transition-colors duration-fast',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              activeDragging
                ? 'border-brand bg-brand-tint'
                : hasError
                  ? 'border-danger bg-danger-tint'
                  : 'border-line-heavy bg-sunken',
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
              <Icon name="upload" size="lg" />
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
                disabled={disabled}
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
                    disabled={disabled}
                    aria-label={`Remove ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(f);
                    }}
                  >
                    <Icon name="delete" size="sm" />
                  </Button>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Optional content under the drop zone */}
        {children}
      </div>
    );
  },
);

DropZone.displayName = 'DropZone';
