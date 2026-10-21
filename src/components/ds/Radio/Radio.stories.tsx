import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Radio } from '@/components/ds';

const meta: Meta<typeof Radio> = {
  title: 'DS/Form fields/Radio',
  component: Radio,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A round choice mark for one-of-many rows: the Mark paid choice, the installments choice and single-choice open lists.',
      },
    },
  },
  args: {
    checked: false,
    onCheckedChange: fn(),
    'aria-label': 'Pay in full, ₹24,990',
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    defaultChecked: { control: false },
  },
  render: function Render(args) {
    const [{ checked }, updateArgs] = useArgs();
    return (
      <Radio
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
type Story = StoryObj<typeof Radio>;

export const Default: Story = {};
