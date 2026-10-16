import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import { Text } from '../Text/Text';
import { showToast } from '../Toast/Toast';
import { Root } from './Root';

const meta: Meta<typeof Root> = {
  title: 'DS/Foundations/Root',
  component: Root,
  argTypes: {
    children: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Root>;

export const AllVariants: Story = {
  render: () => (
    <Root className="p-space-24">
      <div className="flex flex-col gap-space-16 max-w-md">
        <Text variant="page-title" family="display">Dinero Ground</Text>
        <Text variant="body" tone="ink-3">
          Root fills the viewport with bg-canvas, font-text, text-ink, and mounts the Dinero Toaster once.
        </Text>
        <div>
          <Button
            variant="secondary"
            onClick={() => showToast('Toast notification through Root Toaster')}
          >
            Show toast
          </Button>
        </div>
      </div>
    </Root>
  ),
};

export const Default: Story = {
  render: (args) => (
    <Root {...args} className="p-space-24">
      <div className="flex flex-col gap-space-16 max-w-md">
        <Text variant="screen-title">Root Container</Text>
        <Text variant="body">
          Layouts render Root once around their children.
        </Text>
      </div>
    </Root>
  ),
};
