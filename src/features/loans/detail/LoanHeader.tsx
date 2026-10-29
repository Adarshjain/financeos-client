'use client';

import React from 'react';

import { Badge, Button, Icon, Menu, Text } from '@/components/ds';

import type { LoanHeaderModel } from './loanDetailModel';

export interface LoanHeaderProps {
  header: LoanHeaderModel;
  /** Prepay shows while the loan is active. */
  canPrepay: boolean;
  closed: boolean;
  onPrepay: () => void;
  onEdit: () => void;
  onClose: () => void;
  onReopen: () => void;
  onDelete: () => void;
}

/** Status and rate, the loan's particulars, and on the right the EMI to pay next with Prepay and the menu. */
export function LoanHeader({ header, canPrepay, closed, onPrepay, onEdit, onClose, onReopen, onDelete }: LoanHeaderProps) {
  const { next } = header;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12 desk:flex-row desk:items-end desk:justify-between">
      <div className="min-w-0 flex flex-wrap items-center gap-space-8">
        <Badge tone={header.status.tone}>{header.status.label}</Badge>
        <Badge tone="neutral">{header.rate}</Badge>
        <Text variant="body" tone="ink-3" as="span">
          {header.meta}
        </Text>
      </div>
      <div className="flex flex-col gap-space-8 desk:flex-row desk:items-center desk:gap-space-16">
        {next ? (
          <div className="flex flex-col gap-space-2">
            {next.overdue ? (
              <div>
                <Badge tone="danger">{next.eyebrow}</Badge>
              </div>
            ) : (
              <Text variant="overline" tone="ink-3" as="div">
                {next.eyebrow}
              </Text>
            )}
            <Text variant="figure" as="div">
              {next.amount}
            </Text>
            <Text variant="label" tone="ink-3" as="div">
              {next.context}
            </Text>
          </div>
        ) : null}
        <div className="flex items-center gap-space-8">
          {canPrepay ? (
            <Button variant="secondary" className="flex-1 desk:flex-none" onClick={onPrepay}>
              Prepay
            </Button>
          ) : null}
          <Menu
            align="end"
            trigger={
              <Button variant="ghost" iconOnly aria-label="More actions">
                <Icon name="more" size="md" />
              </Button>
            }
          >
            <Menu.Item onSelect={onEdit}>Edit loan</Menu.Item>
            {closed ? (
              <Menu.Item onSelect={onReopen}>Reopen loan</Menu.Item>
            ) : (
              <Menu.Item onSelect={onClose}>Close loan</Menu.Item>
            )}
            <Menu.Item tone="danger" onSelect={onDelete}>
              Delete loan
            </Menu.Item>
          </Menu>
        </div>
      </div>
    </div>
  );
}
