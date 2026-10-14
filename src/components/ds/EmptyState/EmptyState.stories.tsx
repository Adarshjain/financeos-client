import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { EmptyState, OfflineIllustration } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'DS/Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'No accounts yet',
    description: 'Add a bank or card, or upload a statement.',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const FirstRun: Story = {
  name: 'First run',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState
        title="No accounts yet"
        description="Add a bank or card, or upload a statement."
        action={<Button variant="primary">Add account</Button>}
      />
    </Card>
  ),
};

export const NothingMatches: Story = {
  name: 'Nothing matches',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState
        title="No transactions match"
        description="This year · manual · excluded only"
        action={<Button variant="secondary">Clear all filters</Button>}
      />
    </Card>
  ),
};

export const AllClear: Story = {
  name: 'All clear',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState
        title="All clear"
        description="Nothing needs you right now."
        action={
          <>
            <Button variant="secondary">Upcoming</Button>
            <Button variant="secondary">Transactions</Button>
          </>
        }
      />
    </Card>
  ),
};

export const CouldntLoad: Story = {
  name: "Couldn't load",
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState
        title="Couldn't load the inbox"
        description="The server did not answer. Your items are safe."
        action={<Button variant="primary">Try again</Button>}
      />
    </Card>
  ),
};

export const Offline: Story = {
  name: 'Offline',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState
        illustration={<OfflineIllustration />}
        title="You're offline"
        description="FinanceOS needs a connection to show your money. We'll pick up where you left off."
        action={<Button variant="primary">Try again</Button>}
      />
    </Card>
  ),
};

export const NothingOnThisDay: Story = {
  name: 'Nothing on this day',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <EmptyState compact>Nothing due on this day.</EmptyState>
    </Card>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          First run
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState
            title="No accounts yet"
            description="Add a bank or card, or upload a statement."
            action={<Button variant="primary">Add account</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Nothing matches
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState
            title="No transactions match"
            description="This year · manual · excluded only"
            action={<Button variant="secondary">Clear all filters</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          All clear
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState
            title="All clear"
            description="Nothing needs you right now."
            action={
              <>
                <Button variant="secondary">Upcoming</Button>
                <Button variant="secondary">Transactions</Button>
              </>
            }
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          {"Couldn't load"}
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState
            title="Couldn't load the inbox"
            description="The server did not answer. Your items are safe."
            action={<Button variant="primary">Try again</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Offline
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState
            illustration={<OfflineIllustration />}
            title="You're offline"
            description="FinanceOS needs a connection to show your money. We'll pick up where you left off."
            action={<Button variant="primary">Try again</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Nothing on this day (compact)
        </div>
        <Card className="p-space-0 overflow-hidden">
          <EmptyState compact>Nothing due on this day.</EmptyState>
        </Card>
      </div>
    </div>
  ),
};
