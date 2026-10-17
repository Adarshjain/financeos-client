import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Checkbox } from '@/components/ds';

const meta: Meta<typeof Checkbox> = {
  title: 'DS/Form fields/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A square tick box for multi-choice on desktop: the selection column of desktop tables, multi-select options, and confirm lists ("Select all 12 matches").',
      },
    },
  },
  args: {
    checked: false,
    onCheckedChange: fn(),
  },
  argTypes: {
    checked: {
      control: 'select',
      options: [false, true, 'indeterminate'],
    },
    disabled: {
      control: 'boolean',
    },
    defaultChecked: {
      control: false,
    },
    asChild: {
      control: false,
    },
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <Checkbox
        {...args}
        checked={checked}
        onCheckedChange={(val) => {
          args.onCheckedChange?.(val);
          updateArgs({ checked: val });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Off: Story = {
  args: {
    checked: false,
    'aria-label': 'Off',
  },
};

export const On: Story = {
  args: {
    checked: true,
    'aria-label': 'On',
  },
};

export const Mixed: Story = {
  args: {
    checked: 'indeterminate',
    'aria-label': 'Mixed',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    checked: false,
    'aria-label': 'Disabled',
  },
};
