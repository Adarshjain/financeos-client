import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { SectionHeader } from './SectionHeader';

const meta: Meta<typeof SectionHeader> = {
  title: 'DS/Data display/SectionHeader',
  component: SectionHeader,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['date', 'band', 'month', 'danger'],
      description: 'Section header variant',
    },
    label: {
      control: 'text',
      description: 'Primary label text',
    },
    meta: {
      control: 'text',
      description: 'Secondary meta text (weekday or summary)',
    },
    sticky: {
      control: 'boolean',
      description: 'Sticky positioning (for date variant)',
    },
  },
  args: {
    variant: 'date',
    label: '12 Oct',
    meta: 'Mon',
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-20 max-w-sm">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Date (sticky phone list header)
        </div>
        <SectionHeader variant="date" label="12 Oct" meta="Mon" />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Band (form section in card/sheet)
        </div>
        <SectionHeader variant="band" label="Basics" />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Month (desktop list band)
        </div>
        <SectionHeader
          variant="month"
          label="September 2026"
          meta="61 transactions · out ₹1,05,219"
        />
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Danger band (edit sheet deletion)
        </div>
        <SectionHeader variant="danger" label="Delete account" />
      </div>
    </div>
  ),
};

export const DateVariant: Story = {
  name: 'Date',
  args: {
    variant: 'date',
    label: '12 Oct',
    meta: 'Mon',
    sticky: true,
  },
};

export const Band: Story = {
  name: 'Band',
  args: {
    variant: 'band',
    label: 'Basics',
    meta: '',
  },
};

export const Month: Story = {
  name: 'Month',
  args: {
    variant: 'month',
    label: 'September 2026',
    meta: '61 transactions · out ₹1,05,219',
  },
};

export const Danger: Story = {
  name: 'Danger band',
  args: {
    variant: 'danger',
    label: 'Delete account',
    meta: '',
  },
};
