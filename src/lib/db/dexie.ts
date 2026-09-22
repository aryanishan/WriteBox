import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '@/shared/types/note';

import type { Book, Chapter } from '@/shared/types/book';

/**
 * WriteBox IndexedDB database via Dexie.
 *
 * Schema:
 *   notes — primary note storage
 *   books — user books
 *   chapters — chapters within books
 */
class WriteBoxDB extends Dexie {
  notes!: EntityTable<Note, 'id'>;
  books!: EntityTable<Book, 'id'>;
  chapters!: EntityTable<Chapter, 'id'>;

  constructor() {
    super('WriteBoxDB');

    this.version(1).stores({
      notes: 'id, title, updatedAt, createdAt, isFavorite, isDeleted, syncStatus',
    });

    this.version(2).stores({
      notes: 'id, title, updatedAt, createdAt, isFavorite, isDeleted, syncStatus, userId, cloudSyncedAt',
    });

    this.version(3).stores({
      notes: 'id, title, updatedAt, createdAt, isFavorite, isDeleted, syncStatus, userId, cloudSyncedAt, chapterId',
      books: 'id, title, updatedAt, createdAt, isDeleted, syncStatus, userId, cloudSyncedAt',
      chapters: 'id, bookId, title, updatedAt, createdAt, isDeleted, syncStatus, userId, cloudSyncedAt',
    });
  }
}

/** Singleton database instance */
export const db = new WriteBoxDB();
