'use client';

import React from 'react';
import { Plus, PenLine } from 'lucide-react';
import { Button } from '@/frontend/components/ui/Button';

interface SidebarHeaderProps {
  onNewNote: () => void;
}

export function SidebarHeader({ onNewNote }: SidebarHeaderProps) {
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
