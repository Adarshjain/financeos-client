import { Text } from '@/components/ds/Text/Text';

/** The last line of a delete confirmation, in the dialog description style. Pass it as the ConfirmDialog children. */
export function IrreversibleNote() {
  return (
    <Text variant="body" tone="ink-3">
      This can&apos;t be undone.
    </Text>
  );
}
