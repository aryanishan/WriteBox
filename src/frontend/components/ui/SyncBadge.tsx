'use client';

import React from 'react';
import { cn } from '@/shared/utils';
import type { SyncStatus } from '@/shared/types/note';
import {
  Check,
  AlertTriangle,
  RefreshCw,
  XCircle,
  HardDrive,
} from 'lucide-react';

interface SyncBadgeProps {
  status: SyncStatus;
  className?: string;
  showLabel?: boolean;
}

const statusConfig: Record<
  SyncStatus,
  { icon: React.ReactNode; label: string; color: string }
> = {
  local: {
    icon: <HardDrive size={12} />,
    label: 'Saved locally',
    color: 'text-[var(--color-text-tertiary)]',
  },
  synced: {
    icon: <Check size={12} />,
    label: 'Synced',
    color: 'text-[var(--color-success)]',
  },
  modified: {
    icon: <AlertTriangle size={12} />,
    label: 'Changes not synced',
    color: 'text-[var(--color-warning)]',
  },
  syncing: {
    icon: <RefreshCw size={12} className="animate-spin" />,
    label: 'Syncing...',
    color: 'text-[var(--color-info)]',
  },
  error: {
    icon: <XCircle size={12} />,
    label: 'Sync failed',
    color: 'text-[var(--color-error)]',
  },
};

export function SyncBadge({ status, className, showLabel = true }: SyncBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        config.color,
        className
      )}
      title={config.label}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
