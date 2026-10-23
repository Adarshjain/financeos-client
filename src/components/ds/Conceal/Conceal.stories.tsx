import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Conceal, type ConcealProps,ConcealProvider } from '@/components/ds';

type StoryArgs = ConcealProps & { concealed: boolean };

const meta: Meta<StoryArgs> = {
  title: 'DS/Data display/Conceal',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Shows "₹ —" in place of every ₹ amount while amounts are hidden. The app keeps the switch and passes it to ConcealProvider; Text, ListRow, KpiTile and TransactionRow read it themselves.',
      },
    },
  },
  tags: ['autodocs'],
  args: { concealed: false, children: 'Spent ₹1,250.00 of ₹1,55,000', whole: false },
  argTypes: {
    concealed: { control: 'boolean', description: 'ConcealProvider: whether amounts are hidden' },
    children: { control: 'text' },
    value: { control: 'text' },
    whole: { control: 'boolean' },
  },
  render: ({ concealed, ...args }) => (
    <ConcealProvider concealed={concealed}>
      <Conceal {...args} />
    </ConcealProvider>
  ),
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Shown: Story = {};

export const Hidden: Story = {
  args: { concealed: true },
};
