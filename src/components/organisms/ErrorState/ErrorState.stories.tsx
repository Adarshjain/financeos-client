import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card } from '@/components/ds';
import { ErrorState, type ErrorStateProps } from '@/components/organisms';

/** The action object is flattened into plain controls; an empty label or reference removes that button. */
type StoryArgs = Omit<ErrorStateProps, 'action'> & { actionLabel: string; onAction: () => void };

const meta: Meta<StoryArgs> = {
  title: 'Organisms/ErrorState',
  component: ErrorState,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A request failed: what failed, one sentence, Retry and Copy reference. The copy button puts the reference on the clipboard and calls onCopyReference (see Actions). The rest of the page keeps rendering around it. Clear the action label or the reference in Controls to remove that button.',
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
    actionLabel: { control: 'text', description: '`action.label`; empty removes the retry button' },
    reference: { control: 'text', description: 'Empty removes the copy button' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    copyLabel: { control: false },
    illustration: { control: false },
    onAction: { table: { disable: true } },
    onCopyReference: { control: false },
  },
  args: {
    title: "Couldn't load transactions",
    description: 'The server answered with an error. Your data is safe; try again in a moment.',
    actionLabel: 'Retry',
    reference: 'f80e0834',
    size: 'md',
    onAction: fn(),
    onCopyReference: fn(),
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  name: 'Error state',
  render: ({ actionLabel, onAction, reference, ...args }) => (
    <ErrorState
      {...args}
      action={actionLabel ? { label: actionLabel, onSelect: onAction } : undefined}
      reference={reference || undefined}
    />
  ),
};
