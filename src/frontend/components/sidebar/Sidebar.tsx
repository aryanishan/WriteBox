'use client';

import React from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useNotes } from '@/frontend/hooks/useNotes';
import { createNote } from '@/lib/db/notes';
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { NoteList } from './NoteList';
import type { NoteFilter } from '@/shared/types/note';
import { cn } from '@/shared/utils';

interface SidebarProps {
  activeFilter: NoteFilter;
  onFilterChange: (filter: NoteFilter) => void;
}

export function Sidebar({ activeFilter, onFilterChange }: SidebarProps) {
  const { sidebarOpen, setSelectedNoteId, setSidebarOpen } = useAppState();
  const notes = useNotes(activeFilter);

  const handleNewNote = async () => {
    const note = await createNote();
    setSelectedNoteId(note.id);
    // Close sidebar on mobile after selecting
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:relative z-40 top-0 left-0 h-full flex flex-col',
          'w-[var(--sidebar-width)] bg-[var(--sidebar-bg)] border-r border-[var(--color-border)]',
          'transition-transform duration-300 ease-in-out',
          'md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarHeader onNewNote={handleNewNote} />
        <SidebarNav activeFilter={activeFilter} onFilterChange={onFilterChange} />
        <NoteList notes={notes} onSelectNote={handleSelectNote} />
      </aside>
    </>
  );
}
