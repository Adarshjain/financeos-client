import type { Meta, StoryObj } from '@storybook/react';

import { Logo } from '@/components/organisms';

const meta: Meta<typeof Logo> = {
  title: 'Organisms/Logo',
  component: Logo,
  parameters: {
    layout: 'padded',
  },
  args: {
    variant: 'mark',
    size: 'md',
    symbol: '₹',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['mark', 'full'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
    },
    symbol: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  args: {
    variant: 'mark',
    size: 'md',
    symbol: '₹',
  },
};

export const WithWordmark: Story = {
  args: {
    variant: 'full',
    size: 'md',
    symbol: '₹',
  },
};
