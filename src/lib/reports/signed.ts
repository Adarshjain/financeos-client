/** "+₹6,100" / "-₹6,100": a change with its sign always shown. */
export function signed(text: string, value: number): string {
  return value > 0 ? `+${text}` : text;
}
