import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Avatar, FilterChip, Icon, Select, type SelectOption } from '@/components/ds';

const standardOptions: SelectOption[] = [
  { value: 'option-a', label: 'Option A', hint: 'Hint A' },
  { value: 'option-b', label: 'Option B', hint: 'Hint B' },
  { value: 'option-c', label: 'Option C', hint: 'Hint C' },
  { value: 'option-d', label: 'Option D', hint: 'Hint D' },
];

const iconOptions: SelectOption[] = [
  {
    value: 'item-1',
    label: 'Item 1',
    icon: (
      <Avatar variant="square" size="sm">
        A1
      </Avatar>
    ),
  },
  {
    value: 'item-2',
    label: 'Item 2',
    icon: (
      <Avatar variant="square" size="sm">
        A2
      </Avatar>
    ),
  },
  {
    value: 'item-3',
    label: 'Item 3',
    icon: (
      <Avatar variant="square" size="sm">
        A3
      </Avatar>
    ),
  },
];

const descriptionOptions: SelectOption[] = [
  {
    value: 'plan-basic',
    label: 'Basic Plan',
    description: 'Up to 5 team members',
  },
  {
    value: 'plan-pro',
    label: 'Pro Plan',
    description: 'Unlimited team members and storage',
  },
  {
    value: 'plan-enterprise',
    label: 'Enterprise Plan',
    description: 'Dedicated support and custom SLAs',
  },
];

const disabledOptions: SelectOption[] = [
  { value: 'active-1', label: 'Enabled Option 1' },
  { value: 'active-2', label: 'Enabled Option 2' },
  {
    value: 'disabled-1',
    label: 'Disabled Option',
    disabled: true,
    disabledReason: 'Unavailable',
  },
];

const sectionedGroups = [
  {
    name: 'Group 1',
    options: [
      { value: 'g1-1', label: 'Option 1.1', hint: 'Detail' },
      { value: 'g1-2', label: 'Option 1.2', hint: 'Detail' },
    ],
  },
  {
    name: 'Group 2',
    options: [
      { value: 'g2-1', label: 'Option 2.1' },
      { value: 'g2-2', label: 'Option 2.2', hint: 'Detail' },
    ],
  },
  {
    name: 'Group 3',
    options: [{ value: 'g3-1', label: 'Option 3.1' }],
  },
];

