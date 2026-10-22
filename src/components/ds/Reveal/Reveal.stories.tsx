import type { Meta, StoryObj } from '@storybook/react';

import { Reveal, TextField } from '@/components/ds';

const meta: Meta<typeof Reveal> = {
  title: 'DS/Foundations/Reveal',
  component: Reveal,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Shows and hides content with an animation instead of a pop. Toggle `open` in the controls.',
      },
    },
  },
  argTypes: {
    open: { control: { type: 'boolean' } },
    axis: { control: { type: 'select' }, options: ['y', 'x'] },
    children: { control: false },
  },
  args: {
    open: true,
  },
};

export default meta;
type Story = StoryObj<typeof Reveal>;

export const Vertical: Story = {
  args: {
    axis: 'y',
    children: <TextField aria-label="Note" placeholder="Note" />,
  },
};

export const Horizontal: Story = {
  args: {
    axis: 'x',
    children: <TextField aria-label="To account" placeholder="HDFC Savings" />,
  },
};
