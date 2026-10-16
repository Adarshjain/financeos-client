import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Card, ListField } from '@/components/ds';

const meta = {
  title: 'DS/Data display/ListField',
  component: ListField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'A label/value pair for detail sheets.',
      },
    },
  },
  decorators: [
    (Story) => (
      <Card className="max-w-md">
        <Story />
      </Card>
    ),
  ],
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    borderTop: { control: 'boolean' },
  },
  args: {
    label: 'Account',
    value: 'HDFC Regalia ••7741',
    borderTop: false,
  },
} satisfies Meta<typeof ListField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Account',
    value: 'HDFC Regalia ••7741',
  },
};

export const WithTopBorder: Story = {
  args: {
    label: 'Date',
    value: '11 Oct 2026',
    borderTop: true,
  },
};
