'use client';

import React from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { formatRelativeTime, getContentPreview, cn } from '@/shared/utils';
import { SyncBadge } from '@/frontend/components/ui/SyncBadge';
import type { Note } from '@/shared/types/note';
import { Star, Trash2 } from 'lucide-react';
import { deleteNote } from '@/lib/db/notes';

import { updateNote } from '@/lib/db/notes';
import { useContextMenu } from '@/frontend/hooks/useContextMenu';
import { AppearanceMenu } from '@/frontend/components/ui/AppearanceMenu';

interface NoteListProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
}

function NoteListItem({ note, onSelectNote }: { note: Note, onSelectNote: (id: string) => void }) {
  const { selectedNoteId, setSelectedNoteId } = useAppState();
  const menu = useContextMenu();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id);
      if (selectedNoteId === note.id) {
        setSelectedNoteId(null);
      }
    }
  };

  const updateColor = async (field: 'backgroundColor' | 'textColor', color: string | undefined) => {
    await updateNote(note.id, { [field]: color });
  };

  return (
    <>
      <button
        onClick={() => onSelectNote(note.id)}
        onContextMenu={menu.handleContextMenu}
        style={{
          backgroundColor: note.backgroundColor,
          color: note.textColor
        }}
        className={cn(
          'w-full text-left px-3 py-3 rounded-[var(--radius-md)] mb-0.5 transition-all duration-[var(--transition-fast)] cursor-pointer group flex flex-col',
          selectedNoteId === note.id && !note.backgroundColor
            ? 'bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20'
            : !note.backgroundColor ? 'hover:bg-[var(--color-bg-hover)] border border-transparent' : 'border border-transparent'
        )}
      >
        {/* Title row */}
        <div className="flex items-center justify-between mb-1 w-full gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {note.isFavorite && (
              <Star size={12} className="text-[var(--color-warning)] fill-[var(--color-warning)] shrink-0" />
            )}
            <span 
              className="text-sm font-medium truncate"
              style={{ color: note.textColor || 'var(--color-text-primary)' }}
            >
              {note.title || 'Untitled'}
            </span>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={handleDelete}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleDelete(e as any);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded transition-all shrink-0 cursor-pointer"
            title="Delete note"
          >
            <Trash2 size={14} />
          </div>
        </div>

        {/* Preview */}
        <p 
          className="text-xs truncate mb-1.5 w-full"
          style={{ color: note.textColor || 'var(--color-text-tertiary)' }}
        >
          {getContentPreview(note.plainTextContent) || 'Empty note'}
        </p>

        {/* Footer: time + sync status */}
        <div className="flex items-center justify-between w-full">
          <span 
            className="text-[10px]"
            style={{ color: note.textColor || 'var(--color-text-muted)' }}
          >
            {formatRelativeTime(note.updatedAt)}
          </span>
          <SyncBadge status={note.syncStatus} showLabel={false} />
        </div>
      </button>

      <AppearanceMenu
        isOpen={menu.isOpen}
        onClose={menu.closeMenu}
        x={menu.position.x}
        y={menu.position.y}
        onBgColorSelect={(color) => updateColor('backgroundColor', color)}
        onTextColorSelect={(color) => updateColor('textColor', color)}
      />
    </>
  );
}

export function NoteList({ notes, onSelectNote }: NoteListProps) {
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
        <NoteListItem key={note.id} note={note} onSelectNote={onSelectNote} />
      ))}
    </div>
  );
}
