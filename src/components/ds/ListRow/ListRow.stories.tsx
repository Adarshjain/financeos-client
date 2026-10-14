import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Avatar } from '../Avatar/Avatar';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import {
  ListField,
  ListRow,
  ListRowDateTile,
  ListRowIconTile,
} from './ListRow';

const meta: Meta<typeof ListRow> = {
  title: 'DS/Data display/ListRow',
  component: ListRow,
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'Amex Platinum bill',
    subtitle: 'Card bill',
  },
};

export default meta;
type Story = StoryObj<typeof ListRow>;

export const BadgeAction: Story = {
  name: 'Badge · action',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        leading={<Badge variant="rose">Missing</Badge>}
        title="SBI Cashback statement"
        subtitle="Expected 8 Oct"
        trailing={<Button size="sm">Upload</Button>}
      />
    </Card>
  ),
};

export const DateTileAmount: Story = {
  name: 'Date tile · amount',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        leading={<ListRowDateTile day="15" month="OCT" />}
        title="Amex Platinum bill"
        subtitle="Card bill"
        amount="₹33,900"
      />
    </Card>
  ),
};

export const AvatarCredit: Story = {
  name: 'Avatar · credit',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        leading={<Avatar variant="person" initials="RS" />}
        title="Rahul Sharma"
        subtitle="Owes you · expected 28 Oct"
        amount="₹15,000"
        isCredit
      />
    </Card>
  ),
};

export const IconTileChevron: Story = {
  name: 'Icon tile · chevron',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        leading={<ListRowIconTile tone="info">EMI</ListRowIconTile>}
        title="Car loan · EMI #8"
        subtitle="₹17,748 · due 7 Oct"
        chevron
        clickable
      />
    </Card>
  ),
};

export const Kebab: Story = {
  name: 'Kebab',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        title="Dining out"
        subtitle="₹5,240 in 90 days · no rules"
        kebab={() => alert('Options')}
      />
    </Card>
  ),
};

export const Highlighted: Story = {
  name: 'Highlighted',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        highlighted
        leading={<Badge variant="amber">2 days</Badge>}
        title="Amex Platinum bill"
        subtitle="Opened from a notification"
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
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListField label="Account" value="HDFC Regalia ••7741" />
      <ListField label="Date" value="11 Oct 2026" />
      <ListField label="Available" value={<b className="font-bold">₹12,500</b>} />
    </Card>
  ),
};

export const Disabled: Story = {
  name: 'Disabled',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <ListRow
        disabled
        leading={<Avatar variant="person" initials="RM" />}
        title="Rohan Mehta"
        subtitle="Closed 30 Jun 2026"
        trailing={<Button size="sm">Reopen</Button>}
      />
    </Card>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-16 max-w-4xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Badge · action
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListRow
            leading={<Badge variant="rose">Missing</Badge>}
            title="SBI Cashback statement"
            subtitle="Expected 8 Oct"
            trailing={<Button size="sm">Upload</Button>}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Date tile · amount
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListRow
            leading={<ListRowDateTile day="15" month="OCT" />}
            title="Amex Platinum bill"
            subtitle="Card bill"
            amount="₹33,900"
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Avatar · credit
        </div>
        <Card className="p-space-0 overflow-hidden">
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
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Icon tile · chevron
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListRow
            leading={<ListRowIconTile tone="info">EMI</ListRowIconTile>}
            title="Car loan · EMI #8"
            subtitle="₹17,748 · due 7 Oct"
            chevron
            clickable
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Kebab
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListRow
            title="Dining out"
            subtitle="₹5,240 in 90 days · no rules"
            kebab={() => {}}
          />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Highlighted
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListRow
            highlighted
            leading={<Badge variant="amber">2 days</Badge>}
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
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Label / value
        </div>
        <Card className="p-space-0 overflow-hidden">
          <ListField label="Account" value="HDFC Regalia ••7741" />
          <ListField label="Date" value="11 Oct 2026" />
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Disabled
        </div>
        <Card className="p-space-0 overflow-hidden">
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
