import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ConcealProvider, Figures } from '@/components/ds';

const meta: Meta<typeof Figures> = {
  title: 'DS/Data display/Figures',
  component: Figures,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A grid of small figures: a label over a strong figure, with an optional tone and caption. Equal columns and no dividers; two across on a phone, three (or four) from desk up. The Hero draws its small figures with it. Figures.Skeleton is its loading state.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-container-md">
        <Story />
      </div>
    ),
  ],
  argTypes: { columns: { control: 'inline-radio', options: [3, 4] } },
  args: {
    figures: [
      { label: 'Quantity', value: '120' },
      { label: 'Avg cost', value: '₹1,204.50' },
      { label: 'LTP', value: '₹1,310.25', caption: 'Yahoo · 3:30 pm' },
      { label: 'Realised P&L', value: '+₹4,200', tone: 'positive', caption: 'booked on sells' },
      { label: 'Total charges', value: '₹312.40', caption: 'across 6 trades' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Figures>;

export const Default: Story = {};

export const FourAcross: Story = { args: { columns: 4 } };

export const Tones: Story = {
  args: {
    figures: [
      { label: 'Gain', value: '+₹2,40,000', tone: 'positive', caption: '+24%' },
      { label: 'Loss', value: '−₹1,200', tone: 'danger', caption: '−2%' },
      { label: 'Neutral', value: '₹10,00,000' },
    ],
  },
};

export const Skeleton: Story = { render: () => <Figures.Skeleton count={6} /> };

export const Concealed: Story = {
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
};
