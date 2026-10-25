import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import { Button, Icon, Text } from '@/components/ds';

const meta: Meta<typeof Button> = {
  title: 'DS/Actions/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Buttons: one primary per view, secondary for everything else, ghost for low-emphasis icon actions, danger for destructive ones.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'danger-filled', 'ghost', 'danger-ghost', 'link', 'danger-link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'xl'],
    },
    layout: {
      control: 'select',
      options: ['inline', 'stacked'],
    },
    fullWidth: {
      control: 'boolean',
    },
    iconOnly: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    loadingLabel: {
      control: 'text',
    },
    count: {
      control: 'text',
    },
    icon: {
      control: false,
    },
    asChild: {
      control: false,
    },
    children: {
      control: 'text',
    },
  },
  args: {
    children: 'Button',
    variant: 'secondary',
    size: 'md',
    layout: 'inline',
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const DangerOutline: Story = {
  args: {
    variant: 'danger',
    children: 'Delete…',
  },
};

export const DangerFilled: Story = {
  args: {
    variant: 'danger-filled',
    children: 'Delete statement',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  render: () => (
    <Text variant="body">
      Your HDFC statement is ready. <Button variant="link">View statement</Button>
    </Text>
  ),
};

export const DangerGhost: Story = {
  args: { variant: 'danger-ghost', children: 'Delete' },
};

export const DangerLink: Story = {
  render: () => (
    <Text variant="body">
      This statement was imported twice. <Button variant="danger-link">Delete statement</Button>
    </Text>
  ),
};

export const IconButton: Story = {
  args: {
    iconOnly: true,
    icon: <Icon name="close" size="sm" />,
    'aria-label': 'Close',
    children: undefined,
  },
};

export const Stacked: Story = {
  args: {
    layout: 'stacked',
    icon: <Icon name="add" size="lg" />,
    children: 'Transaction',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small 26px',
  },
};

export const Phone: Story = {
  args: {
    size: 'xl',
    children: 'Sheet footer 44px',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    loadingLabel: 'Saving…',
    children: 'Save',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Icon name="add" size="md" />,
    children: 'Add filter',
  },
};

export const WithCount: Story = {
  args: {
    children: 'Rules',
    count: 3,
  },
};

export const IconButtonWithDot: Story = {
  args: {
    variant: 'secondary',
    iconOnly: true,
    dot: true,
    'aria-label': 'Notifications',
    children: <Icon name="notifications" size="md" />,
  },
};
