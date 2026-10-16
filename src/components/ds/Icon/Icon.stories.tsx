import type { Meta, StoryObj } from '@storybook/react';

import { Icon, iconRegistry } from '@/components/ds';

const meta: Meta<typeof Icon> = {
  title: 'DS/Foundations/Icons',
  component: Icon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The one way to draw an icon in the new system: a Phosphor icon in the bold weight, picked by its name from the icon registry, at a token size, in currentColor.\n\nSizes: sm (14px) for chips/carets, md (16px) for buttons/bars/rows, lg (20px) for tab bar/rail/selection bar.',
      },
    },
  },
  args: {
    name: 'chevron-down',
    size: 'md',
  },
  argTypes: {
    name: {
      control: 'select',
      options: Object.keys(iconRegistry),
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Playground: Story = {
  args: {
    name: 'chevron-down',
    size: 'md',
  },
};
