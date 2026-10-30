import { showToast } from '@/components/ds/Toast/Toast';
import { copyText as writeToClipboard } from '@/lib/copyText';

export const COPY_FAILED = "Couldn't copy. Try again.";

/** Puts text on the clipboard and says so; a missing clipboard or a refused write is a danger toast instead of silence. */
export async function copyText(text: string, done: string): Promise<boolean> {
  const copied = await writeToClipboard(text);
  if (copied) showToast(done);
  else showToast(COPY_FAILED, { tone: 'danger' });
  return copied;
}
