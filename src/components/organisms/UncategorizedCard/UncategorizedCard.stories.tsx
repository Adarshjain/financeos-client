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

/** No count and no group line, on phone and desktop: the numbers load when Sort them opens. */
export const Default: Story = {};
