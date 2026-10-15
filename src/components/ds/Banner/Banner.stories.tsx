import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import { Banner } from './Banner';

const meta: Meta<typeof Banner> = {
  title: 'DS/Feedback/Banner',
  component: Banner,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    tone: {
      control: 'select',
      options: ['danger', 'success', 'warning', 'info', 'neutral'],
      description: 'Banner tone',
    },
    title: {
      control: 'text',
      description: 'Optional bold lead-in title',
    },
    children: {
      control: 'text',
      description: 'Banner message text',
    },
  },
  args: {
    tone: 'danger',
    children: 'Email or password is incorrect.',
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-md">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Danger
        </div>
        <Banner tone="danger">Email or password is incorrect.</Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Success
        </div>
        <Banner tone="success">Your account has been deleted.</Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Warning (with title & action)
        </div>
        <Banner
          tone="warning"
          title="2 bank credits look like dividends."
          action={<Button variant="link">Reconcile</Button>}
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Info
        </div>
        <Banner tone="info">That item is already handled.</Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Neutral (note)
        </div>
        <Banner tone="neutral">
          Changing the pattern unlinks the 31 transactions it categorised.
        </Banner>
      </div>
    </div>
  ),
};

export const Danger: Story = {
  name: 'Danger',
  args: {
    tone: 'danger',
    children: 'Email or password is incorrect.',
  },
};

export const Success: Story = {
  name: 'Success',
  args: {
    tone: 'success',
    children: 'Your account has been deleted.',
  },
};

export const Warning: Story = {
  name: 'Warning',
  args: {
    tone: 'warning',
    title: '2 bank credits look like dividends.',
    children: '',
    action: <Button variant="link">Reconcile</Button>,
  },
};

export const Info: Story = {
  name: 'Info',
  args: {
    tone: 'info',
    children: 'That item is already handled.',
  },
};

export const Neutral: Story = {
  name: 'Neutral',
  args: {
    tone: 'neutral',
    children:
      'Changing the pattern unlinks the 31 transactions it categorised.',
  },
};

export const WithAction: Story = {
  name: 'With action',
  args: {
    tone: 'danger',
    children: 'Failed to load upcoming items.',
    action: <Button variant="link">Try again</Button>,
  },
};
