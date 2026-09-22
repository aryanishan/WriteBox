'use client';

import { useState, useEffect } from 'react';

/**
 * Tracks browser online/offline status reactively.
 * Returns `true` on first render to match SSR and avoid hydration mismatch,
 * then updates to the real value on the client.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true); // default true matches SSR

  useEffect(() => {
    // Set the real value after hydration
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
