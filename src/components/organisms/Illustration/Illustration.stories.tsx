import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card } from '@/components/ds';
import { Illustration } from '@/components/organisms';

const meta: Meta<typeof Illustration> = {
  title: 'Organisms/Illustration',
  component: Illustration,
  decorators: [
    (Story) => (
      <div className="p-space-16 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Story />
        </div>
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['signin', 'signup', 'offline', 'notfound', 'error'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Illustration>;

export const SignIn: Story = {
  args: {
    variant: 'signin',
  },
};

export const SignUp: Story = {
  args: {
    variant: 'signup',
  },
};

export const Offline: Story = {
  args: {
    variant: 'offline',
  },
  decorators: [
    (Story) => (
      <div className="p-space-24 flex items-center justify-center">
        <Card className="p-space-24 flex items-center justify-center">
          <Story />
        </Card>
      </div>
    ),
  ],
};

export const NotFound: Story = {
  args: {
    variant: 'notfound',
  },
  decorators: [
    (Story) => (
      <div className="p-space-24 flex items-center justify-center">
        <Card className="p-space-24 flex items-center justify-center">
          <Story />
        </Card>
      </div>
    ),
  ],
};

export const Failure: Story = {
  args: {
    variant: 'error',
  },
  decorators: [
    (Story) => (
      <div className="p-space-24 flex items-center justify-center">
        <Card className="p-space-24 flex items-center justify-center">
          <Story />
        </Card>
      </div>
    ),
  ],
};
