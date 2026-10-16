import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from '@/components/ds';

const sampleImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%232563eb"/><circle cx="32" cy="24" r="12" fill="%2393c5fd"/><path d="M16 54 C16 42 24 38 32 38 C40 38 48 42 48 54 Z" fill="%2393c5fd"/></svg>';

const meta: Meta<typeof Avatar> = {
  title: 'DS/Data display/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Identity marks: rounded initials for accounts, circles for people, the bank\'s own logo for institutions.',
      },
    },
  },
  args: {
    initials: 'JD',
    size: 'md',
    variant: 'rounded',
    tone: 'neutral',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['rounded', 'circle', 'square'],
    },
    tone: {
      control: 'select',
      options: ['neutral', 'brand', 'inverse'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    initials: {
      control: 'text',
    },
    src: {
      control: 'text',
    },
    alt: {
      control: 'text',
    },
    imgProps: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    initials: 'HD',
    variant: 'rounded',
    tone: 'neutral',
  },
};

export const Person: Story = {
  args: {
    initials: 'PN',
    variant: 'circle',
    tone: 'brand',
  },
};

export const SquareInverse: Story = {
  args: {
    initials: 'SB',
    variant: 'square',
    tone: 'inverse',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    initials: 'HD',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    initials: 'HD',
  },
};

export const WithImage: Story = {
  args: {
    src: sampleImage,
    initials: 'JD',
    alt: 'User profile image',
  },
};
