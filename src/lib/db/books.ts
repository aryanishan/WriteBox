import { db } from './dexie';
import type { Book, Chapter } from '@/shared/types/book';
import { generateId } from '@/shared/utils';

// ── Books ───────────────────────────────────────────────────────────

export async function createBook(title: string = 'Untitled Book'): Promise<Book> {
  const now = Date.now();
  const book: Book = {
    id: generateId(),
    title,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    syncStatus: 'local',
  };

  await db.books.add(book);
  return book;
}

export async function getBooks(): Promise<Book[]> {
  const all = await db.books.toArray();
  return all.filter(b => !b.isDeleted).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateBook(id: string, updates: Partial<Pick<Book, 'title'>>): Promise<void> {
  const patchData: Partial<Book> = {
    ...updates,
    updatedAt: Date.now(),
  };

  const existing = await db.books.get(id);
  if (existing && existing.syncStatus === 'synced') {
    patchData.syncStatus = 'modified';
  }

  await db.books.update(id, patchData);
}

export async function deleteBook(id: string): Promise<void> {
  await db.books.update(id, {
    isDeleted: true,
    updatedAt: Date.now(),
  });
  
  // Also soft delete all chapters in this book
  const chapters = await db.chapters.where({ bookId: id }).toArray();
  for (const ch of chapters) {
    if (!ch.isDeleted) {
      await deleteChapter(ch.id);
    }
  }
}

// ── Chapters ────────────────────────────────────────────────────────

export async function createChapter(bookId: string, title: string = 'Untitled Chapter'): Promise<Chapter> {
  const now = Date.now();
  const chapter: Chapter = {
    id: generateId(),
    bookId,
    title,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    syncStatus: 'local',
  };

  await db.chapters.add(chapter);
  
  // Update book's updatedAt to trigger re-renders or syncs if needed
  await updateBook(bookId, {});
  
  return chapter;
}

export async function getChapters(bookId: string): Promise<Chapter[]> {
  const all = await db.chapters.where({ bookId }).toArray();
  return all.filter(c => !c.isDeleted).sort((a, b) => a.createdAt - b.createdAt); // Sort by creation time for chapters
}

export async function getAllChapters(): Promise<Chapter[]> {
  const all = await db.chapters.toArray();
  return all.filter(c => !c.isDeleted);
}

export async function updateChapter(id: string, updates: Partial<Pick<Chapter, 'title'>>): Promise<void> {
  const patchData: Partial<Chapter> = {
    ...updates,
    updatedAt: Date.now(),
  };

  const existing = await db.chapters.get(id);
  if (existing && existing.syncStatus === 'synced') {
    patchData.syncStatus = 'modified';
  }

  await db.chapters.update(id, patchData);
}

export async function deleteChapter(id: string): Promise<void> {
  await db.chapters.update(id, {
    isDeleted: true,
    updatedAt: Date.now(),
  });

  // Also soft delete all notes in this chapter
  const notes = await db.notes.toArray();
  const chapterNotes = notes.filter(n => n.chapterId === id && !n.isDeleted);
  for (const note of chapterNotes) {
    await db.notes.update(note.id, {
      isDeleted: true,
      updatedAt: Date.now()
    });
  }
}
