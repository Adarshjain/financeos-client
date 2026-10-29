import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { PromptField } from '@/components/ds';

const meta: Meta<typeof PromptField> = {
  title: 'DS/Form fields/PromptField',
  component: PromptField,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The composer of a conversation: an auto-growing text area and a round send button that becomes stop while an answer runs.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: 'text' },
    placeholder: { control: 'text' },
    hint: { control: 'text' },
    sendLabel: { control: 'text' },
    stopLabel: { control: 'text' },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    onValueChange: fn(),
    onSubmit: fn(),
    onStop: fn(),
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <PromptField
        {...args}
        value={value ?? args.defaultValue ?? ''}
        onValueChange={(v) => {
          args.onValueChange?.(v);
          updateArgs({ value: v });
        }}
        onSubmit={(v) => {
          args.onSubmit?.(v);
          updateArgs({ value: '' });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof PromptField>;

export const Default: Story = {
  args: { hint: 'Enter to send, Shift+Enter for a new line' },
};

export const Filled: Story = {
  args: {
    defaultValue: 'What did I spend on food last month?',
    hint: 'Enter to send, Shift+Enter for a new line',
  },
};

export const MultiLine: Story = {
  args: {
    defaultValue: 'Line one\nLine two\nLine three\nLine four\nLine five',
    hint: 'Enter to send, Shift+Enter for a new line',
  },
};

export const Busy: Story = {
  args: { loading: true, defaultValue: 'What did I spend on food last month?', hint: 'Answering…' },
};

export const Disabled: Story = {
  args: { disabled: true, hint: 'Unavailable right now' },
};
