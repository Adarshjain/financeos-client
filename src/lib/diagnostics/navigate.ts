type NavigateFunction = (path: string) => void;

let customNavigator: NavigateFunction | null = null;

export function setNavigator(fn: NavigateFunction | null): void {
  customNavigator = fn;
}

export function navigateTo(path: string): void {
  if (customNavigator) {
    customNavigator(path);
  } else if (typeof window !== 'undefined') {
    window.location.assign(path);
  }
}
