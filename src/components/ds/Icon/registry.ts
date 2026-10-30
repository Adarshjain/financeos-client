import { iconData, type IconName } from './icons.generated';

export type { IconName };

/** Our icon name -> generated SVG data (bold, plus fill where listed). Source: design-system/icons.json. */
export const iconRegistry = iconData;
