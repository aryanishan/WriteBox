'use client';

import React from 'react';
import { ThemeProvider } from '@/frontend/contexts/ThemeProvider';
import { GoogleDriveProvider } from '@/frontend/contexts/GoogleDriveProvider';
import { AppStateProvider } from '@/frontend/contexts/AppStateProvider';
import { AuthProvider } from '@/frontend/contexts/AuthProvider';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <GoogleDriveProvider>
          <AppStateProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '13px',
                },
              }}
            />
          </AppStateProvider>
        </GoogleDriveProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

