export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mitme_theme';

export function getThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getEffectiveTheme(): 'light' | 'dark' {
  const mode = getThemeMode();
  return mode === 'system' ? getSystemTheme() : mode;
}

export function applyTheme(): void {
  if (typeof document === 'undefined') return;
  const effective = getEffectiveTheme();
  document.documentElement.setAttribute('data-theme', effective);
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme();
}

export function initTheme(): void {
  applyTheme();

  if (typeof window === 'undefined') return;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getThemeMode() === 'system') applyTheme();
  };

  if (mq.addEventListener) {
    mq.addEventListener('change', onChange);
  } else if ((mq as any).addListener) {
    (mq as any).addListener(onChange);
  }
}
