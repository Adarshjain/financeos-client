import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import {
  Button,
  Card,
  Checkbox,
  ConcealProvider,
  ConfirmDialog,
  Dialog,
  Divider,
  Switch,
  Text,
  TextField,
} from '@/components/ds';

const meta: Meta<typeof Dialog.Content> = {
  title: 'DS/Overlays/Dialog',
  component: Dialog.Content,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 500,
      },
      description: {
        component:
          'The one overlay for forms, details, pickers and confirmations. It replaces Sheet and ConfirmSheet: the same component is a centred modal on desktop and a bottom sheet on phone, chosen by CSS at the desk breakpoint.',
      },
    },
  },
  args: {
    size: 'md',
    background: 'surface',
    title: 'Dialog Title',
    description: 'Dialog description and context.',
    showClose: true,
    dismissible: true,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    background: {
      control: 'select',
      options: ['surface', 'canvas'],
    },
    dismissible: { control: 'boolean' },
    showClose: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    primary: { control: false },
    secondary: { control: false },
    tertiary: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Dialog.Content>;

export const Default: Story = {
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content
        {...args}
        primary={{ label: 'Confirm', onSelect: fn() }}
        secondary={{ label: 'Cancel', onSelect: fn() }}
      >
        <Dialog.Body>
          <Text>
            Modal body content rendered within standard layout.
          </Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const SmallWithTertiary: Story = {
  args: {
    size: 'sm',
    title: 'Apply changes',
    description: 'Review the selected options before proceeding.',
  },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content
        {...args}
        tertiary={{ label: 'Delete', tone: 'danger', onSelect: fn() }}
        secondary={{ label: 'Cancel', onSelect: fn() }}
        primary={{ label: 'Save', onSelect: fn() }}
      >
        <Dialog.Body className="space-y-space-8">
          <div className="flex items-center justify-between py-space-6">
            <Text variant="body-strong">Option 1</Text>
            <Checkbox defaultChecked />
          </div>
          <Divider />
          <div className="flex items-center justify-between py-space-6">
            <Text variant="body-strong">Option 2</Text>
            <Checkbox />
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const ActionWithIcon: Story = {
  args: { size: 'sm', title: 'Export report' },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Content
        {...args}
        secondary={{ label: 'Cancel', onSelect: fn() }}
        primary={{ label: 'Download CSV', icon: 'download', onSelect: fn() }}
      >
        <Dialog.Body>
          <Text variant="body">Spend by category, April to September 2026, 248 rows.</Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const LargeForm: Story = {
  args: {
    size: 'lg',
    title: 'Edit preferences',
    description: 'Configure standard settings for your account.',
  },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content
        {...args}
        secondary={{ label: 'Cancel', onSelect: fn() }}
        primary={{ label: 'Save preferences', onSelect: fn() }}
      >
        <Dialog.Body className="space-y-space-16">
          <TextField label="Display name" defaultValue="Alex Morgan" />
          <TextField label="Email address" defaultValue="alex@example.com" />
          <Divider />
          <div className="flex items-center justify-between py-space-8">
            <Text variant="body-strong">Email notifications</Text>
            <Switch defaultChecked />
          </div>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const SidePanel: Story = {
  args: {
    title: 'Detail inspector',
    description: 'A card beside the page on desktop.',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Set on Dialog as variant="side-panel". Non-modal on desktop: no backdrop, the page behind stays usable, and the page swaps the content when another row is picked. On phone it is the bottom sheet with a backdrop.',
      },
    },
  },
  render: (args) => (
    <Dialog defaultOpen variant="side-panel">
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content
        {...args}
        secondary={{ label: 'Close', onSelect: fn() }}
        primary={{ label: 'Update', onSelect: fn() }}
      >
        <Dialog.Body>
          <Text>
            Side panel drawer content slides in from the right edge.
          </Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const CanvasBackground: Story = {
  args: {
    background: 'canvas',
    title: 'Canvas backdrop',
    description: 'Uses bg-canvas for standalone cards.',
  },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>
      <Dialog.Content
        {...args}
        primary={{ label: 'Done', onSelect: fn() }}
      >
        <Dialog.Body>
          <Card>
            <div className="p-space-16">
              <Text variant="body-strong">Card Item</Text>
            </div>
          </Card>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const WithSections: Story = {
  args: { size: 'md', title: 'Edit rule' },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Content
        {...args}
        primary={{ label: 'Save rule', onSelect: fn() }}
        secondary={{ label: 'Cancel', onSelect: fn() }}
      >
        <Dialog.Body>
          <Dialog.Section title="Conditions">
            <TextField label="Description contains" defaultValue="Swiggy" />
          </Dialog.Section>
          <Dialog.Section title="Then">
            <TextField label="Set category" defaultValue="Food & dining" />
          </Dialog.Section>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const CollapsibleSections: Story = {
  args: { size: 'md', title: 'Edit rule' },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Content
        {...args}
        primary={{ label: 'Save rule', onSelect: fn() }}
        secondary={{ label: 'Cancel', onSelect: fn() }}
      >
        <Dialog.Body>
          <Dialog.Section title="Conditions" collapsible onOpenChange={fn()}>
            <TextField label="Description contains" defaultValue="Swiggy" />
          </Dialog.Section>
          <Dialog.Section title="Advanced" collapsible defaultOpen={false} onOpenChange={fn()}>
            <TextField label="Amount at least" defaultValue="₹500" />
          </Dialog.Section>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};

export const Confirm: StoryObj<typeof ConfirmDialog> = {
  render: () => (
    <ConfirmDialog
      title="Delete item?"
      description="This action cannot be undone. All associated data will be removed."
      confirmLabel="Delete item"
      onConfirm={fn()}
      onCancel={fn()}
      trigger={<Button variant="danger">Delete item</Button>}
    />
  ),
};

export const ConfirmWithPreview: StoryObj<typeof ConfirmDialog> = {
  render: () => (
    <ConfirmDialog
      defaultOpen
      title="Delete workspace?"
      description="Removing the workspace affects the following items:"
      confirmLabel="Delete workspace"
      tone="danger"
      onConfirm={fn()}
      onCancel={fn()}
    >
      <ul className="list-disc pl-space-16 space-y-space-6">
        <li>
          <Text variant="label" tone="ink-2">3 linked projects will be archived</Text>
        </li>
        <li>
          <Text variant="label" tone="ink-2">12 invitations will be revoked</Text>
        </li>
      </ul>
    </ConfirmDialog>
  ),
};

export const ConfirmAlternative: StoryObj<typeof ConfirmDialog> = {
  render: () => (
    <ConfirmDialog
      defaultOpen
      title="Discard unsaved changes?"
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      alternativeLabel="Save as draft"
      tone="default"
      onConfirm={fn()}
      onCancel={fn()}
      onAlternative={fn()}
    />
  ),
};

export const Concealed: Story = {
  ...Default,
  args: { ...Default.args, title: 'Pay ₹4,500?', description: '₹4,500 leaves HDFC Savings' },
  decorators: [
    (Story) => (
      <ConcealProvider concealed>
        <Story />
      </ConcealProvider>
    ),
  ],
  parameters: {
    docs: { description: { story: 'While amounts are hidden (ConcealProvider), every ₹ amount reads "₹ —".' } },
  },
};

export const Full: Story = {
  args: { size: 'full', title: 'Card utilisation', description: 'All cards, last 6 months.' },
  render: (args) => (
    <Dialog defaultOpen>
      <Dialog.Content {...args} secondary={{ label: 'Close', onSelect: fn() }}>
        <Dialog.Body>
          <Text variant="body">HDFC Regalia ₹1,24,500 of ₹4,00,000 used. ICICI Amazon Pay ₹18,200 of ₹2,00,000 used.</Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  ),
};
