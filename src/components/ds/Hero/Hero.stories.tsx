import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ConcealProvider, Hero, ProgressBar } from '@/components/ds';

const meta: Meta<typeof Hero> = {
  title: 'DS/Data display/Hero',
  component: Hero,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The headline of a page: one big figure (optional label above, change line below), up to three small figures, and a slot for a ProgressBar. The same layout at both sizes; the row of three wraps two across on a phone. Hero.Skeleton is its loading state.',
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
  argTypes: { label: { control: 'text' }, value: { control: 'text' }, children: { control: false } },
  args: {
    value: '₹12,40,000',
    change: { text: '+₹1,240 today', tone: 'positive' },
    figures: [
      { label: 'Invested', value: '₹10,00,000' },
      { label: 'Unrealised P&L', value: '+₹2,40,000', tone: 'positive', caption: '+24%' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Default: Story = {};

export const WithLabel: Story = { args: { label: 'Net worth', change: undefined } };

export const ThreeFigures: Story = {
  args: {
    label: 'Net worth',
    value: '₹48,20,000',
    change: undefined,
    figures: [
      { label: 'Cash & wallets', value: '₹3,10,000' },
      { label: 'Cards you owe', value: '₹42,000', tone: 'danger' },
      { label: 'Investments', value: '₹45,00,000' },
    ],
  },
};

export const HeadlineOnly: Story = { args: { figures: undefined, change: undefined } };

export const WithProgress: Story = {
  args: {
    label: 'Outstanding',
    value: '₹8,40,000',
    change: undefined,
    figures: [
      { label: 'EMI', value: '₹21,000' },
      { label: 'Rate', value: '9.5%' },
      { label: 'Months left', value: '48' },
    ],
    children: <ProgressBar value={40} max={100} />,
  },
};

export const Skeleton: Story = {
  render: () => <Hero.Skeleton label change figures={3} />,
};

export const Concealed: Story = {
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
};

export const Combinations: Story = {
  render: () => (
    <div className="flex flex-col gap-space-24">
      <Hero value="₹12,40,000" change={{ text: '+₹1,240 today', tone: 'positive' }} figures={[{ label: 'Invested', value: '₹10,00,000' }, { label: 'Unrealised P&L', value: '+₹2,40,000', tone: 'positive' }]} />
      <Hero label="Net worth" value="₹48,20,000" figures={[{ label: 'Cash', value: '₹3,10,000' }, { label: 'Cards you owe', value: '₹42,000', tone: 'danger' }, { label: 'Investments', value: '₹45,00,000' }]} />
      <Hero value="₹5,000" />
      <Hero label="Outstanding" value="₹8,40,000" figures={[{ label: 'EMI', value: '₹21,000' }]}>
        <ProgressBar value={40} max={100} />
      </Hero>
      <Hero.Skeleton label change figures={3} />
    </div>
  ),
};
