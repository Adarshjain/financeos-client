'use client';

import React from 'react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  CardRow,
  CardSection,
  Icon,
  ListRow,
  Menu,
  MenuItem,
  MenuSeparator,
  StatusWord,
  Text,
} from '@/components/ds';

import type {
  ClosedHolderModel,
  HolderCardModel,
  HolderMenuId,
  HolderMenuItem,
  PlasticModel,
  StatModel,
} from './cardsModel';

export function HolderMenu({
  items,
  onSelect,
}: {
  items: HolderMenuItem[];
  onSelect: (id: HolderMenuId) => void;
}) {
  return (
    <Menu
      align="end"
      trigger={
        <Button variant="secondary" size="sm" iconOnly aria-label="Cardholder actions">
          <Icon name="more" size="sm" />
        </Button>
      }
    >
      {items.map((item) => (
        <React.Fragment key={item.id}>
          {item.separatorBefore ? <MenuSeparator /> : null}
          <MenuItem destructive={item.destructive} onSelect={() => onSelect(item.id)}>
            {item.label}
          </MenuItem>
        </React.Fragment>
      ))}
    </Menu>
  );
}

function Stat({ stat }: { stat: StatModel }) {
  return (
    <div className="min-w-0 flex flex-col gap-space-4">
      <Text variant="label" tone="ink-3" as="div">
        {stat.label}
      </Text>
      <Text variant="figure" tone={stat.muted ? 'ink-3' : (stat.tone ?? 'ink')} as="div">
        {stat.value}
      </Text>
    </div>
  );
}

function PlasticRow({
  plastic,
  holderId,
  onReplace,
  onClose,
  onDelete,
}: {
  plastic: PlasticModel;
  holderId: string;
  onReplace: (holderId: string, cardId: string) => void;
  onClose: (holderId: string, cardId: string) => void;
  onDelete: (holderId: string, cardId: string) => void;
}) {
  const active = plastic.status === 'Active';
  return (
    <ListRow
      title={
        <span className="flex items-center gap-space-6">
          <span>{plastic.mask}</span>
          <StatusWord tone={active ? 'success' : 'neutral'}>{plastic.status}</StatusWord>
        </span>
      }
      subtitle={plastic.caption || undefined}
      trailing={
        active ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => onReplace(holderId, plastic.id)}>
              Replace
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onClose(holderId, plastic.id)}>
              Close
            </Button>
          </>
        ) : plastic.deletable ? (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Delete card ${plastic.mask}`}
            onClick={() => onDelete(holderId, plastic.id)}
          >
            <Icon name="delete" size="sm" />
          </Button>
        ) : null
      }
    />
  );
}

/** One open cardholder: identity, figures, plastics, and the ⋯ menu. */
export function HolderCard({
  model,
  onMenu,
  onReplace,
  onCloseCard,
  onDeleteCard,
  onCloseHolder,
}: {
  model: HolderCardModel;
  onMenu: (holderId: string, id: HolderMenuId) => void;
  onReplace: (holderId: string, cardId: string) => void;
  onCloseCard: (holderId: string, cardId: string) => void;
  onDeleteCard: (holderId: string, cardId: string) => void;
  onCloseHolder: (holderId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <Avatar
          variant="circle"
          tone={model.primary ? 'neutral' : 'brand'}
          initials={model.initials}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-space-6">
            <Text variant="heading" as="span" truncate>
              {model.name}
            </Text>
            <Badge tone="neutral">{model.roleLabel}</Badge>
          </div>
          <Text variant="label" tone="ink-3" as="div">
            {model.caption}
          </Text>
        </div>
        <HolderMenu items={model.menu} onSelect={(id) => onMenu(model.id, id)} />
      </CardHeader>
      {model.stats.length > 0 ? (
        <div className={`px-space-16 pt-space-4 pb-space-12 grid grid-cols-2 gap-space-8 ${model.statColumns === 3 ? 'desk:grid-cols-3' : 'desk:grid-cols-4'}`}>
          {model.stats.map((stat) => (
            <Stat key={stat.label} stat={stat} />
          ))}
        </div>
      ) : null}
      <CardSection>{model.plasticsLabel}</CardSection>
      {model.plastics.map((plastic) => (
        <PlasticRow
          key={plastic.id}
          plastic={plastic}
          holderId={model.id}
          onReplace={onReplace}
          onClose={onCloseCard}
          onDelete={onDeleteCard}
        />
      ))}
      {model.closeFooter ? (
        <CardRow>
          <Text variant="label" tone="ink-3" className="flex-1">
            Close this cardholder when the add-on is cancelled; history stays.
          </Text>
          <Button variant="danger" size="sm" onClick={() => onCloseHolder(model.id)}>
            Close cardholder
          </Button>
        </CardRow>
      ) : null}
    </Card>
  );
}

/** Closed cardholders as compact rows. */
export function ClosedHolders({
  rows,
  onMenu,
  onReopen,
}: {
  rows: ClosedHolderModel[];
  onMenu: (holderId: string, id: HolderMenuId) => void;
  onReopen: (holderId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <Card>
      {rows.map((row) => (
        <ListRow
          key={row.id}
          leading={<Avatar variant="circle" initials={row.initials} />}
          title={
            <span className="flex items-center gap-space-6">
              <span>{row.name}</span>
              <StatusWord tone="neutral">Closed</StatusWord>
            </span>
          }
          subtitle={row.caption}
          trailing={
            <>
              {row.menu.some((i) => i.id === 'reopen') ? (
                <Button variant="secondary" size="sm" onClick={() => onReopen(row.id)}>
                  Reopen
                </Button>
              ) : null}
              <HolderMenu items={row.menu} onSelect={(id) => onMenu(row.id, id)} />
            </>
          }
        />
      ))}
    </Card>
  );
}
