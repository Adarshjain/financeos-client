import type { Meta, StoryObj } from '@storybook/react';

import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'DS/Inputs/TextArea',
  component: TextArea,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
    helper: { control: 'text' },
    error: { control: 'text' },
    optional: { control: 'boolean' },
    disabled: { control: 'boolean' },
    rows: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof TextArea>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <TextArea
        label="Note"
        placeholder="Add a note or description…"
      />
      <TextArea
        label="Note"
        defaultValue={'Split with Priya.\nShe owes half by Friday.\nSettle on UPI.'}
      />
      <TextArea
        label="Description"
        optional
        defaultValue="Quarterly tax reconciliation and GST filing notes for October."
        helper="Visible on shared reports and export sheets."
      />
      <TextArea
        label="Note"
        defaultValue="Too long text note"
        error="Note cannot exceed 500 characters."
      />
      <TextArea
        label="System notes"
        defaultValue="Auto-generated note by statement parser."
        disabled
      />
    </div>
  ),
};

export const Default: Story = {
  args: {
    label: 'Note',
    placeholder: 'Add a note…',
  },
};

export const Filled: Story = {
  args: {
    label: 'Note',
    defaultValue: 'Split with Priya, she owes half',
  },
};

export const GrownToThreeLines: Story = {
  name: 'Grown to three lines',
  args: {
    label: 'Note',
    defaultValue: 'Split with Priya.\nShe owes half by Friday.\nSettle on UPI.',
  },
};

export const WithHelper: Story = {
  args: {
    label: 'Description',
    optional: true,
    defaultValue: 'Quarterly tax reconciliation and GST filing notes for October.',
    helper: 'Visible on shared reports and export sheets.',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Note',
    defaultValue: 'Split with Priya, she owes half',
    error: 'Note cannot exceed 500 characters.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'System notes',
    defaultValue: 'Auto-generated note by statement parser.',
    disabled: true,
  },
};
