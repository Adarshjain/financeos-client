import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Root, Text } from '@/components/ds';

const meta: Meta<typeof Root> = {
  title: 'DS/Foundations/Root',
  component: Root,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The top of every Dinero page tree. Fills the viewport and mounts the Dinero Toaster once.',
      },
    },
  },
  args: {
    children: <Text variant="body">Page content</Text>,
  },
  argTypes: {
    children: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Root>;

export const Default: Story = {
  args: {
    children: <Text variant="body">Page content</Text>,
  },
};
