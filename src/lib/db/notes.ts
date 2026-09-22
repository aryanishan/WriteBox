import { db } from './dexie';
import type { Note, NoteFilter, SyncStatus } from '@/shared/types/note';
import type { JSONContent } from '@tiptap/react';
import { generateId, extractPlainText } from '@/shared/utils';

// ── Create ──────────────────────────────────────────────────────────

export async function createNote(
  title: string = 'Untitled',
  content: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }
): Promise<Note> {
  const now = Date.now();
  const note: Note = {
    id: generateId(),
    title,
    content,
    plainTextContent: extractPlainText(content),
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    isDeleted: false,
    syncStatus: 'local',
  };

  await db.notes.add(note);
  return note;
}

// ── Read ────────────────────────────────────────────────────────────

export async function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id);
}

export async function getAllNotes(): Promise<Note[]> {
  const all = await db.notes.toArray();
  return all
    .filter(n => !n.isDeleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNotesByFilter(filter: NoteFilter): Promise<Note[]> {
  const allRaw = await db.notes.toArray();
  const notes = allRaw.filter(n => !n.isDeleted);

  let filtered: Note[];

  switch (filter) {
    case 'favorites':
      filtered = notes.filter(n => n.isFavorite);
      break;
    case 'recent':
      // Notes updated in the last 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = notes.filter(n => n.updatedAt >= weekAgo);
      break;
    case 'all':
    default:
      filtered = notes;
  }

  // Sort by updatedAt descending
  return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Update ──────────────────────────────────────────────────────────

export async function updateNote(
  id: string,
  updates: Partial<Pick<Note, 'title' | 'content' | 'isFavorite'>>
): Promise<void> {
  const patchData: Partial<Note> = {
    ...updates,
    updatedAt: Date.now(),
  };

  // Recompute plain text if content changed
  if (updates.content) {
    patchData.plainTextContent = extractPlainText(updates.content);
  }

  // If note was synced and now modified locally, mark as modified
  const existingNote = await db.notes.get(id);
  if (existingNote && existingNote.syncStatus === 'synced') {
    patchData.syncStatus = 'modified';
  }

  await db.notes.update(id, patchData);
}

export async function toggleFavorite(id: string): Promise<void> {
  const note = await db.notes.get(id);
  if (note) {
    await db.notes.update(id, {
      isFavorite: !note.isFavorite,
      updatedAt: Date.now(),
    });
  }
}

// ── Delete ──────────────────────────────────────────────────────────

/** Soft delete — sets isDeleted flag */
export async function deleteNote(id: string): Promise<void> {
  await db.notes.update(id, {
    isDeleted: true,
    updatedAt: Date.now(),
  });
}

/** Permanent delete — removes from IndexedDB entirely */
export async function permanentlyDeleteNote(id: string): Promise<void> {
  await db.notes.delete(id);
}

// ── Duplicate ───────────────────────────────────────────────────────

export async function duplicateNote(id: string): Promise<Note | null> {
  const original = await db.notes.get(id);
  if (!original) return null;

  const now = Date.now();
  const duplicate: Note = {
    ...original,
    id: generateId(),
    title: `${original.title} (copy)`,
    createdAt: now,
    updatedAt: now,
    isFavorite: false,
    syncStatus: 'local',
    driveFileId: undefined,
    driveSyncedAt: undefined,
    driveModifiedTime: undefined,
  };

  await db.notes.add(duplicate);
  return duplicate;
}

// ── Search ──────────────────────────────────────────────────────────

export async function searchNotes(query: string): Promise<Note[]> {
  const q = query.toLowerCase().trim();
  if (!q) return getAllNotes();

  const raw = await db.notes.toArray();
  const allNotes = raw.filter(n => !n.isDeleted);

  return allNotes
    .filter(
      note =>
        note.title.toLowerCase().includes(q) ||
        note.plainTextContent.toLowerCase().includes(q)
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

// ── Sync Status ─────────────────────────────────────────────────────

export async function updateSyncStatus(
  id: string,
  syncStatus: SyncStatus,
  driveFileId?: string,
  driveSyncedAt?: number,
  driveModifiedTime?: string
): Promise<void> {
  const updates: Partial<Note> = { syncStatus };

  if (driveFileId !== undefined) updates.driveFileId = driveFileId;
  if (driveSyncedAt !== undefined) updates.driveSyncedAt = driveSyncedAt;
  if (driveModifiedTime !== undefined) updates.driveModifiedTime = driveModifiedTime;

  await db.notes.update(id, updates);
}

// ── Storage Info ────────────────────────────────────────────────────

export async function getNoteCount(): Promise<number> {
  const all = await db.notes.toArray();
  return all.filter(n => !n.isDeleted).length;
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return null;
}

export async function clearAllNotes(): Promise<void> {
  await db.notes.clear();
}
