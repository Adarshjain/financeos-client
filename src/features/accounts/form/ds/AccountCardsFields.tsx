'use client';

import React from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DateField } from '@/components/ds/DateField/DateField';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { RELATIONSHIP_LABELS } from '@/features/accounts/cards/constants';

import type { AccountFormValues, AddonRelationship, FormErrors } from './accountFormModel';

const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_LABELS)
  .filter(([value]) => value !== 'SELF')
  .map(([value, label]) => ({ value, label }));

const digitsOnly = (v: string) => v.replaceAll(/\D/g, '');

const replaceAt = <T,>(list: readonly T[], index: number, patch: Partial<T>): T[] =>
  list.map((item, i) => (i === index ? { ...item, ...patch } : item));
const removeAt = <T,>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);

function Block({
  title,
  action,
  children,
}: {
  title: React.ReactNode;
  action: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card variant="inset" title={title} action={action}>
      <Card.Row className="flex-col items-stretch">{children}</Card.Row>
    </Card>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">{children}</div>
  );
}

interface CardsProps {
  values: AccountFormValues;
  errors: FormErrors;
  onChange: (patch: Partial<AccountFormValues>) => void;
}

/** The credit card form's cards (create only): the primary card, add-ons, and any prefilled earlier numbers. */
export function CreditCardsFields({
  values,
  errors,
  today,
  onChange,
}: CardsProps & { today: string }) {
  const { addonCards } = values;
  return (
    <>
      <Block title="Your card" action={<Badge tone="neutral">Primary</Badge>}>
        <Pair>
          <TextField
            label="Last 4 digits"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            error={errors.last4}
            value={values.last4}
            onValueChange={(v) => onChange({ last4: v })}
          />
          <DateField
            label="Card anniversary"
            today={today}
            error={errors.anniversaryDate}
            value={values.anniversaryDate}
            onValueChange={(v) => onChange({ anniversaryDate: v as string })}
          />
        </Pair>
      </Block>

      {addonCards.map((card, i) => (
        <Block
          key={`addon-${i}`}
          title="Add-on card"
          action={
            <Button
              variant="danger-link"
              type="button"
              aria-label={`Remove add-on card ${i + 1}`}
              onClick={() => onChange({ addonCards: removeAt(addonCards, i) })}
            >
              Remove
            </Button>
          }
        >
          <Pair>
            <TextField
              label="Last 4 digits"
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              error={errors.addonCards?.[i]?.last4}
              value={card.last4}
              onValueChange={(v) => onChange({ addonCards: replaceAt(addonCards, i, { last4: digitsOnly(v) }) })}
            />
            <Select
              label="Holder is your"
              placeholder="Pick one"
              options={RELATIONSHIP_OPTIONS}
              error={errors.addonCards?.[i]?.relationship}
              value={card.relationship}
              onValueChange={(v) =>
                onChange({ addonCards: replaceAt(addonCards, i, { relationship: v as AddonRelationship }) })
              }
            />
          </Pair>
          <TextField
            label="Holder name"
            optional
            autoComplete="off"
            value={card.holderName}
            onValueChange={(v) => onChange({ addonCards: replaceAt(addonCards, i, { holderName: v }) })}
          />
        </Block>
      ))}

      <EarlierCardRows values={values} errors={errors} onChange={onChange} />

      <div>
        <Button
          variant="link"
          type="button"
          onClick={() =>
            onChange({ addonCards: [...addonCards, { last4: '', relationship: '', holderName: '' }] })
          }
        >
          Add an add-on card
        </Button>
      </div>
    </>
  );
}

function EarlierCardRows({ values, errors, onChange }: CardsProps) {
  const { earlierCards } = values;
  return (
    <>
      {earlierCards.map((card, i) => (
        <Block
          key={`earlier-${i}`}
          title={`Earlier number ••${card.last4}`}
          action={
            <Button
              variant="danger-link"
              type="button"
              aria-label={`Remove earlier number ••${card.last4}`}
              onClick={() => onChange({ earlierCards: removeAt(earlierCards, i) })}
            >
              Remove
            </Button>
          }
        >
          <Text variant="caption" tone="ink-3" as="p">
            Saved as a closed card so its old mail and statements land here.
          </Text>
          {errors.earlierCards?.[i]?.last4 ? (
            <Text variant="caption" tone="danger" as="p">
              {errors.earlierCards[i].last4}
            </Text>
          ) : null}
        </Block>
      ))}
    </>
  );
}

/** The bank account form's optional debit card (create only), then any prefilled earlier numbers. */
export function DebitCardFields({ values, errors, onChange }: CardsProps) {
  return (
    <>
      <TextField
        label="Last 4 digits"
        optional
        inputMode="numeric"
        maxLength={4}
        placeholder="1234"
        error={errors.debitCardLast4}
        value={values.debitCardLast4}
        onValueChange={(v) => onChange({ debitCardLast4: digitsOnly(v) })}
      />
      <EarlierCardRows values={values} errors={errors} onChange={onChange} />
    </>
  );
}
