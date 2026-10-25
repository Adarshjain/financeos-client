import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Button, Card, Icon, ReorderList } from '@/components/ds';

const models = [
  { id: 'gemini-flash', title: 'Gemini 3.8 Flash', subtitle: 'Google' },
  { id: 'claude-haiku', title: 'claude-haiku-5.5', subtitle: 'Anthropic' },
  { id: 'gpt-mini', title: 'gpt-5-mini', subtitle: 'OpenAI · Not configured' },
];

const rules = [
  { id: 'dining', title: '5X on dining' },
  { id: 'travel', title: '3X on travel' },
  { id: 'fuel', title: '2X on fuel' },
  { id: 'grocery', title: '2X on groceries' },
  { id: 'online', title: '1.5X on online shopping' },
  { id: 'utilities', title: '1X on utilities' },
  { id: 'rent', title: '0X on rent' },
  { id: 'base', title: 'Base 1X' },
];

const meta = {
  title: 'DS/Data display/ReorderList',
  component: ReorderList,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Card className="max-w-md">
        <Story />
      </Card>
    ),
  ],
  args: {
    items: models,
    value: models.map((m) => m.id),
    onValueChange: fn(),
  },
  argTypes: {
    items: { control: 'object' },
    value: { control: 'object' },
    defaultValue: { control: false },
    onValueChange: { control: false },
    labels: { control: 'object' },
    size: { control: 'select', options: ['md', 'sm'] },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <ReorderList
        {...args}
        onValueChange={(ids) => {
          args.onValueChange?.(ids);
          updateArgs({ value: ids });
        }}
      />
    );
  },
} satisfies Meta<typeof ReorderList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTrailingAction: Story = {
  args: {
    items: models.map((m) => ({
      ...m,
      ariaLabel: m.title,
      trailing: (
        <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${m.title}`}>
          <Icon name="close" size="sm" />
        </Button>
      ),
    })),
  },
};

export const LongList: Story = {
  args: { items: rules, value: rules.map((r) => r.id) },
};

export const Compact: Story = {
  args: { size: 'sm', items: rules, value: rules.map((r) => r.id) },
};
