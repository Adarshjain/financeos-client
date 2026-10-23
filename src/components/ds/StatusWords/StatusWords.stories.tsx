import type { Meta, StoryObj } from '@storybook/react';

import { ConcealProvider, StatusWord, StatusWords } from '@/components/ds';

const meta: Meta<typeof StatusWords> = {
  title: 'DS/Data display/StatusWords',
  component: StatusWords,
  subcomponents: { StatusWord: StatusWord as React.ComponentType<React.ComponentProps<typeof StatusWord>> },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Inline coloured words on a context line that convey status without tags.',
      },
    },
  },
  argTypes: {
    prefix: { control: 'text' },
    separator: { control: 'text' },
    items: { control: 'object' },
  },
};

export default meta;

export const Neutral: StoryObj<typeof StatusWord> = {
  render: (args) => <StatusWord {...args} />,
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'warning', 'success'],
    },
    icon: { control: 'text' },
    children: { control: 'text' },
  },
  args: {
    tone: 'neutral',
    children: 'Manual',
  },
};

export const Info: StoryObj<typeof StatusWord> = {
  render: (args) => <StatusWord {...args} />,
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'warning', 'success'],
    },
    icon: { control: 'text' },
    children: { control: 'text' },
  },
  args: {
    tone: 'info',
    icon: 'link',
    children: 'Refund',
  },
};

export const Warning: StoryObj<typeof StatusWord> = {
  render: (args) => <StatusWord {...args} />,
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'warning', 'success'],
    },
    icon: { control: 'text' },
    children: { control: 'text' },
  },
  args: {
    tone: 'warning',
    children: 'Unreconciled',
  },
};

export const Success: StoryObj<typeof StatusWord> = {
  render: (args) => <StatusWord {...args} />,
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'info', 'warning', 'success'],
    },
    icon: { control: 'text' },
    children: { control: 'text' },
  },
  args: {
    tone: 'success',
    children: 'Verified',
  },
};

export const ContextLine: StoryObj<typeof StatusWords> = {
  args: {
    prefix: 'HDFC Regalia ••7741',
    items: [
      { tone: 'warning', label: 'Unreconciled' },
      { tone: 'info', label: 'Refund', icon: 'link' },
      { tone: 'neutral', label: 'Gmail' },
    ],
  },
};

export const Concealed: StoryObj<typeof StatusWord> = {
  ...Neutral,
  args: { ...Neutral.args, children: 'Paid ₹1,250' },
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
  parameters: {
    docs: { description: { story: 'While amounts are hidden (ConcealProvider), every ₹ amount reads "₹ —".' } },
  },
};
