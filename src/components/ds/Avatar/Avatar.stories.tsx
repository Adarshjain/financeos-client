import type { Meta, StoryObj } from '@storybook/react';

import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'DS/Data display/Avatar',
  component: Avatar,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Account: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Avatar variant="account">HD</Avatar>
      <Avatar variant="account">AX</Avatar>
      <Avatar variant="account">IC</Avatar>
      <Avatar variant="account">SB</Avatar>
    </div>
  ),
};

export const Person: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Avatar variant="person">PN</Avatar>
      <Avatar variant="person">RS</Avatar>
      <Avatar variant="person">AM</Avatar>
    </div>
  ),
};

export const Logo: Story = {
  render: () => (
    <div className="flex items-center gap-space-8">
      <Avatar variant="logo">HD</Avatar>
      <Avatar variant="logo">AX</Avatar>
      <Avatar variant="logo">SB</Avatar>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-space-16">
      <div className="flex items-center gap-space-8">
        <Avatar size="sm" variant="account">
          HD
        </Avatar>
        <Avatar size="md" variant="account">
          HD
        </Avatar>
        <Avatar size="xl" variant="account">
          HD
        </Avatar>
      </div>
      <div className="flex items-center gap-space-8">
        <Avatar size="sm" variant="person">
          AM
        </Avatar>
        <Avatar size="md" variant="person">
          AM
        </Avatar>
        <Avatar size="xl" variant="person">
          AM
        </Avatar>
      </div>
    </div>
  ),
};

export const WithImage: Story = {
  args: {
    variant: 'person',
    initials: 'AM',
    src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80',
    alt: 'Arjun Mehta',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-space-24 max-w-lg font-text">
      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          Identity marks
        </h3>
        <div className="flex items-center gap-space-8 p-space-12 rounded-ds-lg border border-line bg-surface">
          <Avatar variant="account">HD</Avatar>
          <Avatar variant="account">AX</Avatar>
          <Avatar variant="person">PN</Avatar>
          <Avatar variant="person">RS</Avatar>
          <Avatar variant="logo">HD</Avatar>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          In profile context (44px)
        </h3>
        <div className="flex items-center gap-space-12 p-space-14 rounded-ds-lg border border-line bg-surface">
          <Avatar size="xl" variant="person">
            AM
          </Avatar>
          <div>
            <div className="text-heading text-ink">Arjun Mehta</div>
            <div className="text-caption text-ink-3">
              arjun.mehta@example.test · signed in with Google
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-overline uppercase text-ink-4 mb-space-8">
          In account row context (32px)
        </h3>
        <div className="flex items-center gap-space-12 p-space-14 rounded-ds-lg border border-line bg-surface">
          <Avatar size="md" variant="account">
            HD
          </Avatar>
          <div>
            <div className="text-body-strong text-ink">HDFC Regalia</div>
            <div className="text-caption text-ink-3">••7741 · Credit card</div>
          </div>
          <div className="ml-auto text-body-strong text-ink">₹1,249.00</div>
        </div>
      </div>
    </div>
  ),
};
