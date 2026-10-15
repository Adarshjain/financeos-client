import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'DS/Data display/Divider',
  component: Divider,
  argTypes: {
    label: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-12 font-text">
      <div className="max-w-sm w-full flex flex-col gap-space-16">
        <Divider />
        <Divider label="or" />
      </div>
    </div>
  ),
};

export const Plain: Story = {
  args: {},
  render: (args) => (
    <div className="p-space-24 bg-canvas min-h-full flex items-center justify-center">
      <div className="max-w-sm w-full">
        <Divider {...args} />
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  args: {
    label: 'or',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas min-h-full flex items-center justify-center">
      <div className="max-w-sm w-full">
        <Divider {...args} />
      </div>
    </div>
  ),
};
