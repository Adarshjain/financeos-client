import React from 'react';

import { Avatar } from '@/components/ds';
import { bankById } from '@/features/banks/banks';
import { SPRITE_CELL, SPRITE_IDS } from '@/features/banks/bankSprite.generated';

export interface BankLogoProps {
  /** The server's bank id, such as `hdfc`. An unknown id shows its first letter instead. */
  bankId: string;
}

/** One bank's logo, cut from the shared sprite at public/banks/sprite.png, in the small square Avatar frame. */
export function BankLogo({ bankId }: BankLogoProps) {
  const bank = bankById(bankId);
  if (!bank) {
    return <Avatar variant="square" size="sm" initials={(bankId.slice(0, 1) || '?').toUpperCase()} />;
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
