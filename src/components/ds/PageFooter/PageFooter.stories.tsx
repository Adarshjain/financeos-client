import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { PageFooter } from '@/components/ds';

const meta: Meta<typeof PageFooter> = {
  title: 'DS/Navigation/PageFooter',
  component: PageFooter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The bottom action bar of a create or edit page: Cancel (ghost) and the primary at the right, the same as a Dialog footer; full width on a phone.',
      },
    },
  },
  args: {
    secondary: { label: 'Cancel', onSelect: fn() },
    primary: { label: 'Create dashboard', onSelect: fn() },
  },
};

export default meta;
type Story = StoryObj<typeof PageFooter>;

export const Default: Story = {};

export const Sticky: Story = { args: { sticky: true } };

export const PrimaryDisabled: Story = {
  args: { primary: { label: 'Save', disabled: true, onSelect: fn() } },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
};

export const StickyPhone: Story = {
  args: { sticky: true },
  globals: { viewport: { value: 'phone', isRotated: false } },
  decorators: [
    (Story) => (
      <div className="px-space-16 h-screen">
        <p>Scroll: the footer stays pinned to the bottom edge, full-bleed over the page padding.</p>
        <Story />
      </div>
    ),
  ],
};
