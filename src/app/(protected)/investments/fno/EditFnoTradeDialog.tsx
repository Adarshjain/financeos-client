'use client';

import { FnoTradeDialog, FnoTradeDialogProps } from '../dialogs/FnoTradeDialog';

export function EditFnoTradeDialog(props: FnoTradeDialogProps) {
  return <FnoTradeDialog mode="edit" {...props} />;
}
