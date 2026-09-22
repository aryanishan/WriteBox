import { updateNote, updateSyncStatus } from '@/lib/db/notes';
import { db } from '@/lib/db/dexie';
import type { Note } from '@/shared/types/note';
import type { GoogleDriveState } from '@/shared/types/settings';
import { sanitizeFileName } from '@/shared/utils';

/**
 * Sync a note to Google Drive.
 *
 * Flow:
 * 1. If note has no driveFileId → CREATE new file
 * 2. If note has driveFileId → UPDATE existing file (never duplicate)
 *
 * Returns the updated driveFileId and modifiedTime.
 */
export async function syncNoteToDrive(
  note: Note,
  driveState: GoogleDriveState,
  options: { force?: boolean } = {}
): Promise<{
  success: boolean;
  conflict?: boolean;
  driveFileId?: string;
  modifiedTime?: string;
  error?: string;
}> {
  if (!driveState.isConnected || !driveState.accessToken) {
    return { success: false, error: 'Google Drive is not connected' };
  }

  if (!driveState.folderId) {
    return { success: false, error: 'WriteBox folder not found. Please reconnect Google Drive.' };
  }

  // Mark as syncing
  await updateSyncStatus(note.id, 'syncing');

  try {
    const content = JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      plainTextContent: note.plainTextContent,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      isFavorite: note.isFavorite,
    });

    const fileName = sanitizeFileName(note.title) || 'untitled';

    if (note.driveFileId) {
      // ── UPDATE existing file ──────────────────────────────────
      const res = await fetch('/api/google-drive/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: driveState.accessToken,
          fileId: note.driveFileId,
          content,
          fileName,
          knownModifiedTime: options.force ? undefined : note.driveModifiedTime,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        await updateSyncStatus(note.id, 'error');
        return { success: false, error: data.error || 'Update failed' };
      }

      if (data.conflict) {
        await updateSyncStatus(note.id, 'modified');
        return {
          success: false,
          conflict: true,
          error: data.message,
        };
      }

      // Update sync metadata in IndexedDB
      const now = Date.now();
      await updateSyncStatus(
        note.id,
        'synced',
        note.driveFileId,
        now,
        data.modifiedTime
      );

      return {
        success: true,
        driveFileId: note.driveFileId,
        modifiedTime: data.modifiedTime,
      };
    } else {
      // ── CREATE new file ───────────────────────────────────────
      const res = await fetch('/api/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: driveState.accessToken,
          folderId: driveState.folderId,
          fileName,
          content,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        await updateSyncStatus(note.id, 'error');
        return { success: false, error: data.error || 'Sync failed' };
      }

      // Store Drive file ID in IndexedDB
      const now = Date.now();
      await updateSyncStatus(
        note.id,
        'synced',
        data.fileId,
        now,
        data.modifiedTime
      );

      return {
        success: true,
        driveFileId: data.fileId,
        modifiedTime: data.modifiedTime,
      };
    }
  } catch (error) {
    console.error('Sync error:', error);
    await updateSyncStatus(note.id, 'error');
    return {
      success: false,
      error: 'Network error. Your note is still saved locally.',
    };
  }
}

/** Replaces a local note with the current Drive version after a conflict. */
export async function pullNoteFromDrive(
  note: Note,
  driveState: GoogleDriveState
): Promise<{ success: boolean; error?: string }> {
  if (!driveState.accessToken || !note.driveFileId) {
    return { success: false, error: 'This note is not linked to a Google Drive file.' };
  }
  try {
    const response = await fetch('/api/google-drive/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: driveState.accessToken, fileId: note.driveFileId }),
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Unable to download the Drive version.' };
    const remote = JSON.parse(data.content) as Pick<Note, 'title' | 'content' | 'isFavorite' | 'plainTextContent'>;
    if (!remote.content || typeof remote.title !== 'string') {
      return { success: false, error: 'The Google Drive file is not a valid WriteBox note.' };
    }
    await updateNote(note.id, { title: remote.title, content: remote.content, isFavorite: Boolean(remote.isFavorite) });
    await updateSyncStatus(note.id, 'synced', note.driveFileId, Date.now(), data.modifiedTime);
    return { success: true };
  } catch (error) {
    console.error('Drive pull error:', error);
    return { success: false, error: 'Unable to download the Drive version.' };
  }
}

/**
 * Initialize the WriteBox folder in Google Drive.
 */
export async function initDriveFolder(
  accessToken: string
): Promise<{ folderId?: string; error?: string }> {
  try {
    const res = await fetch('/api/google-drive/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Failed to create folder' };
    }

    return { folderId: data.folderId };
  } catch (error) {
    console.error('Folder init error:', error);
    return { error: 'Network error while setting up Google Drive folder' };
  }
}

/**
 * Exchange OAuth code for tokens via the API route.
 */
export async function exchangeAuthCode(
  code: string
): Promise<{
  accessToken?: string;
  expiryDate?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/google-drive/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error || 'Authentication failed' };
    }

    return {
      accessToken: data.access_token,
      expiryDate: data.expiry_date,
    };
  } catch (error) {
    console.error('Auth code exchange error:', error);
    return { error: 'Network error during authentication' };
  }
}

/**
 * Get all notes that need syncing (modified after last sync).
 */
export async function getModifiedNotes(): Promise<Note[]> {
  return db.notes
    .where('syncStatus')
    .equals('modified')
    .toArray();
}
