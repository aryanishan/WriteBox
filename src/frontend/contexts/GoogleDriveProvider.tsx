'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';
import type { GoogleDriveState } from '@/shared/types/settings';
import { LS_KEYS } from '@/shared/constants';

interface GoogleDriveContextValue {
  driveState: GoogleDriveState;
  isConnected: boolean;
  setDriveState: (state: GoogleDriveState) => void;
  connect: (data: {
    accessToken: string;
    tokenExpiresAt: number;
    userEmail?: string;
    userName?: string;
    folderId?: string;
  }) => void;
  disconnect: () => void;
  setFolderId: (folderId: string) => void;
  updateToken: (accessToken: string, expiresAt: number) => void;
}

const GoogleDriveContext = createContext<GoogleDriveContextValue | undefined>(undefined);
const DRIVE_STATE_EVENT = 'writebox-drive-state-change';
const DISCONNECTED_DRIVE_STATE: GoogleDriveState = { isConnected: false };
let cachedDriveState = DISCONNECTED_DRIVE_STATE;
let cachedDriveStateRaw: string | null | undefined;

function loadDriveState(): GoogleDriveState {
  try {
    const stored = localStorage.getItem(LS_KEYS.GOOGLE_DRIVE);
    if (stored === cachedDriveStateRaw) return cachedDriveState;
    cachedDriveStateRaw = stored;
    if (stored) {
      const parsed = JSON.parse(stored) as GoogleDriveState;
      // Check if token is expired
      if (parsed.tokenExpiresAt && Date.now() > parsed.tokenExpiresAt) {
        // Token expired, but keep connection info — will refresh
        cachedDriveState = { ...parsed, accessToken: undefined };
        return cachedDriveState;
      }
      cachedDriveState = parsed;
      return cachedDriveState;
    }
  } catch {
    // Ignore parse errors
  }
  cachedDriveState = DISCONNECTED_DRIVE_STATE;
  return cachedDriveState;
}

function subscribeToDriveState(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(DRIVE_STATE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(DRIVE_STATE_EVENT, callback);
  };
}

function saveDriveState(state: GoogleDriveState) {
  try {
    const serialized = JSON.stringify(state);
    cachedDriveState = state;
    cachedDriveStateRaw = serialized;
    localStorage.setItem(LS_KEYS.GOOGLE_DRIVE, serialized);
    window.dispatchEvent(new Event(DRIVE_STATE_EVENT));
  } catch {
    // Storage full or unavailable
  }
}

export function GoogleDriveProvider({ children }: { children: React.ReactNode }) {
  const driveState = useSyncExternalStore(
    subscribeToDriveState,
    loadDriveState,
    () => DISCONNECTED_DRIVE_STATE
  );

  const setDriveState = useCallback((state: GoogleDriveState) => {
    saveDriveState(state);
  }, []);

  const connect = useCallback(
    (data: {
      accessToken: string;
      tokenExpiresAt: number;
      userEmail?: string;
      userName?: string;
      folderId?: string;
    }) => {
      const newState: GoogleDriveState = {
        isConnected: true,
        accessToken: data.accessToken,
        tokenExpiresAt: data.tokenExpiresAt,
        userEmail: data.userEmail,
        userName: data.userName,
        folderId: data.folderId,
      };
      setDriveState(newState);
    },
    [setDriveState]
  );

  const disconnect = useCallback(() => {
    const newState: GoogleDriveState = { isConnected: false };
    setDriveState(newState);
  }, [setDriveState]);

  const setFolderId = useCallback(
    (folderId: string) => {
      const newState = { ...driveState, folderId };
      setDriveState(newState);
    },
    [driveState, setDriveState]
  );

  const updateToken = useCallback(
    (accessToken: string, expiresAt: number) => {
      const newState = { ...driveState, accessToken, tokenExpiresAt: expiresAt };
      setDriveState(newState);
    },
    [driveState, setDriveState]
  );

  return (
    <GoogleDriveContext.Provider
      value={{
        driveState,
        isConnected: driveState.isConnected,
        setDriveState,
        connect,
        disconnect,
        setFolderId,
        updateToken,
      }}
    >
      {children}
    </GoogleDriveContext.Provider>
  );
}

export function useGoogleDrive() {
  const ctx = useContext(GoogleDriveContext);
  if (!ctx) throw new Error('useGoogleDrive must be used within GoogleDriveProvider');
  return ctx;
}
