import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Callout, Note } from './Callout';

const meta: Meta<typeof Callout> = {
  title: 'DS/Feedback/Callout',
  component: Callout,
  parameters: {
    layout: 'padded',
  },
  args: {
    children: '2 bank credits look like dividends.',
  },
};

export default meta;
type Story = StoryObj<typeof Callout>;

export const ActOnIt: Story = {
  name: 'Act on it',
  render: () => (
    <div className="max-w-md">
      <Callout
        title="2 bank credits look like dividends."
        action={
          <a href="#reconcile" className="underline font-semibold">
            Reconcile
          </a>
        }
      />
    </div>
  ),
};

export const NoteVariant: Story = {
  name: 'Note',
  render: () => (
    <div className="max-w-md">
      <Note>
        Changing the pattern unlinks the 31 transactions it categorised.
      </Note>
    </div>
  ),
};

export const WarningBannerStyle: Story = {
  name: 'Warning banner style',
  render: () => (
    <div className="max-w-md">
      <Callout
        variant="warning-banner"
        action={
          <a href="#see-them" className="underline font-semibold">
            See them
          </a>
        }
      >
        2 lines were skipped.
      </Callout>
    </div>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-16 max-w-md">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Act on it
        </div>
        <Callout
          title="2 bank credits look like dividends."
          action={
            <a href="#reconcile" className="underline font-semibold">
              Reconcile
            </a>
          }
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Note
        </div>
        <Note>
          Changing the pattern unlinks the 31 transactions it categorised.
        </Note>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Warning banner style
        </div>
        <Callout
          variant="warning-banner"
          action={
            <a href="#see-them" className="underline font-semibold">
              See them
            </a>
          }
        >
          2 lines were skipped.
        </Callout>
      </div>
    </div>
  ),
};
