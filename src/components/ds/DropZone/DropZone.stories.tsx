import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { DropZone } from './DropZone';

const meta: Meta<typeof DropZone> = {
  title: 'DS/Inputs/DropZone',
  component: DropZone,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof DropZone>;

export const Idle: Story = {
  args: {
    title: 'Add statements',
    hint: 'PDF, XLSX or XLS · up to 25 MB per upload',
    buttonLabel: 'Choose files',
  },
};

export const DraggingOver: Story = {
  args: {
    dragTitle: 'Drop to add',
    dragHint: '3 files',
    isDragging: true,
  },
};

export const Queued: Story = {
  args: {
    showDropArea: false,
    queuedFiles: [
      { id: '1', name: 'Regalia-Gold-Oct.pdf', size: '412 KB' },
      { id: '2', name: 'Amex-Platinum-Sep.pdf', size: '1.2 MB' },
    ],
    onRemoveFile: (f) => alert(`Removed ${f.name}`),
  },
};

export const TooLarge: Story = {
  args: {
    showDropArea: false,
    queuedFiles: [
      {
        id: '1',
        name: 'HDFC-2025-full-year.pdf',
        size: '31 MB',
        error: 'over 25 MB',
      },
    ],
    onRemoveFile: (f) => alert(`Removed ${f.name}`),
  },
};

export const WithDropError: Story = {
  args: {
    error: 'File format not supported. Please upload a PDF or Excel sheet.',
  },
};

export const WithRecentImports: Story = {
  args: {
    title: 'Add statements',
    hint: 'PDF, XLSX or XLS · up to 25 MB per upload',
    recentImports: [
      {
        id: '1',
        name: 'HDFC-Savings-Sep2026.pdf',
        status: 'Done',
        statusTone: 'positive',
      },
      {
        id: '2',
        name: 'ICICI-CreditCard-Aug2026.pdf',
        status: '1 warning',
        statusTone: 'warning',
      },
    ],
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-space-12 max-w-xl items-start">
      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Idle
        </div>
        <DropZone />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Dragging over
        </div>
        <DropZone isDragging dragHint="3 files" />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Queued
        </div>
        <DropZone
          showDropArea={false}
          queuedFiles={[
            { id: '1', name: 'Regalia-Gold-Oct.pdf', size: '412 KB' },
            { id: '2', name: 'Amex-Platinum-Sep.pdf', size: '1.2 MB' },
          ]}
          onRemoveFile={() => {}}
        />
      </div>

      <div>
        <div className="text-caption font-semibold text-ink-3 mb-space-4">
          Too large
        </div>
        <DropZone
          showDropArea={false}
          queuedFiles={[
            {
              id: '1',
              name: 'HDFC-2025-full-year.pdf',
              size: '31 MB',
              error: 'over 25 MB',
            },
          ]}
          onRemoveFile={() => {}}
        />
      </div>
    </div>
  ),
};
