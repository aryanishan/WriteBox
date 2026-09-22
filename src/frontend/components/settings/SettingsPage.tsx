'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/frontend/contexts/ThemeProvider';
import { useGoogleDrive } from '@/frontend/contexts/GoogleDriveProvider';
import { Button } from '@/frontend/components/ui/Button';
import { Modal } from '@/frontend/components/ui/Modal';
import { getNoteCount, getStorageEstimate, clearAllNotes } from '@/lib/db/notes';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  HardDrive,
  Cloud,
  CloudOff,
  Trash2,
  PenLine,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Theme } from '@/shared/types/settings';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { requestGoogleAuthCode, exchangeGoogleAuthCode } from '@/lib/google-drive/client';
import { initDriveFolder } from '@/lib/google-drive/sync';
import { EDITOR_WIDTHS } from '@/shared/constants';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { isConnected, driveState, disconnect, connect } = useGoogleDrive();
  const { editorSettings, setEditorSettings } = useAppState();
  const [noteCount, setNoteCount] = useState(0);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  useEffect(() => {
    getNoteCount().then(setNoteCount);
    getStorageEstimate().then(setStorageInfo);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleClearData = async () => {
    await clearAllNotes();
    setNoteCount(0);
    setShowClearModal(false);
    toast.success('All notes cleared');
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDisconnectModal(false);
    toast.success('Google Drive disconnected');
  };

  const handleConnectDrive = async () => {
    try {
      const code = await requestGoogleAuthCode();
      const { accessToken, expiryDate } = await exchangeGoogleAuthCode(code);
      const folder = await initDriveFolder(accessToken);
      if (!folder.folderId) throw new Error(folder.error || 'Unable to create the WriteBox folder.');
      connect({ accessToken, tokenExpiresAt: expiryDate, folderId: folder.folderId });
      toast.success('Google Drive connected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to connect Google Drive.');
    }
  };

  const themeOptions: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={16} />, label: 'Light' },
    { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
    { value: 'system', icon: <Monitor size={16} />, label: 'System' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <Link
          href="/notes"
          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Settings</h1>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
            Appearance
          </h2>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">Theme</p>
            <div className="flex gap-2">
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] text-sm transition-colors cursor-pointer ${
                    theme === opt.value
                      ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border border-[var(--color-accent)]/30'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] border border-transparent'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Editor */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
            Editor
          </h2>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-4">
            <label className="block">
              <span className="text-sm text-[var(--color-text-secondary)]">Font size</span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min="14"
                  max="22"
                  value={editorSettings.fontSize}
                  onChange={event => setEditorSettings({ ...editorSettings, fontSize: Number(event.target.value) })}
                  className="w-48 accent-[var(--color-accent)]"
                />
                <span className="text-sm text-[var(--color-text-tertiary)] w-10">{editorSettings.fontSize}px</span>
              </div>
            </label>
            <div>
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">Writing width</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(EDITOR_WIDTHS).map(width => (
                  <button
                    key={width}
                    onClick={() => setEditorSettings({ ...editorSettings, editorWidth: width as keyof typeof EDITOR_WIDTHS })}
                    className={`px-3 py-1.5 text-sm rounded-[var(--radius-md)] border transition-colors cursor-pointer ${
                      editorSettings.editorWidth === width
                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[var(--color-accent)]/30'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border-transparent hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    {width.charAt(0).toUpperCase() + width.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
              <PenLine size={14} />
              <span>Preferences are saved in this browser.</span>
            </div>
          </div>
        </section>

        {/* Storage */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
            Storage
          </h2>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-4">
            <div className="flex items-start gap-3">
              <HardDrive size={18} className="text-[var(--color-success)] mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Local Storage (IndexedDB)
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  {noteCount} {noteCount === 1 ? 'note' : 'notes'} stored locally
                </p>
                {storageInfo && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {formatBytes(storageInfo.usage)} used of {formatBytes(storageInfo.quota)} available
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowClearModal(true)}
              >
                <Trash2 size={14} />
                Clear All Local Data
              </Button>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                This will permanently delete all notes stored in your browser.
              </p>
            </div>
          </div>
        </section>

        {/* Google Drive */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
            Google Drive
          </h2>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-4">
            {isConnected ? (
              <>
                <div className="flex items-start gap-3">
                  <Cloud size={18} className="text-[var(--color-success)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      ✓ Connected
                    </p>
                    {driveState.userEmail && (
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                        {driveState.userEmail}
                      </p>
                    )}
                    {driveState.folderId && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Syncing to WriteBox folder
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDisconnectModal(true)}
                >
                  <CloudOff size={14} />
                  Disconnect
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <CloudOff size={18} className="text-[var(--color-text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Not connected
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                      Your notes are saved locally. Connect Google Drive to sync notes across devices.
                    </p>
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={handleConnectDrive}>
                  <Cloud size={14} />
                  Connect Google Drive
                </Button>
              </>
            )}
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
            About
          </h2>
          <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">WriteBox</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
              Offline-first note-taking with optional Google Drive sync.
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Version 1.0.0
            </p>
          </div>
        </section>
      </div>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear All Data"
      >
        <p className="text-sm text-[var(--color-text-secondary)] mb-2">
          Are you sure you want to delete all locally stored notes?
        </p>
        <p className="text-sm text-[var(--color-error)] mb-6">
          This action cannot be undone. Notes synced to Google Drive will not be affected.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowClearModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearData}>
            Clear All Data
          </Button>
        </div>
      </Modal>

      {/* Disconnect Modal */}
      <Modal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        title="Disconnect Google Drive"
      >
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Your notes will remain saved locally. Files already synced to Google Drive will not be deleted.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDisconnectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>
      </Modal>
    </div>
  );
}
