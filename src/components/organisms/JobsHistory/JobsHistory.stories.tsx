import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

import { Card } from '@/components/ds';
import { JobsHistory } from '@/components/organisms';
import type { JobResponse } from '@/lib/types';

const now = new Date().toISOString();
const ingest = (id: string, filename: string, over: Partial<JobResponse> = {}, warning?: string): JobResponse =>
  ({
    id,
    type: 'STATEMENT_INGEST',
    status: 'SUCCEEDED',
    triggerSource: 'USER',
    cancelRequested: false,
    attempt: 1,
    createdAt: now,
    startedAt: now,
    finishedAt: now,
    result: {
      filesProcessed: 1,
      totalCreated: 12,
      totalDuplicatesFound: 0,
      fileDetails: [{ filename, status: 'SUCCESS', linesParsed: 12, created: 12, duplicates: 0, errorMessage: null, warning }],
    },
    ...over,
  }) as JobResponse;

const jobs = [
  ingest('j4', 'Regalia-Gold-Oct.pdf', { status: 'RUNNING', result: null, progressNote: 'Reading page 2 of 4', progressCurrent: 2, progressTotal: 4 }),
  ingest('j3', 'HDFC-savings-statement.pdf'),
  ingest('j2', 'Amex-Platinum-statement.pdf', {}, '1 row dated after the statement'),
  ingest('j1', 'SBI-Cashback-statement.pdf', { status: 'FAILED', result: null, errorMessage: 'Could not read the file. Check the password.' }),
];

const meta: Meta<typeof JobsHistory> = {
  title: 'Organisms/JobsHistory',
  component: JobsHistory,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { jobs, openHref: (j) => `/ds/transactions/import/${j.id}`, onOpen: fn() },
  argTypes: {
    jobs: { control: 'object' },
    compact: { control: 'boolean' },
    loading: { control: 'boolean' },
    openHref: { control: false },
    onOpen: { control: false },
    pager: { control: false },
    empty: { control: false },
  },
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof JobsHistory>;

export const Full: Story = {};
export const Compact: Story = { args: { compact: true } };
