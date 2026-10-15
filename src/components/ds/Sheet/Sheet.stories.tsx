import type { Meta, StoryObj } from '@storybook/react';
import { Search } from 'lucide-react';
import React from 'react';

import { Button } from '../Button/Button';
import { ListField } from '../ListRow/ListRow';
import { TextField } from '../TextField/TextField';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetShell,
  SheetTrigger,
} from './Sheet';

const meta: Meta<typeof SheetShell> = {
  title: 'DS/Overlays/Sheet',
  component: SheetShell,
  parameters: {
    layout: 'padded',
  },
  args: {
    title: 'Set statement details',
    subtitle: 'HDFC Regalia · 5 Oct',
  },
};

export default meta;
type Story = StoryObj<typeof SheetShell>;

export const FormSheet: Story = {
  name: 'Form',
  render: () => (
    <div className="max-w-sm">
      <SheetShell
        title="Set statement details"
        subtitle="HDFC Regalia · 5 Oct"
      >
        <SheetBody>
          <TextField label="Total due" defaultValue="₹ 44,319.00" />
          <TextField label="Due date" defaultValue="25/10/2026" />
        </SheetBody>
        <SheetFooter>
          <Button size="phone" variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button size="phone" variant="primary" className="flex-1">
            Save
          </Button>
        </SheetFooter>
      </SheetShell>
    </div>
  ),
};

export const DetailSheet: Story = {
  name: 'Detail',
  render: () => (
    <div className="max-w-sm">
      <SheetShell
        title="Swiggy Bangalore"
        subtitle="₹1,249.00 · 11 Oct"
      >
        <SheetBody>
          <div className="flex gap-space-6 flex-wrap pb-space-8 border-b border-line-soft">
            <Button size="sm" variant="secondary">
              Edit
            </Button>
            <Button size="sm" variant="secondary">
              Link to…
            </Button>
            <Button size="sm" variant="secondary">
              ✓ Review
            </Button>
            <Button size="sm" variant="danger">
              Delete
            </Button>
          </div>
          <ListField label="Account" value="HDFC Regalia ••7741" borderTop={false} />
          <ListField label="Category" value="Food & dining" />
        </SheetBody>
        <SheetFooter>
          <Button size="phone" variant="secondary" className="flex-1">
            Close
          </Button>
        </SheetFooter>
      </SheetShell>
    </div>
  ),
};

export const PickerSheet: Story = {
  name: 'Picker',
  render: () => (
    <div className="max-w-sm">
      <SheetShell title="Bank">
        <SheetBody>
          <div className="flex items-center gap-space-8 px-space-12 py-space-8 rounded-ds-md border border-line-soft text-body text-ink-3">
            <Search className="w-space-14 h-space-14 text-ink-4 shrink-0" />
            <span>Search banks</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center justify-between py-space-10 border-b border-line-soft text-body font-bold text-ink">
              <div className="flex items-center gap-space-8">
                <span className="w-space-24 h-space-24 rounded-ds-xs bg-brand text-on-brand flex items-center justify-center text-caption font-bold">
                  HD
                </span>
                <span>HDFC Bank</span>
              </div>
              <span className="text-brand-strong">✓</span>
            </div>
            <div className="flex items-center justify-between py-space-10 text-body font-bold text-ink">
              <div className="flex items-center gap-space-8">
                <span className="w-space-24 h-space-24 rounded-ds-xs bg-danger-tint text-danger flex items-center justify-center text-caption font-bold">
                  IC
                </span>
                <span>ICICI Bank</span>
              </div>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button size="phone" variant="secondary" className="flex-1">
            Cancel
          </Button>
        </SheetFooter>
      </SheetShell>
    </div>
  ),
};

