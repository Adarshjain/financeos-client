import type { Meta, StoryObj } from '@storybook/react';

import { Divider } from '@/components/ds';

const meta: Meta<typeof Divider> = {
  title: 'DS/Data display/Divider',
  component: Divider,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A 1px line rule, optionally with a short centred label in ink-4 caption ("or" between Continue with Google and the email form).',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm w-full">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    label: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Plain: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    label: 'or',
  },
};
