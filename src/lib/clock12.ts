/** 12-hour clock for Dinero: "3:30 pm", "12:05 am". No leading zero on the hour, lowercase am/pm. */
export function hm12(hour: number, minute: number): string {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** The time of day of an instant in the given zone (IST by default), e.g. "3:30 pm". */
export function clock12(at: Date, timeZone = 'Asia/Kolkata'): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  return hm12(get('hour'), get('minute'));
}
