import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, ConcealProvider, showToast, Toast, Toaster } from '@/components/ds';

const meta: Meta<typeof Toast> = {
  title: 'DS/Feedback/Toast',
  component: Toast,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A Banner that floats at the bottom of the screen after an action, for about 5 seconds, with Undo when the action can be reversed.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
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
    action: {
      control: false,
      description: 'Action object with label and onSelect callback',
    },
  },
  args: {
    tone: 'neutral',
    message: 'Snoozed until Wed 14 Oct',
    action: {
      label: 'Undo',
      onSelect: fn(),
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Neutral: Story = {
  name: 'Neutral (default)',
  args: {
    tone: 'neutral',
    message: 'Snoozed until Wed 14 Oct',
  },
};

export const Success: Story = {
  name: 'Success',
  args: {
    tone: 'success',
    message: 'Marked ₹20,000 paid · ₹13,900 still due',
  },
};

export const Danger: Story = {
  name: 'Danger',
  args: {
    tone: 'danger',
    message: "Couldn't snooze. The row is back.",
    action: undefined,
  },
};

export const Warning: Story = {
  name: 'Warning',
  args: {
    tone: 'warning',
    message: 'Imported 41 rows, 2 skipped',
    action: undefined,
  },
};

export const Info: Story = {
  name: 'Info',
  args: {
    tone: 'info',
    message: 'Dashboard deleted',
    action: undefined,
  },
};

export const InteractiveTrigger: Story = {
  name: 'Interactive Trigger',
  parameters: {
    docs: {
      description: {
        story: 'Mount <Toaster /> once, then call showToast.',
      },
    },
  },
  render: (args) => {
    return (
      <div className="flex flex-col gap-space-16">
        <Toaster />
        <div>
          <Button
            variant="primary"
            onClick={() =>
              showToast(args.message, {
                tone: args.tone,
                action: args.action,
              })
            }
          >
            Show toast
          </Button>
        </div>
      </div>
    );
  },
};

export const Concealed: Story = {
  ...Neutral,
  args: { ...Neutral.args, message: 'Paid ₹1,250 to Uber' },
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
  parameters: {
    docs: { description: { story: 'While amounts are hidden (ConcealProvider), every ₹ amount reads "₹ —".' } },
  },
};
