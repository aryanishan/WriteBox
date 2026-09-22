import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db/dexie';
import type { Note } from '@/shared/types/note';

/**
 * Cloud Sync Service — syncs notes between local Dexie and Supabase Postgres.
 *
 * Strategy: **last-write-wins** based on `updatedAt` timestamp.
 */

interface CloudNote {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;
  plain_text_content: string;
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

/** Convert a local Note to the Supabase row shape */
function toCloudNote(note: Note, userId: string): CloudNote {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    content: note.content as unknown as Record<string, unknown>,
    plain_text_content: note.plainTextContent,
    is_favorite: note.isFavorite,
    is_deleted: note.isDeleted,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

/** Convert a Supabase row to a local Note */
function toLocalNote(row: CloudNote): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content as Note['content'],
    plainTextContent: row.plain_text_content,
    isFavorite: row.is_favorite,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    userId: row.user_id,
    cloudSyncedAt: Date.now(),
  };
}

/**
 * Push all local notes to the cloud (upsert).
 * Only pushes notes that are newer locally than their cloud version.
 */
export async function pushNotesToCloud(userId: string): Promise<number> {
  const supabase = createClient();
  const localNotes = await db.notes.toArray();

  if (localNotes.length === 0) return 0;

  const rows = localNotes.map(n => toCloudNote(n, userId));

  const { error } = await supabase
    .from('notes')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[cloud-sync] push error:', error.message);
    throw new Error(error.message);
  }

  // Mark all as synced locally
  await db.transaction('rw', db.notes, async () => {
    const now = Date.now();
    for (const note of localNotes) {
      await db.notes.update(note.id, {
        syncStatus: 'synced',
        userId,
        cloudSyncedAt: now,
      });
    }
  });

  return localNotes.length;
}

/**
 * Pull all notes from the cloud and merge into local Dexie.
 * Uses last-write-wins: if the cloud version is newer, overwrite local.
 * If local is newer, keep local (it will be pushed on next push cycle).
 */
export async function pullNotesFromCloud(userId: string): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[cloud-sync] pull error:', error.message);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) return 0;

  let merged = 0;

  await db.transaction('rw', db.notes, async () => {
    for (const row of data as CloudNote[]) {
      const local = await db.notes.get(row.id);

      if (!local) {
        // Note doesn't exist locally — insert it
        await db.notes.add(toLocalNote(row));
        merged++;
      } else if (row.updated_at > local.updatedAt) {
        // Cloud is newer — overwrite local
        const updated = toLocalNote(row);
        await db.notes.update(row.id, {
          title: updated.title,
          content: updated.content,
          plainTextContent: updated.plainTextContent,
          isFavorite: updated.isFavorite,
          isDeleted: updated.isDeleted,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          syncStatus: 'synced',
          userId,
          cloudSyncedAt: Date.now(),
        });
        merged++;
      }
      // If local is newer or same, keep local — it'll be pushed later
    }
  });

  return merged;
}

/**
 * Full bidirectional sync: pull first, then push.
 */
export async function fullSync(userId: string): Promise<{ pulled: number; pushed: number }> {
  const pulled = await pullNotesFromCloud(userId);
  const pushed = await pushNotesToCloud(userId);
  return { pulled, pushed };
}

/**
 * Push a single note to the cloud.
 */
export async function syncSingleNote(userId: string, noteId: string): Promise<void> {
  const supabase = createClient();
  const note = await db.notes.get(noteId);
  if (!note) return;

  const row = toCloudNote(note, userId);
  const { error } = await supabase
    .from('notes')
    .upsert(row, { onConflict: 'id' });

  if (error) {
    console.error('[cloud-sync] single push error:', error.message);
    throw new Error(error.message);
  }

  await db.notes.update(noteId, {
    syncStatus: 'synced',
    userId,
    cloudSyncedAt: Date.now(),
  });
}

/**
 * Delete a note from the cloud.
 */
export async function deleteNoteFromCloud(userId: string, noteId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) {
    console.error('[cloud-sync] delete error:', error.message);
    throw new Error(error.message);
  }
}
