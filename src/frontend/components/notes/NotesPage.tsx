'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Sidebar } from '@/frontend/components/sidebar/Sidebar';
import { NoteEditor } from '@/frontend/components/editor/NoteEditor';
import { SearchBar } from '@/frontend/components/search/SearchBar';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useKeyboardShortcuts } from '@/frontend/hooks/useKeyboardShortcuts';
import { useOnlineStatus } from '@/frontend/hooks/useOnlineStatus';
import { useCloudSync } from '@/frontend/hooks/useCloudSync';
import { useAuth } from '@/frontend/contexts/AuthProvider';
import { createNote } from '@/lib/db/notes';
import { Search, Menu, Wifi, WifiOff, Settings, Sun, Moon, Cloud, Maximize, Minimize } from 'lucide-react';
import type { NoteFilter } from '@/shared/types/note';
import { useGoogleDrive } from '@/frontend/contexts/GoogleDriveProvider';
import { UserMenu, SignInButton } from '@/frontend/components/auth/UserMenu';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTheme } from '@/frontend/contexts/ThemeProvider';

export function NotesPage() {
  const {
    setSelectedNoteId,
    sidebarOpen,
    setSidebarOpen,
    setSearchOpen,
  } = useAppState();
  const { isConnected } = useGoogleDrive();
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const { syncStatus, lastSyncedAt, syncNow } = useCloudSync();
  const [activeFilter, setActiveFilter] = useState<NoteFilter>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep state in sync when user exits fullscreen via Escape or browser UI
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error('Fullscreen is not supported in this browser');
    }
  }, []);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    setSelectedNoteId(note.id);
    toast.success('New note created');
  }, [setSelectedNoteId]);

  const handleSave = useCallback(async () => {
    const fn = (window as unknown as Record<string, () => Promise<void>>).__writeboxSaveNow;
    if (fn) await fn();
    toast.success('Saved locally');
  }, []);

  const handleSyncDrive = useCallback(() => {
    if (!isConnected) {
      toast.error('Google Drive not connected. Go to Settings to connect.');
      return;
    }
    if (!isOnline) {
      toast.error('You are offline. Sync will be available when you reconnect.');
      return;
    }
    const sync = (window as unknown as Record<string, () => Promise<void>>).__writeboxSyncNow;
    if (!sync) {
      toast.error('Select a note to sync');
      return;
    }
    void sync();
  }, [isConnected, isOnline]);

  const handleSearch = useCallback(() => {
    setSearchOpen(true);
  }, [setSearchOpen]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const shortcutHandlers = useMemo(
    () => ({
      onNewNote: handleNewNote,
      onSave: handleSave,
      onSyncDrive: handleSyncDrive,
      onSearch: handleSearch,
    }),
    [handleNewNote, handleSave, handleSyncDrive, handleSearch]
  );

  useKeyboardShortcuts(shortcutHandlers);

  const cloudLabel =
    syncStatus === 'syncing'
      ? '↻ Syncing…'
      : syncStatus === 'synced'
        ? '✓ Cloud synced'
        : syncStatus === 'error'
          ? '✗ Sync error'
          : syncStatus === 'offline'
            ? '○ Offline'
            : user
              ? '● Cloud ready'
              : '';

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Sidebar (Full Height) */}
      <Sidebar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-primary)] rounded border border-[var(--color-border)]">
                ⌘K
              </kbd>
            </button>

            {/* Online status */}
            <div className="flex items-center gap-1 text-xs px-2">
              {isOnline ? (
                <Wifi size={14} className="text-[var(--color-success)]" />
              ) : (
                <WifiOff size={14} className="text-[var(--color-warning)]" />
              )}
            </div>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Settings */}
            <Link
              href="/settings"
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              <Settings size={18} />
            </Link>

            {/* Auth — UserMenu or SignIn */}
            {user ? (
              <UserMenu
                syncStatus={syncStatus}
                lastSyncedAt={lastSyncedAt}
                onSyncNow={syncNow}
              />
            ) : (
              <SignInButton />
            )}
          </div>
        </header>

        {/* Note Editor */}
        <NoteEditor />

        {/* Status Bar */}
        <footer className="flex items-center justify-between px-4 py-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)] shrink-0">
          <span>
            {isOnline ? '● Online' : '○ Offline'} — Notes saved locally
          </span>
          <div className="flex items-center gap-4">
            {user && cloudLabel && (
              <span className="flex items-center gap-1">
                <Cloud size={12} />
                {cloudLabel}
              </span>
            )}
            <span>
              Google Drive: {isConnected ? '✓ Connected' : 'Not connected'}
            </span>
          </div>
        </footer>
      </div>

      {/* Search Overlay */}
      <SearchBar />
    </div>
  );
}

