import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { fn } from 'storybook/test';

import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogContent,
  DialogTrigger,
  Divider,
  Switch,
  Text,
  TextField,
} from '@/components/ds';

const meta: Meta<typeof DialogContent> = {
  title: 'DS/Overlays/Dialog',
  component: DialogContent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: false,
        iframeHeight: 500,
      },
      description: {
        component:
          'The one overlay for forms, details, pickers and confirmations. It replaces Sheet and ConfirmSheet: the same component is a centred modal on desktop and a bottom sheet on phone, chosen by CSS at the lg breakpoint.',
      },
    },
  },
  args: {
    size: 'md',
    variant: 'modal',
    background: 'surface',
    title: 'Dialog Title',
    description: 'Dialog description and context.',
    showClose: true,
    dismissible: true,
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    variant: {
      control: 'select',
      options: ['modal', 'side-panel'],
    },
    background: {
      control: 'select',
      options: ['surface', 'canvas'],
    },
    dismissible: { control: 'boolean' },
    showClose: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof DialogContent>;

export const Default: Story = {
  render: (args) => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent
        {...args}
        primary={<Button variant="primary">Confirm</Button>}
        secondary={<Button variant="secondary">Cancel</Button>}
      >
        <DialogBody>
          <Text>
            Modal body content rendered within standard layout.
          </Text>
        </DialogBody>
      </DialogContent>
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
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent
        {...args}
        tertiary={<Button variant="danger">Delete</Button>}
        secondary={<Button variant="secondary">Cancel</Button>}
        primary={<Button variant="primary">Save</Button>}
      >
        <DialogBody className="space-y-space-8">
          <div className="flex items-center justify-between py-space-6">
            <Text variant="body-strong">Option 1</Text>
            <Checkbox defaultChecked />
          </div>
          <Divider />
          <div className="flex items-center justify-between py-space-6">
            <Text variant="body-strong">Option 2</Text>
            <Checkbox />
          </div>
        </DialogBody>
      </DialogContent>
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
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent
        {...args}
        secondary={<Button variant="secondary">Cancel</Button>}
        primary={<Button variant="primary">Save preferences</Button>}
      >
        <DialogBody className="space-y-space-16">
          <TextField label="Display name" defaultValue="Alex Morgan" />
          <TextField label="Email address" defaultValue="alex@example.com" />
          <Divider />
          <div className="flex items-center justify-between py-space-8">
            <Text variant="body-strong">Email notifications</Text>
            <Switch defaultChecked />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  ),
};

export const SidePanel: Story = {
  args: {
    variant: 'side-panel',
    title: 'Detail inspector',
    description: 'Full height slide-out drawer on desktop.',
  },
  render: (args) => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent
        {...args}
        secondary={<Button variant="secondary">Close</Button>}
        primary={<Button variant="primary">Update</Button>}
      >
        <DialogBody>
          <Text>
            Side panel drawer content slides in from the right edge.
          </Text>
        </DialogBody>
      </DialogContent>
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
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent
        {...args}
        primary={<Button variant="primary">Done</Button>}
      >
        <DialogBody>
          <Card>
            <div className="p-space-16">
              <Text variant="body-strong">Card Item</Text>
            </div>
          </Card>
        </DialogBody>
      </DialogContent>
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
