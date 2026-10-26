import type { Meta, StoryObj } from '@storybook/react';

import { MessageBubble } from '@/components/ds';

const meta: Meta<typeof MessageBubble> = {
  title: 'DS/Data display/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A sent message in a conversation, aligned to the end of the column.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-md w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    children: { control: 'text' },
    meta: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Default: Story = {
  args: { children: 'What did I spend on food last month?' },
};

export const WithMeta: Story = {
  args: { children: 'What did I spend on food last month?', meta: '10:42' },
};

export const LongMessage: Story = {
  args: {
    children:
      'Show me every payment above the usual amount, grouped by merchant, for the last three months, and tell me which ones repeat so I can decide what to cancel.',
    meta: '10:43',
  },
};
