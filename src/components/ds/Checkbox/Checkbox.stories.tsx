import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'DS/Inputs/Checkbox',
  component: Checkbox,
  argTypes: {
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    indeterminate: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12">
      <div className="flex gap-space-16 items-center">
        <Checkbox checked={false} aria-label="Off" />
        <Checkbox checked={true} aria-label="On" />
        <Checkbox checked="indeterminate" aria-label="Mixed" />
        <Checkbox disabled aria-label="Disabled" />
      </div>
    </div>
  ),
};

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
    'aria-label': 'Disabled',
  },
};
