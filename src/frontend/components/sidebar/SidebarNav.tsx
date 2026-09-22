'use client';

import React from 'react';
import { FileText, Star, Clock } from 'lucide-react';
import { cn } from '@/shared/utils';
import type { NoteFilter } from '@/shared/types/note';

interface SidebarNavProps {
  activeFilter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
}

const navItems: { filter: NoteFilter; label: string; icon: React.ReactNode }[] = [
  { filter: 'all', label: 'All Notes', icon: <FileText size={16} /> },
  { filter: 'favorites', label: 'Favorites', icon: <Star size={16} /> },
  { filter: 'recent', label: 'Recently Edited', icon: <Clock size={16} /> },
];

export function SidebarNav({ activeFilter, onFilterChange }: SidebarNavProps) {
  return (
    <nav className="px-3 py-3 border-b border-[var(--color-border)]">
      {navItems.map(item => (
        <button
          key={item.filter}
          onClick={() => onFilterChange(item.filter)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors duration-[var(--transition-fast)] cursor-pointer',
            activeFilter === item.filter
              ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-medium'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}
