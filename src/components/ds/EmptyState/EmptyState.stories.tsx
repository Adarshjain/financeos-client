import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card, ConcealProvider, EmptyState, type EmptyStateProps, Icon } from '@/components/ds';

/** The action objects are flattened into plain controls; an empty label removes that action. */
type StoryArgs = Omit<EmptyStateProps, 'action' | 'secondaryAction' | 'illustration'> & {
  actionLabel: string;
  actionVariant: 'primary' | 'secondary' | 'link';
  secondaryActionLabel: string;
  illustration: boolean;
  onAction: () => void;
  onSecondaryAction: () => void;
};

const meta: Meta<StoryArgs> = {
  title: 'DS/Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'What a screen shows when it has nothing yet, or cannot load: an optional illustration, a screen-title headline, one sentence, and the action that fixes it, with an optional second one. Clear an action label in Controls to remove that action. Cases from the boards: first run (No accounts yet · Add account), nothing matches (both actions secondary: Clear amount · Clear all filters), all clear (no actions), and compact for small panels.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Card className="max-w-md">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    compact: { control: 'boolean' },
    illustration: { control: 'boolean', description: 'Show an illustration (the app passes Illustration; here an Icon stands in)' },
    actionLabel: { control: 'text', description: '`action.label`; empty removes the action' },
    actionVariant: { control: 'inline-radio', options: ['primary', 'secondary', 'link'], description: '`action.variant`' },
    secondaryActionLabel: { control: 'text', description: '`secondaryAction.label`; empty removes it' },
    onAction: { table: { disable: true } },
    onSecondaryAction: { table: { disable: true } },
    children: { control: false },
  },
  args: {
    title: 'No transactions match',
    description: 'Last 90 days · Category: Travel · Amount over ₹50,000',
    size: 'md',
    compact: false,
    illustration: false,
    actionLabel: 'Clear amount',
    actionVariant: 'secondary',
    secondaryActionLabel: 'Clear all filters',
    onAction: fn(),
    onSecondaryAction: fn(),
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  name: 'Empty state',
  render: ({ actionLabel, actionVariant, secondaryActionLabel, illustration, onAction, onSecondaryAction, ...args }) => (
    <EmptyState
      {...args}
      illustration={illustration ? <Icon name="check" size="lg" /> : undefined}
      action={actionLabel ? { label: actionLabel, variant: actionVariant, onSelect: onAction } : undefined}
      secondaryAction={
        secondaryActionLabel ? { label: secondaryActionLabel, onSelect: onSecondaryAction } : undefined
      }
    />
  ),
};

export const Concealed: Story = {
  ...Playground,
  args: { ...Playground.args, title: 'No bills over ₹5,000', description: 'Nothing above ₹5,000 this month' },
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

export const PageLevel: Story = {
  ...Playground,
  name: 'Page level (first use)',
  args: {
    ...Playground.args,
    title: 'No accounts yet',
    description: 'Add an account to start tracking.',
    actionLabel: 'Add account',
    actionVariant: 'primary',
    secondaryActionLabel: '',
  },
  parameters: {
    docs: { description: { story: 'A screen\'s main list with nothing yet: heading, one hint line, one primary button.' } },
  },
};

export const NoMatch: Story = {
  ...Playground,
  name: 'No match',
  args: {
    ...Playground.args,
    title: 'No transactions match',
    description: 'Try fewer or different filters.',
    actionLabel: 'Clear filters',
    actionVariant: 'secondary',
    secondaryActionLabel: '',
  },
  parameters: {
    docs: { description: { story: 'Filters match nothing: heading, one hint line, a "Clear filters" button; no pager around it.' } },
  },
};

export const SecondaryCard: Story = {
  ...Playground,
  name: 'Inside a secondary card',
  args: { ...Playground.args, compact: true, title: '', description: 'Nothing here yet.', actionLabel: '', secondaryActionLabel: '' },
  parameters: {
    docs: { description: { story: 'Secondary cards show one muted line (compact), no heading or button.' } },
  },
};
