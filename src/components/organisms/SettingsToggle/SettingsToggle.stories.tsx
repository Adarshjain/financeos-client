import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { SettingsToggle } from '@/components/organisms';

const meta: Meta<typeof SettingsToggle> = {
  title: 'Organisms/SettingsToggle',
  component: SettingsToggle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A settings row with a label, optional description, optional error line and a switch on the right.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
    },
    description: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
    defaultChecked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    borderTop: {
      control: 'boolean',
    },
  },
  args: {
    label: 'Exclude from net worth',
    onCheckedChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SettingsToggle>;

export const Default: Story = {
  args: {
    label: 'Exclude from net worth',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Exclude from net worth',
    description: 'Hide this account from totals',
  },
};

export const On: Story = {
  args: {
    label: 'Exclude from net worth',
    description: 'Hide this account from totals',
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Exclude from net worth',
    description: 'Hide this account from totals',
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Exclude from net worth',
    description: 'Hide this account from totals',
    error: 'Failed to update settings. Please retry.',
  },
};
