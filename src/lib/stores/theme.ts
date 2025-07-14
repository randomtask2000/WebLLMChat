import { writable } from 'svelte/store';
import type { Theme } from '../types';

export const currentTheme = writable<Theme>('skeleton');

export function setTheme(theme: Theme) {
  currentTheme.set(theme);
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selected-theme', theme);
  }
}

export function loadTheme() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('selected-theme') as Theme;
    if (stored) {
      setTheme(stored);
    }
  }
}