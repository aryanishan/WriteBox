'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchNotes } from '@/lib/db/notes';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { formatRelativeTime, getContentPreview } from '@/shared/utils';
import { Search, X, FileText } from 'lucide-react';
import type { Note } from '@/shared/types/note';

export function SearchBar() {
  const { searchOpen, setSearchOpen, setSelectedNoteId, setSidebarOpen } = useAppState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Note[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Search as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim()) {
        const found = await searchNotes(query);
        setResults(found);
        setSelectedIndex(0);
      } else {
        setResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (note: Note) => {
      setSelectedNoteId(note.id);
      setSearchOpen(false);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    [setSelectedNoteId, setSearchOpen, setSidebarOpen]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    },
    [results, selectedIndex, handleSelect, setSearchOpen]
  );

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />

      {/* Search Panel */}
      <div className="relative w-full max-w-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-lg animate-slide-up overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-1 border-b border-[var(--color-border)]">
          <Search size={18} className="text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search notes..."
            className="flex-1 px-1 py-3 text-base bg-transparent text-[var(--color-text-primary)] outline-none border-none ring-0 focus:outline-none focus:ring-0 placeholder:text-[var(--color-text-muted)]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)]"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="ml-1 px-1.5 py-0.5 text-[10px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] rounded border border-[var(--color-border)] hidden sm:inline">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                No notes found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((note, index) => (
                <button
                  key={note.id}
                  onClick={() => handleSelect(note)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-[var(--color-accent-light)]'
                      : 'hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  <FileText size={16} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                      {note.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)] truncate">
                      {getContentPreview(note.plainTextContent, 60)}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {formatRelativeTime(note.updatedAt)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer hint */}
        {!query.trim() && (
          <div className="px-4 py-6 text-center text-xs text-[var(--color-text-muted)]">
            Type to search across all notes
          </div>
        )}
      </div>
    </div>
  );
}
