import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { DateTile } from '../DateTile/DateTile';
import { ListField, ListRow } from './ListRow';

const meta: Meta<typeof ListRow> = {
  title: 'DS/Data display/ListRow',
  component: ListRow,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Primary text / title',
    },
    subtitle: {
      control: 'text',
      description: 'Secondary context text',
    },
    amount: {
      control: 'text',
      description: 'Trailing amount string',
    },
    isCredit: {
      control: 'boolean',
      description: 'Format amount with + and positive tone',
    },
    chevron: {
      control: 'boolean',
      description: 'Show trailing chevron indicator',
    },
    highlighted: {
      control: 'boolean',
      description: '4px brand-strong stripe on brand-tint',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled row state',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ListRow>;

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Badge · action
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            leading={<Badge tone="danger">Missing</Badge>}
            title="SBI Cashback statement"
            subtitle="Expected 8 Oct"
            trailing={<Button size="sm">Upload</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Date tile · amount
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            leading={<DateTile day="15" month="OCT" />}
            title="Amex Platinum bill"
            subtitle="Card bill"
            amount="₹33,900"
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Avatar · credit
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            leading={<Avatar variant="person" initials="RS" />}
            title="Rahul Sharma"
            subtitle="Owes you · expected 28 Oct"
            amount="₹15,000"
            isCredit
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Icon tile · chevron
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            leading={<Avatar variant="account" initials="EMI" className="bg-info-tint text-info" />}
            title="Car loan · EMI #8"
            subtitle="₹17,748 · due 7 Oct"
            chevron
            clickable
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Kebab
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            title="Dining out"
            subtitle="₹5,240 in 90 days · no rules"
            kebab={() => {}}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Highlighted
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            highlighted
            leading={<Badge tone="warning">2 days</Badge>}
            title="Amex Platinum bill"
            subtitle="Opened from a notification"
            trailing={
              <Button size="sm" variant="primary">
                Mark paid
              </Button>
            }
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Label / value (ListField)
        </div>
        <Card className="p-0 overflow-hidden">
          <ListField label="Account" value="HDFC Regalia ••7741" />
          <ListField label="Date" value="11 Oct 2026" />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8 font-text">
          Disabled
        </div>
        <Card className="p-0 overflow-hidden">
          <ListRow
            disabled
            leading={<Avatar variant="person" initials="RM" />}
            title="Rohan Mehta"
            subtitle="Closed 30 Jun 2026"
            trailing={<Button size="sm">Reopen</Button>}
          />
        </Card>
      </div>
    </div>
  ),
};

export const BadgeAction: Story = {
  name: 'Badge · action',
  args: {
    title: 'SBI Cashback statement',
    subtitle: 'Expected 8 Oct',
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<Badge tone="danger">Missing</Badge>}
        trailing={<Button size="sm">Upload</Button>}
      />
    </Card>
  ),
};

export const DateTileAmount: Story = {
  name: 'Date tile · amount',
  args: {
    title: 'Amex Platinum bill',
    subtitle: 'Card bill',
    amount: '₹33,900',
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<DateTile day="15" month="OCT" />}
      />
    </Card>
  ),
};

export const AvatarCredit: Story = {
  name: 'Avatar · credit',
  args: {
    title: 'Rahul Sharma',
    subtitle: 'Owes you · expected 28 Oct',
    amount: '₹15,000',
    isCredit: true,
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<Avatar variant="person" initials="RS" />}
      />
    </Card>
  ),
};

export const IconTileChevron: Story = {
  name: 'Icon tile · chevron',
  args: {
    title: 'Car loan · EMI #8',
    subtitle: '₹17,748 · due 7 Oct',
    chevron: true,
    clickable: true,
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<Avatar variant="account" initials="EMI" className="bg-info-tint text-info" />}
      />
    </Card>
  ),
};

export const Kebab: Story = {
  name: 'Kebab',
  args: {
    title: 'Dining out',
    subtitle: '₹5,240 in 90 days · no rules',
    kebab: () => {},
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow {...args} />
    </Card>
  ),
};

export const Highlighted: Story = {
  name: 'Highlighted',
  args: {
    highlighted: true,
    title: 'Amex Platinum bill',
    subtitle: 'Opened from a notification',
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<Badge tone="warning">2 days</Badge>}
        trailing={
          <Button size="sm" variant="primary">
            Mark paid
          </Button>
        }
      />
    </Card>
  ),
};

export const LabelValue: Story = {
  name: 'Label / value',
  render: () => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListField label="Account" value="HDFC Regalia ••7741" />
      <ListField label="Date" value="11 Oct 2026" />
      <ListField label="Available" value={<b className="font-bold">₹12,500</b>} />
    </Card>
  ),
};

export const Disabled: Story = {
  name: 'Disabled',
  args: {
    disabled: true,
    title: 'Rohan Mehta',
    subtitle: 'Closed 30 Jun 2026',
  },
  render: (args) => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow
        {...args}
        leading={<Avatar variant="person" initials="RM" />}
        trailing={<Button size="sm">Reopen</Button>}
      />
    </Card>
  ),
};

export const AsChild: Story = {
  name: 'AsChild (link)',
  render: () => (
    <Card className="max-w-md p-0 overflow-hidden">
      <ListRow asChild title="Sign in" subtitle="/ds/login" chevron>
        <a href="/ds/login" />
      </ListRow>
      <ListRow asChild title="Sign up" subtitle="/ds/signup" chevron>
        <a href="/ds/signup" />
      </ListRow>
    </Card>
  ),
};
