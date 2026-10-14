import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Banner } from './Banner';

const meta: Meta<typeof Banner> = {
  title: 'DS/Feedback/Banner',
  component: Banner,
  parameters: {
    layout: 'padded',
  },
  args: {
    children: 'Email or password is incorrect.',
  },
};

export default meta;
type Story = StoryObj<typeof Banner>;

export const ErrorBanner: Story = {
  name: 'Error',
  render: () => (
    <div className="max-w-md">
      <Banner tone="err">
        <div>Email or password is incorrect.</div>
      </Banner>
    </div>
  ),
};

export const SuccessBanner: Story = {
  name: 'Success',
  render: () => (
    <div className="max-w-md">
      <Banner tone="ok">
        <div>Your account has been deleted.</div>
      </Banner>
    </div>
  ),
};

export const InfoBanner: Story = {
  name: 'Info',
  render: () => (
    <div className="max-w-md">
      <Banner tone="info">
        <div>That item is already handled.</div>
      </Banner>
    </div>
  ),
};

export const WarningBanner: Story = {
  name: 'Warning',
  render: () => (
    <div className="max-w-md">
      <Banner tone="warn">
        <div>
          2 lines were skipped: a reward-points summary and a duplicate header row.
        </div>
      </Banner>
    </div>
  ),
};

export const WithAction: Story = {
  name: 'With action',
  render: () => (
    <div className="max-w-md">
      <Banner
        tone="err"
        action={
          <button
            type="button"
            className="underline font-semibold hover:opacity-80"
          >
            Try again
          </button>
        }
      >
        Failed to load upcoming items.
      </Banner>
    </div>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-md">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Error (err)
        </div>
        <Banner tone="err">
          <div>Email or password is incorrect.</div>
        </Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Success (ok)
        </div>
        <Banner tone="ok">
          <div>Your account has been deleted.</div>
        </Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Info
        </div>
        <Banner tone="info">
          <div>That item is already handled.</div>
        </Banner>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Warning (warn)
        </div>
        <Banner tone="warn">
          <div>
            2 lines were skipped: a reward-points summary and a duplicate header row.
          </div>
        </Banner>
      </div>
    </div>
  ),
};
