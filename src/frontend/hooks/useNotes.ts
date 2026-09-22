'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Note, NoteFilter } from '@/shared/types/note';

/**
 * Reactive hook for note lists. Re-renders automatically when IndexedDB changes.
 */
export function useNotes(filter: NoteFilter = 'all') {
  const notes = useLiveQuery(async () => {
    const allNotes = await db.notes
      .toArray()
      .then(notes => notes.filter(n => !n.isDeleted && !n.chapterId));

    let filtered: Note[];

    switch (filter) {
      case 'favorites':
        filtered = allNotes.filter(n => n.isFavorite);
        break;
      case 'recent': {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        filtered = allNotes.filter(n => n.updatedAt >= weekAgo);
        break;
      }
      case 'all':
      default:
        filtered = allNotes;
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filter]);

  return notes ?? [];
}

/**
 * Reactive hook for a single note by ID.
 */
export function useNote(id: string | null) {
  const note = useLiveQuery(
    async () => {
      if (!id) return null;
      return db.notes.get(id);
    },
    [id]
  );

  return note ?? null;
}
