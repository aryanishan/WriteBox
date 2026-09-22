import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import type { Book, Chapter } from '@/shared/types/book';
import type { Note } from '@/shared/types/note';

export function useBooks() {
  const books = useLiveQuery(async () => {
    return (await db.books.toArray()).filter(b => !b.isDeleted).sort((a, b) => b.updatedAt - a.updatedAt);
  });
  return books ?? [];
}

export function useChapters(bookId: string) {
  const chapters = useLiveQuery(async () => {
    return (await db.chapters.where({ bookId }).toArray()).filter(c => !c.isDeleted).sort((a, b) => a.createdAt - b.createdAt);
  }, [bookId]);
  return chapters ?? [];
}

export function useChapterNotes(chapterId: string) {
  const notes = useLiveQuery(async () => {
    const all = await db.notes.toArray();
    return all.filter(n => n.chapterId === chapterId && !n.isDeleted).sort((a, b) => a.createdAt - b.createdAt);
  }, [chapterId]);
  return notes ?? [];
}
