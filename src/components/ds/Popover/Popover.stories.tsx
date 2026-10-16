import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, Icon, Popover, Text } from '@/components/ds';

const meta: Meta<typeof Popover> = {
  title: 'DS/Overlays/Popover',
  component: Popover,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The one floating surface every dropdown uses: Select\'s list, Menu, DateField\'s calendar, the dashboard switcher. Built on Radix Popover / DropdownMenu, which position with Floating UI (flip, shift, collision with the viewport).',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-64">
        <Story />
      </div>
    ),
  ],
  args: {
    align: 'start',
    side: 'bottom',
    onOpenChange: fn(),
  },
  argTypes: {
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end'],
    },
    side: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
    },
    trigger: { control: false },
    children: { control: false },
    onOpenChange: { control: false },
    contentProps: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Popover>;

export const Default: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" icon={<Icon name="chevron-down" />}>
        HDFC Regalia Gold
      </Button>
    ),
    children: (
      <div className="flex flex-col gap-space-4">
        <Text>HDFC Regalia Gold</Text>
        <Text tone="ink-3">Amex Platinum</Text>
        <Text tone="ink-3">SBI SimplyClick</Text>
      </div>
    ),
  },
};

export const WithCompactTrigger: Story = {
  args: {
    defaultOpen: true,
    trigger: (
      <Button variant="secondary" size="sm" icon={<Icon name="chevron-down" />}>
        Options
      </Button>
    ),
    children: (
      <div className="flex flex-col gap-space-4">
        <Text>Compact trigger content</Text>
      </div>
    ),
  },
};
