import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Card, EmptyState, Icon } from '@/components/ds';

const meta: Meta<typeof EmptyState> = {
  title: 'DS/Feedback/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'What a screen shows when it has nothing yet, or cannot load: an optional illustration, a screen-title headline, one sentence, and the one action that fixes it.',
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
    title: {
      control: 'text',
      description: 'Primary headline',
    },
    description: {
      control: 'text',
      description: 'Explanatory description',
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Padding scale',
    },
    compact: {
      control: 'boolean',
      description: 'Compact single-line mode',
    },
    illustration: {
      control: false,
      description: 'Optional illustration slot',
    },
    action: {
      control: false,
      description: 'Action object with label and onSelect callback',
    },
  },
  args: {
    title: 'No accounts yet',
    description: 'Add a bank or card, or upload a statement.',
    size: 'md',
    compact: false,
    action: {
      label: 'Add account',
      onSelect: fn(),
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const FirstRun: Story = {
  name: 'First run',
  args: {
    title: 'No accounts yet',
    description: 'Add a bank or card, or upload a statement.',
    action: {
      label: 'Add account',
      onSelect: fn(),
    },
  },
};

export const NothingMatches: Story = {
  name: 'Nothing matches',
  args: {
    title: 'No transactions match',
    description: 'This year · manual · excluded only',
    action: {
      label: 'Clear all filters',
      variant: 'secondary',
      onSelect: fn(),
    },
  },
};

export const AllClear: Story = {
  name: 'All clear',
  args: {
    title: 'All clear',
    description: 'Nothing needs you right now.',
    action: undefined,
  },
};

export const CouldntLoad: Story = {
  name: "Couldn't load",
  args: {
    title: "Couldn't load the inbox",
    description: 'The server did not answer. Your items are safe.',
    action: {
      label: 'Try again',
      onSelect: fn(),
    },
  },
};

export const WithIllustration: Story = {
  name: 'With illustration',
  args: {
    title: 'No messages',
    description: 'Your inbox is completely caught up.',
    illustration: <Icon name="check" size="lg" />,
    action: undefined,
  },
};

export const Compact: Story = {
  name: 'Compact',
  args: {
    compact: true,
    title: undefined,
    description: undefined,
    children: 'Nothing due on this day.',
    action: undefined,
  },
};
