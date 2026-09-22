import Dexie, { type EntityTable } from 'dexie';
import type { Note } from '@/shared/types/note';

/**
 * WriteBox IndexedDB database via Dexie.
 *
 * Schema:
 *   notes — primary note storage
 *     id (PK), title, updatedAt, createdAt, isFavorite, isDeleted, syncStatus
 *
 * We only index fields that we query/sort on.
 */
class WriteBoxDB extends Dexie {
  notes!: EntityTable<Note, 'id'>;

  constructor() {
    super('WriteBoxDB');

    this.version(1).stores({
      notes: 'id, title, updatedAt, createdAt, isFavorite, isDeleted, syncStatus',
    });
  }
}

/** Singleton database instance */
export const db = new WriteBoxDB();
