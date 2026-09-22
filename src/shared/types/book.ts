import type { SyncStatus } from './note';

export interface Book {
  /** Unique local ID (UUID v4) */
  id: string;

  /** Book title */
  title: string;

  /** Unix timestamp (ms) when the book was created */
  createdAt: number;

  /** Unix timestamp (ms) when the book was last modified locally */
  updatedAt: number;

  /** Soft delete flag */
  isDeleted: boolean;

  /** Current sync status */
  syncStatus: SyncStatus;

  /** The Supabase auth user ID who owns this book */
  userId?: string;

  /** Unix timestamp (ms) of the last successful sync to Supabase cloud */
  cloudSyncedAt?: number;
}

export interface Chapter {
  /** Unique local ID (UUID v4) */
  id: string;

  /** Foreign key to Book */
  bookId: string;

  /** Chapter title */
  title: string;

  /** Unix timestamp (ms) when the chapter was created */
  createdAt: number;

  /** Unix timestamp (ms) when the chapter was last modified locally */
  updatedAt: number;

  /** Soft delete flag */
  isDeleted: boolean;

  /** Current sync status */
  syncStatus: SyncStatus;

  /** The Supabase auth user ID who owns this chapter */
  userId?: string;

  /** Unix timestamp (ms) of the last successful sync to Supabase cloud */
  cloudSyncedAt?: number;
}
