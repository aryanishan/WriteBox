'use client';

import React, { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Theme } from '@/shared/types/settings';
import { LS_KEYS } from '@/shared/constants';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_CHANGE_EVENT = 'writebox-theme-change';

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(LS_KEYS.THEME) as Theme | null;
  return stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

function subscribeToSystemTheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getStoredTheme, (): Theme => 'system');
  const prefersDark = useSyncExternalStore<boolean>(
    subscribeToSystemTheme,
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    (): boolean => false
  );
  const resolvedTheme: 'light' | 'dark' = theme === 'system'
    ? (prefersDark ? 'dark' : 'light')
    : theme;

  // Resolve theme and apply to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');

  }, [resolvedTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(LS_KEYS.THEME, newTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
