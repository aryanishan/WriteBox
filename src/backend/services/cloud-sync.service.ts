import { createClient } from '@/lib/supabase/client';
import { db } from '@/lib/db/dexie';
import type { Note } from '@/shared/types/note';
import type { Book, Chapter } from '@/shared/types/book';

/**
 * Cloud Sync Service — syncs notes, books, and chapters between local Dexie and Supabase Postgres.
 * Strategy: **last-write-wins** based on `updatedAt` timestamp.
 */

interface CloudNote {
  id: string;
  user_id: string;
  chapter_id: string | null;
  title: string;
  content: Record<string, unknown>;
  plain_text_content: string;
  is_favorite: boolean;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

interface CloudBook {
  id: string;
  user_id: string;
  title: string;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

interface CloudChapter {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  is_deleted: boolean;
  created_at: number;
  updated_at: number;
}

function toCloudBook(book: Book, userId: string): CloudBook {
  return {
    id: book.id,
    user_id: userId,
    title: book.title,
    is_deleted: book.isDeleted,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  };
}

function toLocalBook(row: CloudBook): Book {
  return {
    id: row.id,
    title: row.title,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    userId: row.user_id,
    cloudSyncedAt: Date.now(),
  };
}

function toCloudChapter(chapter: Chapter, userId: string): CloudChapter {
  return {
    id: chapter.id,
    book_id: chapter.bookId,
    user_id: userId,
    title: chapter.title,
    is_deleted: chapter.isDeleted,
    created_at: chapter.createdAt,
    updated_at: chapter.updatedAt,
  };
}

function toLocalChapter(row: CloudChapter): Chapter {
  return {
    id: row.id,
    bookId: row.book_id,
    title: row.title,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: 'synced',
    userId: row.user_id,
    cloudSyncedAt: Date.now(),
  };
}

function toCloudNote(note: Note, userId: string): CloudNote {
  return {
    id: note.id,
    user_id: userId,
    chapter_id: note.chapterId || null,
    title: note.title,
    content: note.content as unknown as Record<string, unknown>,
    plain_text_content: note.plainTextContent,
    is_favorite: note.isFavorite,
    is_deleted: note.isDeleted,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

function toLocalNote(row: CloudNote): Note {
  return {
    id: row.id,
    title: row.title,
    chapterId: row.chapter_id || undefined,
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

export async function pushNotesToCloud(userId: string): Promise<number> {
  const supabase = createClient();
  const now = Date.now();
  let pushedCount = 0;

  // 1. Push Books
  const localBooks = await db.books.toArray();
  if (localBooks.length > 0) {
    const { error } = await supabase.from('books').upsert(localBooks.map(b => toCloudBook(b, userId)), { onConflict: 'id' });
    if (error) throw new Error(error.message);
    await db.transaction('rw', db.books, async () => {
      for (const book of localBooks) {
        await db.books.update(book.id, { syncStatus: 'synced', userId, cloudSyncedAt: now });
      }
    });
    pushedCount += localBooks.length;
  }

  // 2. Push Chapters
  const localChapters = await db.chapters.toArray();
  if (localChapters.length > 0) {
    const { error } = await supabase.from('chapters').upsert(localChapters.map(c => toCloudChapter(c, userId)), { onConflict: 'id' });
    if (error) throw new Error(error.message);
    await db.transaction('rw', db.chapters, async () => {
      for (const chapter of localChapters) {
        await db.chapters.update(chapter.id, { syncStatus: 'synced', userId, cloudSyncedAt: now });
      }
    });
    pushedCount += localChapters.length;
  }

  // 3. Push Notes
  const localNotes = await db.notes.toArray();
  if (localNotes.length > 0) {
    const { error } = await supabase.from('notes').upsert(localNotes.map(n => toCloudNote(n, userId)), { onConflict: 'id' });
    if (error) throw new Error(error.message);
    await db.transaction('rw', db.notes, async () => {
      for (const note of localNotes) {
        await db.notes.update(note.id, { syncStatus: 'synced', userId, cloudSyncedAt: now });
      }
    });
    pushedCount += localNotes.length;
  }

  return pushedCount;
}

export async function pullNotesFromCloud(userId: string): Promise<number> {
  const supabase = createClient();
  let mergedCount = 0;
  const now = Date.now();

  // 1. Pull Books
  const { data: booksData, error: booksError } = await supabase.from('books').select('*').eq('user_id', userId);
  if (booksError) throw new Error(booksError.message);
  if (booksData) {
    await db.transaction('rw', db.books, async () => {
      for (const row of booksData as CloudBook[]) {
        const local = await db.books.get(row.id);
        if (!local || row.updated_at > local.updatedAt) {
          const updated = toLocalBook(row);
          if (!local) await db.books.add(updated);
          else await db.books.update(row.id, updated as any);
          mergedCount++;
        }
      }
    });
  }

  // 2. Pull Chapters
  const { data: chaptersData, error: chaptersError } = await supabase.from('chapters').select('*').eq('user_id', userId);
  if (chaptersError) throw new Error(chaptersError.message);
  if (chaptersData) {
    await db.transaction('rw', db.chapters, async () => {
      for (const row of chaptersData as CloudChapter[]) {
        const local = await db.chapters.get(row.id);
        if (!local || row.updated_at > local.updatedAt) {
          const updated = toLocalChapter(row);
          if (!local) await db.chapters.add(updated);
          else await db.chapters.update(row.id, updated as any);
          mergedCount++;
        }
      }
    });
  }

  // 3. Pull Notes
  const { data: notesData, error: notesError } = await supabase.from('notes').select('*').eq('user_id', userId);
  if (notesError) throw new Error(notesError.message);
  if (notesData) {
    await db.transaction('rw', db.notes, async () => {
      for (const row of notesData as CloudNote[]) {
        const local = await db.notes.get(row.id);
        if (!local || row.updated_at > local.updatedAt) {
          const updated = toLocalNote(row);
          if (!local) await db.notes.add(updated);
          else await db.notes.update(row.id, updated as any);
          mergedCount++;
        }
      }
    });
  }

  return mergedCount;
}

export async function fullSync(userId: string): Promise<{ pulled: number; pushed: number }> {
  const pulled = await pullNotesFromCloud(userId);
  const pushed = await pushNotesToCloud(userId);
  return { pulled, pushed };
}

export async function syncSingleNote(userId: string, noteId: string): Promise<void> {
  const supabase = createClient();
  const note = await db.notes.get(noteId);
  if (!note) return;
  const row = toCloudNote(note, userId);
  const { error } = await supabase.from('notes').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  await db.notes.update(noteId, { syncStatus: 'synced', userId, cloudSyncedAt: Date.now() });
}

export async function deleteNoteFromCloud(userId: string, noteId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}
