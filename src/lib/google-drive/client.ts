'use client';

import { GOOGLE_SCOPES } from '@/shared/constants';

interface GoogleCodeClient {
  requestCode: () => void;
}

interface GoogleAccounts {
  oauth2: {
    initCodeClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: { code?: string; error?: string; error_description?: string }) => void;
    }) => GoogleCodeClient;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-writebox-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Unable to load Google Identity Services.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.writeboxGis = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

/** Opens the Google OAuth code popup and resolves with the authorization code. */
export async function requestGoogleAuthCode(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId || clientId.startsWith('your_')) {
    throw new Error('Set NEXT_PUBLIC_GOOGLE_CLIENT_ID before connecting Google Drive.');
  }
  await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const client = window.google?.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES.join(' '),
      callback: response => {
        if (response.code) resolve(response.code);
        else reject(new Error(response.error_description || response.error || 'Google authorization was cancelled.'));
      },
    });
    if (!client) {
      reject(new Error('Google Identity Services did not initialize.'));
      return;
    }
    client.requestCode();
  });
}

export async function exchangeGoogleAuthCode(code: string): Promise<{ accessToken: string; expiryDate: number }> {
  const response = await fetch('/api/google-drive/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error || 'Google authentication failed.');
  return { accessToken: data.access_token, expiryDate: data.expiry_date ?? Date.now() + 55 * 60 * 1000 };
}

export async function refreshGoogleAccessToken(): Promise<{ accessToken: string; expiryDate: number }> {
  const response = await fetch('/api/google-drive/refresh', { method: 'POST' });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error || 'Google Drive session has expired.');
  return { accessToken: data.access_token, expiryDate: data.expiry_date ?? Date.now() + 55 * 60 * 1000 };
}
