import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'DS/Data display/Avatar',
  component: Avatar,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['account', 'person', 'logo'],
      description: 'The identity mark shape and fill: account (rounded square), person (circle), logo (brand square)',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size scale: sm (24px), md (32px), lg (44px)',
    },
    initials: {
      control: 'text',
      description: 'Initials fallback text',
    },
    src: {
      control: 'text',
      description: 'Image URL for logo or person',
    },
    alt: {
      control: 'text',
      description: 'Image alt text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <div>
        <h3 className="font-text text-overline uppercase text-ink-4 mb-space-8">
          Account (sm, md, lg)
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <Avatar variant="account" size="sm">HD</Avatar>
          <Avatar variant="account" size="md">HD</Avatar>
          <Avatar variant="account" size="lg">HD</Avatar>
        </div>
      </div>

      <div>
        <h3 className="font-text text-overline uppercase text-ink-4 mb-space-8">
          Person (sm, md, lg)
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <Avatar variant="person" size="sm">PN</Avatar>
          <Avatar variant="person" size="md">PN</Avatar>
          <Avatar variant="person" size="lg">PN</Avatar>
        </div>
      </div>

      <div>
        <h3 className="font-text text-overline uppercase text-ink-4 mb-space-8">
          Logo (sm, md, lg fallback to brand initials)
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <Avatar variant="logo" size="sm">HD</Avatar>
          <Avatar variant="logo" size="md">HD</Avatar>
          <Avatar variant="logo" size="lg">HD</Avatar>
        </div>
      </div>

      <div>
        <h3 className="font-text text-overline uppercase text-ink-4 mb-space-8">
          With Image (logo & person)
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <Avatar
            variant="person"
            size="md"
            initials="AM"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80"
            alt="Arjun Mehta"
          />
          <Avatar
            variant="person"
            size="lg"
            initials="AM"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80"
            alt="Arjun Mehta"
          />
        </div>
      </div>
    </div>
  ),
};

export const Account: Story = {
  name: 'Account',
  args: {
    variant: 'account',
    initials: 'HD',
    size: 'md',
  },
};

export const Person: Story = {
  name: 'Person',
  args: {
    variant: 'person',
    initials: 'PN',
    size: 'md',
  },
};

export const Logo: Story = {
  name: 'Logo',
  args: {
    variant: 'logo',
    initials: 'HD',
    size: 'md',
  },
};

export const Small: Story = {
  name: 'Small',
  args: {
    variant: 'account',
    initials: 'HD',
    size: 'sm',
  },
};

export const Large: Story = {
  name: 'Large',
  args: {
    variant: 'person',
    initials: 'PN',
    size: 'lg',
  },
};

export const WithImage: Story = {
  name: 'WithImage',
  args: {
    variant: 'person',
    size: 'md',
    initials: 'AM',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
    alt: 'Arjun Mehta',
  },
};
