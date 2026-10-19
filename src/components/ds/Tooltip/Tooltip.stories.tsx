import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, Tooltip } from '@/components/ds';

const meta: Meta<typeof Tooltip> = {
  title: 'DS/Overlays/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A short label for a control, shown on hover or keyboard focus. Desktop only: it never shows in the phone layout.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-32 flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
  args: {
    content: 'Edit account',
    side: 'top',
    align: 'center',
    delayDuration: 300,
    defaultOpen: true,
    onOpenChange: fn(),
  },
  argTypes: {
    side: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end'],
    },
    delayDuration: { control: { type: 'number' } },
    children: { control: false },
    onOpenChange: { control: false },
    className: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  args: {
    children: <Button variant="secondary">HDFC Regalia Gold</Button>,
  },
};
