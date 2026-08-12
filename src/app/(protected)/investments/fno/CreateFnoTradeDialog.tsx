'use client';

import { FnoTradeDialog, FnoTradeDialogProps } from '../dialogs/FnoTradeDialog';

export function CreateFnoTradeDialog(props: FnoTradeDialogProps) {
  return <FnoTradeDialog mode="create" {...props} />;
}
