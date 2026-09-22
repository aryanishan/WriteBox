'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import type { EditorSettings } from '@/shared/types/settings';
import { DEFAULT_SETTINGS } from '@/shared/types/settings';
import { LS_KEYS } from '@/shared/constants';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AppStateContextValue {
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  editorSettings: EditorSettings;
  setEditorSettings: (settings: EditorSettings) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);
const EDITOR_SETTINGS_EVENT = 'writebox-editor-settings-change';
let cachedEditorSettings = DEFAULT_SETTINGS.editor;
let cachedEditorSettingsRaw: string | null | undefined;

function getStoredEditorSettings(): EditorSettings {
  try {
    const saved = localStorage.getItem(LS_KEYS.SETTINGS);
    if (saved === cachedEditorSettingsRaw) return cachedEditorSettings;
    cachedEditorSettingsRaw = saved;
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<EditorSettings>;
      if (typeof parsed.fontSize === 'number' && parsed.editorWidth) {
        cachedEditorSettings = parsed as EditorSettings;
        return cachedEditorSettings;
      }
    }
  } catch {
    // Use defaults when storage is unavailable or malformed.
  }
  cachedEditorSettings = DEFAULT_SETTINGS.editor;
  return cachedEditorSettings;
}

function subscribeToEditorSettings(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EDITOR_SETTINGS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EDITOR_SETTINGS_EVENT, callback);
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [searchOpen, setSearchOpen] = useState(false);
  const editorSettings = useSyncExternalStore(
    subscribeToEditorSettings,
    getStoredEditorSettings,
    () => DEFAULT_SETTINGS.editor
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const setEditorSettings = useCallback((settings: EditorSettings) => {
    const serialized = JSON.stringify(settings);
    cachedEditorSettings = settings;
    cachedEditorSettingsRaw = serialized;
    localStorage.setItem(LS_KEYS.SETTINGS, serialized);
    window.dispatchEvent(new Event(EDITOR_SETTINGS_EVENT));
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        selectedNoteId,
        setSelectedNoteId,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        saveStatus,
        setSaveStatus,
        searchOpen,
        setSearchOpen,
        editorSettings,
        setEditorSettings,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
