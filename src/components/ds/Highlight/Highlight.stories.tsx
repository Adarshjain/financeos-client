import type { Meta, StoryObj } from '@storybook/react';

import { Highlight } from '@/components/ds';

const meta: Meta<typeof Highlight> = {
  title: 'DS/Foundations/Highlight',
  component: Highlight,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Text with every search match wrapped in a mint marker stroke that sweeps in once per new search.',
      },
    },
  },
  argTypes: {
    text: { control: 'text' },
    query: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Highlight>;

export const SearchMatch: Story = {
  args: {
    text: 'Adyar Anandha Bhavan',
    query: 'anandha',
  },
};
