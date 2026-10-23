import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { Keypad, Text } from '@/components/ds';

const operators = [
  { value: '÷' },
  { value: '×' },
  { value: '-', label: '−' },
  { value: '+' },
];

const meta: Meta<typeof Keypad> = {
  title: 'DS/Form fields/Keypad',
  component: Keypad,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A number pad that builds text: digits, a decimal point, backspace and optional operator keys. The page decides what the text means; here it is shown above the pad.',
      },
    },
  },
  args: {
    value: '1,250',
    onValueChange: fn(),
    backspaceLabel: 'Backspace',
  },
  argTypes: {
    value: { control: 'text' },
    defaultValue: { control: false },
    operators: { control: 'object' },
    backspaceLabel: { control: 'text' },
  },
  render: function Render(args) {
    const [{ value }, updateArgs] = useArgs();
    return (
      <div className="flex w-full max-w-container-sm flex-col gap-space-12">
        <Text variant="figure" align="end">
          {value || '0'}
        </Text>
        <Keypad
          {...args}
          value={value}
          onValueChange={(next) => {
            args.onValueChange?.(next);
            updateArgs({ value: next });
          }}
        />
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof Keypad>;

export const Digits: Story = { args: { value: '' } };

export const WithOperators: Story = { args: { value: '120+80', operators } };
