import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { UncategorizedCard } from '@/components/organisms';

const meta: Meta<typeof UncategorizedCard> = {
  title: 'Organisms/UncategorizedCard',
  component: UncategorizedCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    count: 23,
    groupCount: 7,
    topGroups: [
      { label: 'Ravi Kumar', count: 6 },
      { label: 'Sharma Medicals', count: 4 },
      { label: 'Green Leaf Café', count: 3 },
    ],
    onSort: fn(),
  },
  argTypes: {
    count: { control: 'number' },
    groupCount: { control: 'number' },
    topGroups: { control: 'object' },
    onSort: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof UncategorizedCard>;

/** Phone names the biggest group; desktop lists the top three and "and N more". */
export const Default: Story = {};

/** Only one-offs: no group line. */
export const OnlyOneOffs: Story = { args: { count: 5, groupCount: 0, topGroups: [] } };
