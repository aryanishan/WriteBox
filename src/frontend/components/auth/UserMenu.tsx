'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/frontend/contexts/AuthProvider';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LogOut,
  RefreshCw,
  User,
  ChevronDown,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { cn } from '@/shared/utils';

interface UserMenuProps {
  /** Cloud sync status label */
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  /** Last successful sync timestamp */
  lastSyncedAt?: number | null;
  /** Trigger a manual sync */
  onSyncNow?: () => void;
}

export function UserMenu({ syncStatus = 'idle', lastSyncedAt, onSyncNow }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast.success('Signed out');
    router.push('/auth/login');
  };

  const handleSyncNow = () => {
    onSyncNow?.();
    setOpen(false);
  };

  if (!user) return null;

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'synced'
        ? 'Synced'
        : syncStatus === 'error'
          ? 'Sync error'
          : syncStatus === 'offline'
            ? 'Offline'
            : 'Sync';

  const formatLastSync = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return `${Math.floor(diff / 3_600_000)}h ago`;
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer',
          'hover:bg-[var(--color-bg-hover)]',
          open && 'bg-[var(--color-bg-hover)]'
        )}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName ?? user.email}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-[10px] font-bold text-white">
            {initials}
          </div>
        )}
        <ChevronDown
          size={14}
          className={cn(
            'text-[var(--color-text-muted)] transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg animate-fade-in z-50 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {user.displayName && (
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {user.displayName}
                  </p>
                )}
                <p className="text-xs text-[var(--color-text-tertiary)] truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Sync section */}
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                {syncStatus === 'syncing' ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : syncStatus === 'error' || syncStatus === 'offline' ? (
                  <CloudOff size={12} className="text-[var(--color-warning)]" />
                ) : (
                  <Cloud size={12} className="text-[var(--color-success)]" />
                )}
                {syncLabel}
              </div>
              {onSyncNow && (
                <button
                  onClick={handleSyncNow}
                  disabled={syncStatus === 'syncing'}
                  className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:opacity-50 cursor-pointer"
                >
                  Sync Now
                </button>
              )}
            </div>
            {lastSyncedAt && (
              <p className="text-[10px] text-[var(--color-text-muted)]">
                Last synced {formatLastSync(lastSyncedAt)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Shown when the user is NOT logged in — a compact sign-in prompt.
 */
export function SignInButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/auth/login')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
    >
      <User size={16} />
      <span className="hidden sm:inline">Sign In</span>
    </button>
  );
}
