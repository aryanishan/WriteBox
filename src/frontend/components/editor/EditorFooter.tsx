'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { HardDrive, Loader2, Check, AlertCircle } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorFooterProps {
  editor: Editor;
  saveStatus: SaveStatus;
}

export function EditorFooter({ editor, saveStatus }: EditorFooterProps) {
  const chars = editor.storage.characterCount?.characters() ?? 0;
  const words = editor.storage.characterCount?.words() ?? 0;

  const statusConfig: Record<SaveStatus, { icon: React.ReactNode; label: string }> = {
    idle: {
      icon: <HardDrive size={12} className="text-[var(--color-text-muted)]" />,
      label: 'Ready',
    },
    saving: {
      icon: <Loader2 size={12} className="text-[var(--color-info)] animate-spin" />,
      label: 'Saving...',
    },
    saved: {
      icon: <Check size={12} className="text-[var(--color-success)]" />,
      label: 'Saved locally',
    },
    error: {
      icon: <AlertCircle size={12} className="text-[var(--color-error)]" />,
      label: 'Save failed',
    },
  };

  const status = statusConfig[saveStatus];

  return (
    <div className="flex items-center justify-between px-6 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
      {/* Save status */}
      <div className="flex items-center gap-1.5">
        {status.icon}
        <span>{status.label}</span>
      </div>

      {/* Word/char count */}
      <div className="flex items-center gap-3">
        <span>{words.toLocaleString()} words</span>
        <span>{chars.toLocaleString()} characters</span>
      </div>
    </div>
  );
}
