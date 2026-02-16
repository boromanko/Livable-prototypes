const DEMO_ACCESS_STORAGE_KEY = 'demo-access-password';
const DEMO_ACCESS_EVENT = 'demo-access-changed';

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined';
}

function notifyDemoAccessChanged(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.dispatchEvent(new Event(DEMO_ACCESS_EVENT));
}

export function getDemoAccessPassword(): string {
  if (!canUseBrowserStorage()) {
    return '';
  }

  return window.sessionStorage.getItem(DEMO_ACCESS_STORAGE_KEY) ?? '';
}

export function setDemoAccessPassword(password: string): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.setItem(DEMO_ACCESS_STORAGE_KEY, password);
  notifyDemoAccessChanged();
}

export function clearDemoAccessPassword(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.sessionStorage.removeItem(DEMO_ACCESS_STORAGE_KEY);
  notifyDemoAccessChanged();
}

export function subscribeDemoAccessChanges(onChange: () => void): () => void {
  if (!canUseBrowserStorage()) {
    return () => {};
  }

  const listener = (): void => {
    onChange();
  };

  window.addEventListener(DEMO_ACCESS_EVENT, listener);
  return () => {
    window.removeEventListener(DEMO_ACCESS_EVENT, listener);
  };
}
