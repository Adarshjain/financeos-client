import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Illustration } from './Illustration';

const meta: Meta<typeof Illustration> = {
  title: 'DS/Feedback/Illustration',
  component: Illustration,
  argTypes: {
    variant: {
      control: 'select',
      options: ['signin', 'signup', 'offline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Illustration>;

export const AllVariants: Story = {
  render: () => (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-24 font-text">
      <div className="flex flex-col gap-space-8">
        <span className="text-caption font-mono text-ink-3">signin (desktop)</span>
        <div className="max-w-2xl w-full">
          <Illustration variant="signin" />
        </div>
      </div>

      <div className="flex flex-col gap-space-8">
        <span className="text-caption font-mono text-ink-3">signin · phone</span>
        <div className="max-w-sm w-full">
          <Illustration variant="signin" />
        </div>
      </div>

      <div className="flex flex-col gap-space-8">
        <span className="text-caption font-mono text-ink-3">signup (desktop)</span>
        <div className="max-w-2xl w-full">
          <Illustration variant="signup" />
        </div>
      </div>

      <div className="flex flex-col gap-space-8">
        <span className="text-caption font-mono text-ink-3">signup · phone</span>
        <div className="max-w-sm w-full">
          <Illustration variant="signup" />
        </div>
      </div>

      <div className="flex flex-col gap-space-8">
        <span className="text-caption font-mono text-ink-3">offline</span>
        <div className="p-space-24 bg-surface border border-line-soft rounded-ds-lg max-w-sm flex items-center justify-center">
          <Illustration variant="offline" />
        </div>
      </div>
    </div>
  ),
};

export const SignIn: Story = {
  args: {
    variant: 'signin',
  },
  render: (args) => (
    <div className="p-space-16 bg-canvas min-h-full flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <Illustration {...args} />
      </div>
    </div>
  ),
};

export const SignInPhone: Story = {
  name: 'signin · phone',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    variant: 'signin',
  },
  render: (args) => (
    <div className="p-space-8 bg-canvas min-h-full flex items-center justify-center">
      <div className="w-full max-w-sm">
        <Illustration {...args} />
      </div>
    </div>
  ),
};

export const SignUp: Story = {
  args: {
    variant: 'signup',
  },
  render: (args) => (
    <div className="p-space-16 bg-canvas min-h-full flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <Illustration {...args} />
      </div>
    </div>
  ),
};

export const SignUpPhone: Story = {
  name: 'signup · phone',
  parameters: {
    viewport: { defaultViewport: 'phone' },
  },
  args: {
    variant: 'signup',
  },
  render: (args) => (
    <div className="p-space-8 bg-canvas min-h-full flex items-center justify-center">
      <div className="w-full max-w-sm">
        <Illustration {...args} />
      </div>
    </div>
  ),
};

export const Offline: Story = {
  args: {
    variant: 'offline',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas min-h-full flex items-center justify-center">
      <div className="p-space-24 bg-surface border border-line-soft rounded-ds-lg">
        <Illustration {...args} />
      </div>
    </div>
  ),
};
