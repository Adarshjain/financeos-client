import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { UncategorizedCard } from '@/components/organisms';

const meta: Meta<typeof UncategorizedCard> = {
  title: 'Organisms/UncategorizedCard',
  component: UncategorizedCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { onSort: fn() },
  argTypes: { onSort: { control: false } },
};

export default meta;
type Story = StoryObj<typeof UncategorizedCard>;

/** One line: the words with a Sort them link, wrapping on phone. No count and no group line. */
export const Default: Story = {};