const meta: Meta<typeof Select> = {
  title: 'DS/Form fields/Select',
  component: Select,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The dropdown for choosing values. Single-choice fields are always a Select, never tiles or chip groups; multi-choice fields are a multi-select with the picks as chips inside the field.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  args: {
    placeholder: 'Select an option…',
    onValueChange: fn(),
    onSearchChange: fn(),
    onCreate: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    placeholder: { control: 'text' },
    label: { control: 'text' },
    error: { control: 'text' },
    helper: { control: 'text' },
    disabled: { control: 'boolean' },
    multiple: { control: 'boolean' },
    searchable: { control: 'boolean' },
    loading: { control: 'boolean' },
    loadingText: { control: 'text' },
    showRadio: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    defaultOpen: { control: 'boolean' },
    open: { control: 'boolean' },
    options: { table: { disable: true } },
    groups: { table: { disable: true } },
    icon: { table: { disable: true } },
    trigger: { control: false, table: { disable: true } },
    action: { table: { disable: true } },
    emptyText: { table: { disable: true } },
    createLabel: { table: { disable: true } },
    clearLabel: { table: { disable: true } },
    doneLabel: { table: { disable: true } },
    discardLabel: { control: 'text' },
    filter: { table: { disable: true } },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <Select
        {...args}
        value={value ?? args.defaultValue}
        onValueChange={(val) => {
          updateArgs({ value: val });
          args.onValueChange?.(val);
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    label: 'Standard Select',
    options: standardOptions,
    defaultValue: 'option-a',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    options: [
      { value: 'purchase', label: 'Purchase' },
      { value: 'refund', label: 'Refund' },
    ],
    defaultValue: 'purchase',
  },
};

export const SingleWithSearchAndIcons: Story = {
  args: {
    label: 'With search and icons',
    searchable: true,
    options: iconOptions,
    defaultValue: 'item-1',
  },
};

export const MultiSelect: Story = {
  args: {
    label: 'Multiple selection',
    multiple: true,
    options: standardOptions,
    defaultValue: ['option-a', 'option-b'],
  },
};

/** Chips fill one line of the field, the rest collapse into +n; Discard & close restores the value from when it opened. */
export const MultiSelectOverflow: Story = {
  args: {
    label: 'Many selected',
    multiple: true,
    options: standardOptions,
    defaultValue: standardOptions.map((o) => o.value),
  },
};

export const DisabledMultiSelect: Story = {
  args: {
    label: 'Unavailable multiple selection',
    multiple: true,
    disabled: true,
    options: standardOptions,
    defaultValue: ['option-a', 'option-b'],
  },
};

/** Account identifiers: type one and press Enter (or pick the create row) to add and select it. */
export const MultiWithSearchAndCreate: Story = {
  args: {
    label: 'Identifiers',
    helper: 'Card or account numbers the statements and alerts use',
    placeholder: 'Add an identifier',
    searchPlaceholder: 'Type an identifier',
    multiple: true,
    searchable: true,
    options: [
      { value: 'XXXX4521', label: 'XXXX4521' },
      { value: 'HDFC0001234', label: 'HDFC0001234' },
    ],
    value: ['XXXX4521', 'HDFC0001234'],
  },
  render: function Render(args) {
    const [{ value, options }, updateArgs] = useArgs<typeof args>();
    const picked = (value as string[] | undefined) ?? [];
    return (
      <Select
        {...args}
        options={options}
        value={picked}
        onValueChange={(val) => {
          updateArgs({ value: val });
          args.onValueChange?.(val);
        }}
        onCreate={(query) => {
          updateArgs({ options: [...(options ?? []), { value: query, label: query }], value: [...picked, query] });
          args.onCreate?.(query);
        }}
      />
    );
  },
};

export const SectionedList: Story = {
  args: {
    label: 'Sectioned options',
    groups: sectionedGroups,
    defaultOpen: true,
  },
};

export const WithAction: Story = {
  args: {
    label: 'Select with pinned action',
    options: standardOptions,
    defaultOpen: true,
    action: {
      label: '+ New custom option…',
      onSelect: fn(),
    },
  },
};

export const SearchCreateFromTyping: Story = {
  args: {
    label: 'Create from typed query',
    searchable: true,
    defaultOpen: true,
    searchValue: 'New Item',
    options: standardOptions,
    onCreate: fn(),
  },
};

export const NoResults: Story = {
  args: {
    label: 'No results state',
    searchable: true,
    defaultOpen: true,
    searchValue: 'zzz',
    options: standardOptions,
  },
};

export const WithDescriptions: Story = {
  args: {
    label: 'Options with descriptions',
    options: descriptionOptions,
    defaultOpen: true,
    defaultValue: 'plan-pro',
  },
};

export const DisabledOption: Story = {
  args: {
    label: 'Includes disabled options',
    options: disabledOptions,
    defaultOpen: true,
  },
};

export const CustomTrigger: Story = {
  args: {
    options: standardOptions,
    defaultValue: 'option-a',
    trigger: <FilterChip selected hasDropdown>Filter Option</FilterChip>,
  },
};

export const PlaceholderState: Story = {
  args: {
    label: 'Unset value',
    placeholder: 'Choose an option…',
    options: standardOptions,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Required selection',
    error: 'Please make a selection to proceed',
    options: standardOptions,
  },
};

export const DisabledState: Story = {
  args: {
    label: 'Unavailable selection',
    disabled: true,
    options: standardOptions,
    defaultValue: 'option-a',
  },
};

export const LoadingState: Story = {
  args: {
    label: 'Fetching options',
    loading: true,
    loadingText: 'Loading items…',
    options: standardOptions,
  },
};
