import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { StepList } from '@/components/ds';

const steps = [
  { id: 'read', label: 'Read the file', meta: '0.4s', state: 'done' as const },
  { id: 'query', label: 'Run the query', meta: '1.2s', state: 'done' as const },
  { id: 'chart', label: 'Draw the chart', state: 'running' as const },
];

const cardSteps = [
  {
    id: 'read',
    label: 'Read the file',
    meta: '0.4s',
    detail: 'Two sheets, 1,204 rows',
    state: 'done' as const,
    code: 'SELECT category, SUM(amount)\nFROM rows\nGROUP BY category',
  },
  { id: 'query', label: 'Run the query', meta: '1.2s', detail: '38 rows returned', state: 'done' as const },
  { id: 'chart', label: 'Draw the chart', detail: 'Could not plot the result', state: 'failed' as const },
];

const meta: Meta<typeof StepList> = {
  title: 'DS/Feedback/StepList',
  component: StepList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'The progress steps of a running or finished task.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: { control: 'select', options: ['live', 'card'] },
    showCodeLabel: { control: 'text' },
    hideCodeLabel: { control: 'text' },
  },
  args: { onOpenIdsChange: fn() },
};

export default meta;
type Story = StoryObj<typeof StepList>;

export const Live: Story = { args: { variant: 'live', steps } };

export const LiveFailed: Story = {
  args: {
    variant: 'live',
    steps: [...steps.slice(0, 2), { id: 'chart', label: 'Draw the chart', state: 'failed' }],
  },
};

export const Card: Story = { args: { variant: 'card', steps: cardSteps } };

export const CardCodeOpen: Story = {
  args: { variant: 'card', steps: cardSteps, defaultOpenIds: ['read'] },
};
