import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ConcealProvider } from '@/components/ds';
import { Amount } from '@/components/organisms';

const meta: Meta<typeof Amount> = {
  title: 'Organisms/Amount',
  component: Amount,
  parameters: { layout: 'padded' },
  argTypes: {
    direction: { control: 'select', options: [undefined, 'credit', 'debit'] },
    decimals: { control: 'select', options: ['whole', 'auto', 'exact'] },
    variant: { control: 'select', options: ['body', 'body-strong', 'heading', 'title', 'figure'] },
    concealed: { control: 'boolean' },
    symbol: { control: 'boolean' },
    prefix: { control: 'text' },
    fraction: { control: 'select', options: [undefined, 'small'] },
  },
  args: { value: 24990, direction: 'debit', decimals: 'auto' },
};

export default meta;
type Story = StoryObj<typeof Amount>;

export const Debit: Story = {};

export const Credit: Story = { args: { value: 46800, direction: 'credit' } };

export const WithPaise: Story = { args: { value: 1249.5, direction: 'debit', decimals: 'exact', fraction: 'small' } };

export const WithPrefix: Story = { args: { value: 44319, direction: 'debit', prefix: 'You owe' } };

export const Concealed: Story = { args: { value: 46800, direction: 'credit', concealed: true } };

export const AppHidesAmounts: Story = {
  render: (args) => (
    <ConcealProvider concealed>
      <Amount {...args} value={46800} direction="credit" />
    </ConcealProvider>
  ),
};
