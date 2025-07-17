import { writable } from 'svelte/store';
import type { Theme } from '../types';

export const currentTheme = writable<Theme>('skeleton');
export const isDarkMode = writable<boolean>(false);

export function setTheme(theme: Theme) {
  currentTheme.set(theme);
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selected-theme', theme);
  }
}

export function setDarkMode(dark: boolean) {
  isDarkMode.set(dark);
  if (typeof document !== 'undefined') {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark-mode', dark.toString());
  }
}

export function loadTheme() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('selected-theme') as Theme;
    if (stored) {
      setTheme(stored);
    }

    const darkStored = localStorage.getItem('dark-mode');
    if (darkStored !== null) {
      setDarkMode(darkStored === 'true');
    }
  }
}
