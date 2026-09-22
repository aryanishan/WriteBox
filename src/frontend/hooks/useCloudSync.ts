'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/frontend/contexts/AuthProvider';
import { fullSync } from '@/backend/services/cloud-sync.service';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface UseCloudSyncReturn {
  syncStatus: CloudSyncStatus;
  lastSyncedAt: number | null;
  syncNow: () => Promise<void>;
  error: string | null;
}

/**
 * Hook that manages automatic cloud sync with Supabase.
 *
 * - Syncs when the user logs in
 * - Syncs when the app regains focus (visibility change)
 * - Exposes `syncNow` for manual sync
 */
export function useCloudSync(): UseCloudSyncReturn {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  const doSync = useCallback(async () => {
    if (!user || syncingRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    syncingRef.current = true;
    setSyncStatus('syncing');
    setError(null);

    try {
      await fullSync(user.id);
      setLastSyncedAt(Date.now());
      setSyncStatus('synced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setError(msg);
      setSyncStatus('error');
      console.error('[useCloudSync]', msg);
    } finally {
      syncingRef.current = false;
    }
  }, [user]);

  // Sync when user logs in (userId changes)
  useEffect(() => {
    if (!user) {
      setSyncStatus('idle');
      setLastSyncedAt(null);
      prevUserIdRef.current = null;
      return;
    }

    if (prevUserIdRef.current !== user.id) {
      prevUserIdRef.current = user.id;
      void doSync();
    }
  }, [user, doSync]);

  // Sync on visibility change (user comes back to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void doSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, doSync]);

  // Listen for online/offline
  useEffect(() => {
    const handleOnline = () => {
      if (user) void doSync();
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, doSync]);

  const syncNow = useCallback(async () => {
    await doSync();
  }, [doSync]);

  return { syncStatus, lastSyncedAt, syncNow, error };
}
