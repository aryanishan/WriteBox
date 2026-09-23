'use client';

import { useRef, useCallback, useEffect } from 'react';
import { updateNote } from '@/lib/db/notes';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useGoogleDrive } from '@/frontend/contexts/GoogleDriveProvider';
import { syncNoteToDrive } from '@/lib/google-drive/sync';
import { db } from '@/lib/db/dexie';
import { AUTOSAVE_DEBOUNCE_MS } from '@/shared/constants';
import type { JSONContent } from '@tiptap/react';

/**
 * Debounced autosave hook.
 * Saves title + content to IndexedDB after a configurable delay.
 * Shows save status in the UI via AppState context.
 */
export function useAutoSave(noteId: string | null) {
  const { setSaveStatus } = useAppState();
  const { driveState } = useGoogleDrive();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title?: string; content?: JSONContent } | null>(null);

  const save = useCallback(
    async (updates: { title?: string; content?: JSONContent }) => {
      if (!noteId) return;

      try {
        setSaveStatus('saving');
        await updateNote(noteId, updates);
        setSaveStatus('saved');

        // Background sync to Google Drive
        if (driveState.isConnected && driveState.accessToken) {
          db.notes.get(noteId).then(note => {
            if (note) syncNoteToDrive(note, driveState).catch(console.error);
          });
        }

        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (error) {
        console.error('Autosave failed:', error);
        setSaveStatus('error');
      }
    },
    [noteId, setSaveStatus, driveState]
  );

  const debouncedSave = useCallback(
    (updates: { title?: string; content?: JSONContent }) => {
      // Merge with any pending updates
      pendingRef.current = {
        ...pendingRef.current,
        ...updates,
      };

      setSaveStatus('saving');

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set new timer
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          save(pendingRef.current);
          pendingRef.current = null;
        }
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [save, setSaveStatus]
  );

  // Save immediately (for Ctrl+S)
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (pendingRef.current && noteId) {
      await save(pendingRef.current);
      pendingRef.current = null;
    }
  }, [noteId, save]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { debouncedSave, saveNow };
}
