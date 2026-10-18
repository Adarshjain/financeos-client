import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';

import { Button, Card, Stepper, type StepperProps } from '@/components/ds';

const importSteps = [
  { id: 'files', label: 'Files' },
  { id: 'match', label: 'Match instruments' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'done', label: 'Done' },
];

const meta: Meta<typeof Stepper> = {
  title: 'DS/Navigation/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The steps of a multi-step flow and where the user is, as on the import wizard. Progress only: steps are not clickable. Use Back and Next (the page\'s own buttons) to move; done steps turn into a check, the current step is the filled circle. Narrow the window to see the steps wrap.',
      },
    },
  },
  args: {
    steps: importSteps,
    current: 2,
  },
  argTypes: {
    steps: { control: 'object' },
    current: { control: { type: 'number', min: 0, max: 4, step: 1 } },
  },
};

export default meta;
type Story = StoryObj<typeof Stepper>;

export const ImportWizard: Story = {
  render: function Render(args: StepperProps) {
    const [, updateArgs] = useArgs();
    const last = args.steps.length;
    return (
      <Card className="max-w-3xl">
        <div className="flex flex-col gap-space-12 px-space-16 py-space-12">
          <Stepper {...args} aria-label="Import steps" />
          <div className="flex justify-end gap-space-8">
            <Button
              variant="secondary"
              disabled={args.current <= 0}
              onClick={() => updateArgs({ current: args.current - 1 })}
            >
              Back
            </Button>
            <Button
              variant="primary"
              disabled={args.current >= last}
              onClick={() => updateArgs({ current: args.current + 1 })}
            >
              {args.current >= last - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </Card>
    );
  },
};
