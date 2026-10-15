import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import { showToast, Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'DS/Feedback/Toast',
  component: Toast,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'success', 'danger', 'warning', 'info'],
      description: 'Toast tone (reused from Banner)',
    },
    message: {
      control: 'text',
      description: 'Message content',
    },
    undoLabel: {
      control: 'text',
      description: 'Undo action label',
    },
  },
  args: {
    tone: 'neutral',
    message: 'Snoozed until Wed 14 Oct',
    undoLabel: 'Undo',
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-sm">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Neutral (default · dark ink with Undo)
        </div>
        <Toast
          tone="neutral"
          message="Snoozed until Wed 14 Oct"
          onUndo={() => {}}
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Success (with Undo)
        </div>
        <Toast
          tone="success"
          message="Marked ₹20,000 paid · ₹13,900 still due"
          onUndo={() => {}}
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Danger
        </div>
        <Toast
          tone="danger"
          message="Couldn't snooze. The row is back."
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Warning
        </div>
        <Toast
          tone="warning"
          message="Imported 41 rows, 2 skipped"
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Info
        </div>
        <Toast
          tone="info"
          message="Dashboard deleted"
        />
      </div>
    </div>
  ),
};

export const Neutral: Story = {
  name: 'Neutral (default)',
  args: {
    tone: 'neutral',
    message: 'Snoozed until Wed 14 Oct',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Toast {...args} onUndo={() => alert('Undone')} />
    </div>
  ),
};

export const Success: Story = {
  name: 'Success',
  args: {
    tone: 'success',
    message: 'Marked ₹20,000 paid · ₹13,900 still due',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Toast {...args} onUndo={() => alert('Undone')} />
    </div>
  ),
};

export const Danger: Story = {
  name: 'Danger',
  args: {
    tone: 'danger',
    message: "Couldn't snooze. The row is back.",
  },
  render: (args) => (
    <div className="max-w-sm">
      <Toast {...args} />
    </div>
  ),
};

export const Warning: Story = {
  name: 'Warning',
  args: {
    tone: 'warning',
    message: 'Imported 41 rows, 2 skipped',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Toast {...args} />
    </div>
  ),
};

export const Info: Story = {
  name: 'Info',
  args: {
    tone: 'info',
    message: 'Dashboard deleted',
  },
  render: (args) => (
    <div className="max-w-sm">
      <Toast {...args} />
    </div>
  ),
};

export const InteractiveTrigger: Story = {
  name: 'Trigger in canvas',
  render: () => {
    return (
      <div className="flex flex-wrap gap-space-8 p-space-16">
        <Button
          variant="secondary"
          onClick={() =>
            showToast('Snoozed until Wed 14 Oct', {
              tone: 'neutral',
              onUndo: () => alert('Undone!'),
            })
          }
        >
          Toast Neutral
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            showToast('Marked ₹20,000 paid · ₹13,900 still due', {
              tone: 'success',
              onUndo: () => alert('Undone!'),
            })
          }
        >
          Toast Success
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            showToast("Couldn't snooze. The row is back.", {
              tone: 'danger',
            })
          }
        >
          Toast Danger
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            showToast('Imported 41 rows, 2 skipped', {
              tone: 'warning',
            })
          }
        >
          Toast Warning
        </Button>
      </div>
    );
  },
};
