import type { Meta, StoryObj } from '@storybook/react';

import { Kbd } from '@/components/ds';

const meta: Meta<typeof Kbd> = {
  title: 'DS/Data display/Kbd',
  component: Kbd,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Keyboard key hints, desktop only: "J K move, X select", "⌘N" on the Add button.',
      },
    },
  },
  args: {
    children: 'J',
  },
  argTypes: {
    children: {
      control: 'text',
      description: 'Key symbol or combination',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Kbd>;

export const Default: Story = {
  args: {
    children: 'J',
  },
};
