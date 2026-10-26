import { showToast } from '@/components/ds';

export const COPY_FAILED = "Couldn't copy. Try again.";

/** Puts text on the clipboard and says so; a missing clipboard or a refused write is a danger toast instead of silence. */
export async function copyText(text: string, done: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    showToast(done);
    return true;
  } catch {
    showToast(COPY_FAILED, { tone: 'danger' });
    return false;
  }
}