export const ResultSummarySheet: Story = {
  name: 'Result summary',
  render: () => (
    <div className="max-w-sm">
      <SheetShell
        title="Approved 7 of 9"
        subtitle="Rows that needed nothing were skipped"
      >
        <SheetBody>
          <div className="grid grid-cols-3 gap-space-8">
            <div className="p-space-10 bg-sunken rounded-ds-md text-center">
              <div className="text-caption text-ink-3 font-semibold">Approved</div>
              <div className="text-title font-extrabold text-positive mt-space-2">
                7
              </div>
            </div>
            <div className="p-space-10 bg-sunken rounded-ds-md text-center">
              <div className="text-caption text-ink-3 font-semibold">Skipped</div>
              <div className="text-title font-extrabold text-ink mt-space-2">
                1
              </div>
            </div>
            <div className="p-space-10 bg-sunken rounded-ds-md text-center">
              <div className="text-caption text-ink-3 font-semibold">Failed</div>
              <div className="text-title font-extrabold text-danger mt-space-2">
                1
              </div>
            </div>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button size="phone" variant="primary" className="flex-1">
            Done
          </Button>
        </SheetFooter>
      </SheetShell>
    </div>
  ),
};

export const InteractiveModal: Story = {
  name: 'Interactive bottom sheet',
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="primary">Open Bottom Sheet</Button>
      </SheetTrigger>
      <SheetContent
        title="Interactive Sheet"
        subtitle="Opens from bottom on phone"
      >
        <SheetBody>
          <div className="text-body text-ink">
            Tap outside or click close to dismiss.
          </div>
        </SheetBody>
        <SheetFooter>
          <Button size="phone" variant="primary" className="flex-1">
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const AllVariants: Story = {
  name: 'All variants',
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-24 max-w-4xl">
      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Form
        </div>
        <SheetShell
          title="Set statement details"
          subtitle="HDFC Regalia · 5 Oct"
        >
          <SheetBody>
            <TextField label="Total due" defaultValue="₹ 44,319.00" />
            <TextField label="Due date" defaultValue="25/10/2026" />
          </SheetBody>
          <SheetFooter>
            <Button size="phone" variant="secondary" className="flex-1">
              Cancel
            </Button>
            <Button size="phone" variant="primary" className="flex-1">
              Save
            </Button>
          </SheetFooter>
        </SheetShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Detail
        </div>
        <SheetShell
          title="Swiggy Bangalore"
          subtitle="₹1,249.00 · 11 Oct"
        >
          <SheetBody>
            <div className="flex gap-space-6 flex-wrap pb-space-8 border-b border-line-soft">
              <Button size="sm" variant="secondary">
                Edit
              </Button>
              <Button size="sm" variant="secondary">
                Link to…
              </Button>
            </div>
            <ListField label="Account" value="HDFC Regalia ••7741" borderTop={false} />
            <ListField label="Category" value="Food & dining" />
          </SheetBody>
          <SheetFooter>
            <Button size="phone" variant="secondary" className="flex-1">
              Close
            </Button>
          </SheetFooter>
        </SheetShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Picker
        </div>
        <SheetShell title="Bank">
          <SheetBody>
            <div className="flex items-center gap-space-8 px-space-12 py-space-8 rounded-ds-md border border-line-soft text-body text-ink-3">
              <Search className="w-space-14 h-space-14 text-ink-4 shrink-0" />
              <span>Search banks</span>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button size="phone" variant="secondary" className="flex-1">
              Cancel
            </Button>
          </SheetFooter>
        </SheetShell>
      </div>

      <div>
        <div className="font-extrabold text-label text-ink-3 mb-space-8">
          Result summary
        </div>
        <SheetShell
          title="Approved 7 of 9"
          subtitle="Rows that needed nothing were skipped"
        >
          <SheetBody>
            <div className="grid grid-cols-3 gap-space-8">
              <div className="p-space-10 bg-sunken rounded-ds-md text-center">
                <div className="text-caption text-ink-3 font-semibold">Approved</div>
                <div className="text-title font-extrabold text-positive mt-space-2">
                  7
                </div>
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <Button size="phone" variant="primary" className="flex-1">
              Done
            </Button>
          </SheetFooter>
        </SheetShell>
      </div>
    </div>
  ),
};
