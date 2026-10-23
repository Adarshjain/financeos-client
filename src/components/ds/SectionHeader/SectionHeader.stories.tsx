import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button, ConcealProvider, SectionHeader } from '@/components/ds';

const meta: Meta<typeof SectionHeader> = {
  title: 'DS/Data display/SectionHeader',
  component: SectionHeader,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    as: {
      control: 'select',
      options: ['div', 'h2', 'h3'],
      description: 'Root HTML element',
    },
    variant: {
      control: 'select',
      options: ['strong', 'band'],
      description: 'Section header variant',
    },
    tone: {
      control: 'select',
      options: ['neutral', 'danger'],
      description: 'Semantic tone',
    },
    children: {
      control: 'text',
      description: 'Primary label text',
    },
    meta: {
      control: 'text',
      description: 'Secondary meta text',
    },
    sticky: {
      control: 'boolean',
      description: 'Sticky positioning',
    },
    borderTop: {
      control: 'boolean',
      description: 'Border-top toggle',
    },
  },
  args: {
    variant: 'strong',
    children: '12 Oct',
    meta: 'Mon',
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Strong: Story = {
  args: {
    variant: 'strong',
    children: '12 Oct',
    meta: 'Mon',
    sticky: true,
  },
};

export const Band: Story = {
  args: {
    variant: 'band',
    children: 'Basics',
    meta: '',
  },
};

export const BandDanger: Story = {
  name: 'Band danger',
  args: {
    variant: 'band',
    tone: 'danger',
    children: 'Delete account',
    meta: '',
  },
};

export const WithMeta: Story = {
  name: 'With meta',
  args: {
    variant: 'band',
    children: 'September 2026',
    meta: '61 transactions · out ₹1,05,219',
  },
};

export const WithAction: Story = {
  name: 'With action',
  args: {
    variant: 'band',
    children: '2 closed accounts',
    action: (
      <Button variant="link" size="sm">
        Show
      </Button>
    ),
  },
};

export const Concealed: Story = {
  ...Strong,
  args: { ...Strong.args, children: 'Total ₹12,000' },
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
