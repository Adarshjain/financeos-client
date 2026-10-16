import type { Meta, StoryObj } from '@storybook/react';

import { DateTile } from '@/components/ds';

const meta: Meta<typeof DateTile> = {
  title: 'DS/Data display/DateTile',
  component: DateTile,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The compact day tile showing a bold day number over an uppercase month label.',
      },
    },
  },
  argTypes: {
    day: { control: 'number' },
    monthLabel: { control: 'text' },
  },
  args: {
    day: 15,
    monthLabel: 'OCT',
  },
};

export default meta;
type Story = StoryObj<typeof DateTile>;

export const Default: Story = {
  args: {
    day: 15,
    monthLabel: 'OCT',
  },
};
