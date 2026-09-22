import type { JSONContent } from '@tiptap/react';

export type SyncStatus = 'local' | 'synced' | 'modified' | 'syncing' | 'error';

export interface Note {
  /** Unique local ID (UUID v4) */
  id: string;

  /** Note title */
  title: string;

  /** Tiptap JSON content */
  content: JSONContent;

  /** Plain text extracted from content — used for search indexing */
  plainTextContent: string;

  /** Unix timestamp (ms) when the note was created */
  createdAt: number;

  /** Unix timestamp (ms) when the note was last modified locally */
  updatedAt: number;

  /** Whether the note is marked as a favorite */
  isFavorite: boolean;

  /** Soft delete flag — note is hidden but recoverable */
  isDeleted: boolean;

  /** Foreign key to Chapter (optional) */
  chapterId?: string;

  // ── Google Drive sync fields (all optional) ──────────────────────

  /** The Google Drive file ID for this note (set after first sync) */
  driveFileId?: string;

  /** Unix timestamp (ms) of the last successful sync to Drive */
  driveSyncedAt?: number;

  /** Google Drive's modifiedTime string — used for conflict detection */
  driveModifiedTime?: string;

  /** Current sync status */
  syncStatus: SyncStatus;

  // ── Supabase cloud sync fields (all optional) ────────────────────
  
  /** The Supabase auth user ID who owns this note */
  userId?: string;

  /** Unix timestamp (ms) of the last successful sync to Supabase cloud */
  cloudSyncedAt?: number;
}

export type NoteFilter = 'all' | 'favorites' | 'recent';

export type NoteSortField = 'updatedAt' | 'createdAt' | 'title';

export type NoteSortOrder = 'asc' | 'desc';

export interface NoteExport {
  id: string;
  title: string;
  content: JSONContent;
  plainTextContent: string;
  createdAt: string;
  updatedAt: string;
}
