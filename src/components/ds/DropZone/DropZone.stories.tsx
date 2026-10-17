import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { DropZone } from '@/components/ds';

const defaultProps = {
  title: 'Add statements',
  hint: 'PDF, XLSX or XLS · up to 25 MB per upload',
  buttonLabel: 'Choose files',
};

const meta: Meta<typeof DropZone> = {
  title: 'DS/Form fields/DropZone',
  component: DropZone,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    ...defaultProps,
    onFilesSelected: fn(),
    onRemoveFile: fn(),
  },
  argTypes: {
    title: { control: 'text' },
    hint: { control: 'text' },
    buttonLabel: { control: 'text' },
    dragTitle: { control: 'text' },
    dragHint: { control: 'text' },
    isDragging: { control: 'boolean' },
    showDropArea: { control: 'boolean' },
    error: { control: 'text' },
    accept: { control: 'text' },
    multiple: { control: 'boolean' },
    queuedFiles: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof DropZone>;

export const Idle: Story = {
  args: {
    ...defaultProps,
  },
};

export const DraggingOver: Story = {
  args: {
    ...defaultProps,
    dragTitle: 'Drop to add',
    dragHint: '3 files',
    isDragging: true,
  },
};

export const Queued: Story = {
  args: {
    ...defaultProps,
    showDropArea: false,
    queuedFiles: [
      { id: '1', name: 'Regalia-Gold-Oct.pdf', size: '412 KB' },
      { id: '2', name: 'Amex-Platinum-Sep.pdf', size: '1.2 MB' },
    ],
  },
};

export const TooLarge: Story = {
  args: {
    ...defaultProps,
    showDropArea: false,
    queuedFiles: [
      {
        id: '1',
        name: 'Annual-Report-2025.pdf',
        size: '31 MB',
        error: 'over 25 MB',
      },
    ],
  },
};

export const WithDropError: Story = {
  args: {
    ...defaultProps,
    error: 'This file type is not supported.',
  },
};
