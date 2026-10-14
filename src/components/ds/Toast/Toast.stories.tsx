import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'DS/Feedback/Toast',
  component: Toast,
  parameters: {
    layout: 'padded',
  },
  args: {
    message: 'Dashboard deleted',
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Confirmation: Story = {
  name: 'Confirmation',
  render: () => (
    <div className="max-w-sm">
      <Toast message="Dashboard deleted" />
    </div>
  ),
};

export const Undo: Story = {
  name: 'Undo',
  render: () => (
    <div className="max-w-sm">
      <Toast
        message="Snoozed until Wed 14 Oct"
        onUndo={() => alert('Undone')}
      />
    </div>
  ),
};

export const MarkPaid: Story = {
  name: 'Marked paid',
  render: () => (
    <div className="max-w-sm">
      <Toast
        message="Marked ₹20,000 paid · ₹13,900 still due"
        onUndo={() => alert('Undone')}
      />
    </div>
  ),
};

export const Failure: Story = {
  name: 'Failure',
  render: () => (
    <div className="max-w-sm">
      <Toast message="Couldn't snooze. The row is back." isError />
    </div>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-sm">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Undo
        </div>
        <Toast
          message="Snoozed until Wed 14 Oct"
          onUndo={() => {}}
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Marked paid with Undo
        </div>
        <Toast
          message="Marked ₹20,000 paid · ₹13,900 still due"
          onUndo={() => {}}
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Confirmation (no undo)
        </div>
        <Toast message="Dashboard deleted" />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Failure
        </div>
        <Toast message="Couldn't snooze. The row is back." isError />
      </div>
    </div>
  ),
};
