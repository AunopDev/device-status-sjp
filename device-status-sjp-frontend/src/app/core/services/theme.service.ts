import { Injectable, effect, signal } from '@angular/core';

export type ThemeMode = 'softwhite' | 'softdark';

const STORAGE_KEY = 'device-status-sjp:theme';

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'softwhite' || stored === 'softdark') {
      return stored;
    }
  } catch {
    // ignore storage access errors (e.g. private browsing)
  }

  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return prefersDark ? 'softdark' : 'softwhite';
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly theme = signal<ThemeMode>(readStoredTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore storage access errors
      }
    });
  }

  toggle(): void {
    this.theme.update((current) => (current === 'softwhite' ? 'softdark' : 'softwhite'));
  }

  isDark(): boolean {
    return this.theme() === 'softdark';
  }
}
