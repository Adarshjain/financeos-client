/** A short tick through the Vibration API (Android; iOS Safari has none). Never throws. */
export function hapticTick(): void {
  try {
    if (typeof navigator === 'undefined') return;
    navigator.vibrate?.(10);
  } catch {
    // Unsupported or blocked: no feedback.
  }
}
