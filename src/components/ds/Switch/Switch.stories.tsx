import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Switch } from '@/components/ds';

const meta: Meta<typeof Switch> = {
  title: 'DS/Form fields/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A bare switch control for toggling a boolean setting.',
      },
    },
  },
  argTypes: {
    checked: {
      control: 'boolean',
    },
    defaultChecked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    name: {
      control: 'text',
    },
    value: {
      control: 'text',
    },
  },
  args: {
    onCheckedChange: fn(),
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <Switch
        {...args}
        checked={checked}
        onCheckedChange={(val) => {
          updateArgs({ checked: val });
          args.onCheckedChange?.(val);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Off: Story = {
  args: {
    checked: false,
  },
};

export const On: Story = {
  args: {
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    checked: false,
  },
};
