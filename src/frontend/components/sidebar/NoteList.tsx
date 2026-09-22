'use client';

import React from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { formatRelativeTime, getContentPreview, cn } from '@/shared/utils';
import { SyncBadge } from '@/frontend/components/ui/SyncBadge';
import type { Note } from '@/shared/types/note';
import { Star } from 'lucide-react';

interface NoteListProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
}

export function NoteList({ notes, onSelectNote }: NoteListProps) {
  const { selectedNoteId } = useAppState();

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-[var(--color-text-muted)] text-center">
          No notes found
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 py-2">
      {notes.map(note => (
        <button
          key={note.id}
          onClick={() => onSelectNote(note.id)}
          className={cn(
            'w-full text-left px-3 py-3 rounded-[var(--radius-md)] mb-0.5 transition-all duration-[var(--transition-fast)] cursor-pointer group',
            selectedNoteId === note.id
              ? 'bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20'
              : 'hover:bg-[var(--color-bg-hover)] border border-transparent'
          )}
        >
          {/* Title row */}
          <div className="flex items-center gap-1.5 mb-1">
            {note.isFavorite && (
              <Star size={12} className="text-[var(--color-warning)] fill-[var(--color-warning)] shrink-0" />
            )}
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {note.title || 'Untitled'}
            </span>
          </div>

          {/* Preview */}
          <p className="text-xs text-[var(--color-text-tertiary)] truncate mb-1.5">
            {getContentPreview(note.plainTextContent) || 'Empty note'}
          </p>

          {/* Footer: time + sync status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {formatRelativeTime(note.updatedAt)}
            </span>
            <SyncBadge status={note.syncStatus} showLabel={false} />
          </div>
        </button>
      ))}
    </div>
  );
}
