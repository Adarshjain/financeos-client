import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Banner,ConcealProvider } from '@/components/ds';

const meta: Meta<typeof Banner> = {
  title: 'DS/Feedback/Banner',
  component: Banner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The one inline message. It replaces Callout and Note: a failed request at the top of a form, a success that needs no action, how the screen was reached, something to act on inside a card, or a neutral note.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    tone: {
      control: 'select',
      options: ['danger', 'success', 'warning', 'info', 'neutral'],
      description: 'Banner tone',
    },
    rounded: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Corner radius (default lg)',
    },
    title: {
      control: 'text',
      description: 'Optional bold lead-in title',
    },
    children: {
      control: 'text',
      description: 'Banner message text',
    },
    action: {
      control: false,
      description: 'Action object with label and onSelect callback',
    },
    onDismiss: {
      control: false,
      description: 'Dismiss callback',
    },
  },
  args: {
    tone: 'danger',
    children: 'Email or password is incorrect.',
    onDismiss: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const Danger: Story = {
  name: 'Danger',
  args: {
    tone: 'danger',
    children: 'Email or password is incorrect.',
    onDismiss: undefined,
  },
};

export const Success: Story = {
  name: 'Success',
  args: {
    tone: 'success',
    children: 'Your account has been deleted.',
    onDismiss: undefined,
  },
};

export const Warning: Story = {
  name: 'Warning',
  args: {
    tone: 'warning',
    title: '2 bank credits look like dividends.',
    children: 'Review and categorize these deposits.',
    action: {
      label: 'Reconcile',
      onSelect: fn(),
    },
    onDismiss: undefined,
  },
};

export const Info: Story = {
  name: 'Info',
  args: {
    tone: 'info',
    children: 'That item is already handled.',
    onDismiss: undefined,
  },
};

export const Neutral: Story = {
  name: 'Neutral',
  args: {
    tone: 'neutral',
    children:
      'Changing the pattern unlinks the 31 transactions it categorised.',
    onDismiss: undefined,
  },
};

export const WithAction: Story = {
  name: 'With action',
  args: {
    tone: 'danger',
    children: 'Failed to load upcoming items.',
    action: {
      label: 'Retry',
      onSelect: fn(),
    },
    onDismiss: undefined,
  },
};

export const WithDismiss: Story = {
  name: 'With dismiss',
  args: {
    tone: 'info',
    children: 'A new feature has been added to your dashboard.',
    onDismiss: fn(),
  },
};

export const FullWidth: Story = {
  name: 'Full width',
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <Story />],
  args: {
    tone: 'info',
    rounded: 'none',
    title: 'FinanceOS was updated.',
    children: 'Refresh to use the latest version.',
    action: { label: 'Refresh', onSelect: fn() },
    onDismiss: fn(),
  },
};

export const Concealed: Story = {
  ...Danger,
  args: { ...Danger.args, title: 'Over budget.', children: '₹2,400 above the limit' },
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
