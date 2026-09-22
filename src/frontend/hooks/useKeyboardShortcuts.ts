'use client';

import { useEffect } from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';

interface ShortcutHandlers {
  onNewNote: () => void;
  onSave: () => void;
  onSyncDrive: () => void;
  onSearch: () => void;
}

/**
 * Registers global keyboard shortcuts.
 *
 * Ctrl/Cmd + N → New note
 * Ctrl/Cmd + S → Save locally
 * Ctrl/Cmd + Shift + S → Sync to Drive
 * Ctrl/Cmd + K → Search
 * Escape → Close search / modals
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const { setSearchOpen, searchOpen } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd + N → New note
      if (isMod && e.key === 'n') {
        e.preventDefault();
        handlers.onNewNote();
        return;
      }

      // Ctrl/Cmd + Shift + S → Sync Drive
      if (isMod && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handlers.onSyncDrive();
        return;
      }

      // Ctrl/Cmd + S → Save locally
      if (isMod && e.key === 's') {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      // Ctrl/Cmd + K → Toggle search
      if (isMod && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch();
        return;
      }

      // Escape → Close search
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, searchOpen, setSearchOpen]);
}
