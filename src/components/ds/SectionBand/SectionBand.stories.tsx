import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { TextField } from '../TextField/TextField';
import { SectionBand } from './SectionBand';

const meta: Meta<typeof SectionBand> = {
  title: 'DS/Data display/SectionBand',
  component: SectionBand,
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'Basics',
  },
};

export default meta;
type Story = StoryObj<typeof SectionBand>;

export const DefaultBand: Story = {
  name: 'Default band',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <SectionBand title="Basics" borderTop={false} />
      <div className="p-space-16 flex flex-col gap-space-12">
        <TextField
          label="Account name"
          defaultValue="HDFC Regalia Gold"
        />
      </div>
      <SectionBand title="Card details" />
      <div className="p-space-16">
        <TextField label="Last 4 digits" defaultValue="7741" />
      </div>
    </Card>
  ),
};

export const DangerBand: Story = {
  name: 'Danger band',
  render: () => (
    <Card className="max-w-md p-space-0 overflow-hidden">
      <SectionBand
        variant="danger"
        title="Delete account"
        borderTop={false}
      />
      <div className="p-space-16 flex items-center justify-between gap-space-12">
        <div className="text-caption text-ink-3 flex-1">
          Removes this card with its 142 transactions.
        </div>
        <Button size="sm" variant="danger">
          Delete
        </Button>
      </div>
    </Card>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="flex flex-col gap-space-24 max-w-md">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Default band
        </div>
        <Card className="p-space-0 overflow-hidden">
          <SectionBand title="Basics" borderTop={false} />
          <div className="p-space-16 flex flex-col gap-space-12">
            <TextField
              label="Account name"
              defaultValue="HDFC Regalia Gold"
            />
          </div>
          <SectionBand title="Card details" />
          <div className="p-space-16">
            <TextField label="Last 4 digits" defaultValue="7741" />
          </div>
        </Card>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Danger band
        </div>
        <Card className="p-space-0 overflow-hidden">
          <SectionBand
            variant="danger"
            title="Delete account"
            borderTop={false}
          />
          <div className="p-space-16 flex items-center justify-between gap-space-12">
            <div className="text-caption text-ink-3 flex-1">
              Removes this card with its 142 transactions.
            </div>
            <Button size="sm" variant="danger">
              Delete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  ),
};
