import React from 'react';

import { Avatar, Icon } from '@/components/ds';
import { bankById } from '@/features/banks/banks';
import { SPRITE_CELL, SPRITE_IDS } from '@/features/banks/bankSprite.generated';

export interface BankLogoProps {
  /** The server's bank id, such as `hdfc`. An unknown or missing id shows the first letter of `name` instead. */
  bankId: string | null;
  /** The account or bank name; its first letter fills the tile when there is no known logo. With no `bankId` the tile also carries an amber warning mark. */
  name: string;
  /** Shows the amber warning mark. Defaults to `true` when there is no `bankId`; pass `false` for accounts that have no bank, such as wallets and brokers. */
  warning?: boolean;
}

/** One bank's logo, cut from the shared sprite at public/banks/sprite.png, in the small square Avatar frame. */
export function BankLogo({ bankId, name, warning = !bankId }: BankLogoProps) {
  const bank = bankId ? bankById(bankId) : undefined;
  if (!bank) {
    const tile = <Avatar variant="square" size="sm" initials={(name.trim().slice(0, 1) || '?').toUpperCase()} />;
    if (!warning) return tile;
    // No bank set on the account: an amber mark at the top right, placed like a count badge.
    return (
      <span className="relative inline-flex shrink-0">
        {tile}
        <Icon
          name="warning"
          size="xs"
          weight="fill"
          data-testid="bank-missing"
          className="absolute -top-space-4 -right-space-4 rounded-ds-pill bg-surface text-warning ring-2 ring-surface"
        />
      </span>
    );
  }
  const cells = SPRITE_IDS.length;
  return (
    <span
      role="img"
      aria-label={bank.name}
      data-sprite-cell={bank.spriteIndex}
      data-sprite-size={SPRITE_CELL}
      className="inline-block h-space-24 w-space-24 shrink-0 overflow-hidden rounded-ds-sm bg-no-repeat"
      style={{
        backgroundImage: 'url(/banks/sprite.png)',
        backgroundSize: `${cells * 100}% 100%`,
        backgroundPosition: `${(bank.spriteIndex / (cells - 1)) * 100}% 0%`,
      }}
    />
  );
}
