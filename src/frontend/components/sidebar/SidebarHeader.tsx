'use client';

import React from 'react';
import { Plus, PenLine } from 'lucide-react';
import { Button } from '@/frontend/components/ui/Button';
import { useAuth } from '@/frontend/contexts/AuthProvider';
import { useRouter } from 'next/navigation';

interface SidebarHeaderProps {
  onNewNote: () => void;
}

export function SidebarHeader({ onNewNote }: SidebarHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();

  const initials = user
    ? user.displayName
      ? user.displayName
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : user.email[0].toUpperCase()
    : null;

  return (
    <div className="px-4 py-4 border-b border-[var(--color-border)]">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center">
          <PenLine size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-[var(--color-text-primary)]">
          WriteBox
        </span>
      </div>

      {/* User info or sign-in prompt */}
      {user ? (
        <div className="flex items-center gap-2.5 mb-3 px-1">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)] shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
              {user.displayName ?? user.email}
            </p>
            {user.displayName && (
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                {user.email}
              </p>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => router.push('/auth/login')}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 mb-3 rounded-[var(--radius-md)] text-xs text-[var(--color-accent)] bg-[var(--color-accent-light)] hover:bg-[var(--color-accent)] hover:text-white transition-colors cursor-pointer"
        >
          Sign in to sync
        </button>
      )}

      {/* New Note Button */}
      <Button
        variant="primary"
        size="md"
        className="w-full"
        onClick={onNewNote}
      >
        <Plus size={16} />
        New Note
      </Button>
    </div>
  );
}

