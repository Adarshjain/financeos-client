/**
 * onCloseAutoFocus for overlay content (Menu, Popover): Radix returns focus to the trigger when the
 * content unmounts, which happens after the exit animation. If the user has already moved focus to
 * another element (e.g. opened a Select beside the menu), that return would steal it and dismiss the
 * newly opened overlay. So the return is skipped when focus is on something outside the content.
 * The consumer's own handler runs first and keeps its preventDefault semantics.
 */
export function guardCloseAutoFocus(
  consumer?: (event: Event) => void,
): (event: Event) => void {
  return (event) => {
    consumer?.(event);
    if (event.defaultPrevented) return;
    const active = document.activeElement;
    if (!active || active === document.body) return;
    const content = event.target as Node | null;
    if (content && content.contains(active)) return;
    event.preventDefault();
  };
}
