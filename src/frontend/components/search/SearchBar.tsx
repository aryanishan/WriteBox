'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchNotes } from '@/lib/db/notes';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { formatRelativeTime, getContentPreview } from '@/shared/utils';
import { Search, X, FileText, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';
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
      setQuery('');
      setResults([]);
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={() => setSearchOpen(false)}
      />

      {/* Search Panel */}
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl animate-slide-up"
        style={{
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--color-border)',
        }}
      >
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Search
            size={20}
            className="shrink-0"
            style={{ color: 'var(--color-accent)' }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your notes…"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1,
              fontSize: '16px',
              lineHeight: '1.5',
              background: 'transparent',
              color: 'var(--color-text-primary)',
              border: 'none',
              outline: 'none',
              padding: 0,
              margin: 0,
              caretColor: 'var(--color-accent)',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="shrink-0 cursor-pointer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-muted)',
                border: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-bg-tertiary)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <X size={14} />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              fontFamily: 'inherit',
              lineHeight: '1.6',
              color: 'var(--color-text-muted)',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--color-border)' }} />

        {/* Results */}
        {query.trim() && (
          <div className="overflow-y-auto" style={{ maxHeight: '340px', padding: '6px' }}>
            {results.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '14px',
                }}
              >
                <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No notes found for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: '6px 12px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {results.length} {results.length === 1 ? 'result' : 'results'}
                </div>
                {results.map((note, index) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelect(note)}
                    className="cursor-pointer"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: index === selectedIndex ? 'var(--color-accent-light)' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => {
                      setSelectedIndex(index);
                      if (index !== selectedIndex) {
                        e.currentTarget.style.background = 'var(--color-bg-hover)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (index !== selectedIndex) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div
                      style={{
                        marginTop: '2px',
                        padding: '6px',
                        borderRadius: '8px',
                        background: index === selectedIndex ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                        color: index === selectedIndex ? 'white' : 'var(--color-text-muted)',
                        flexShrink: 0,
                        transition: 'all 0.12s',
                      }}
                    >
                      <FileText size={14} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {note.title || 'Untitled'}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-tertiary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                        }}
                      >
                        {getContentPreview(note.plainTextContent, 70)}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: 'var(--color-text-muted)',
                          marginTop: '3px',
                        }}
                      >
                        {formatRelativeTime(note.updatedAt)}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <div
                        className="hidden sm:flex"
                        style={{
                          alignItems: 'center',
                          alignSelf: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CornerDownLeft size={10} />
                        open
                      </div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!query.trim() && (
          <div
            style={{
              padding: '32px 20px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <div style={{ fontSize: '13px', marginBottom: '16px' }}>
              Type to search across all your notes
            </div>
            <div
              className="hidden sm:flex"
              style={{
                justifyContent: 'center',
                gap: '12px',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                opacity: 0.7,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ArrowUp size={11} />
                <ArrowDown size={11} />
                navigate
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <CornerDownLeft size={11} />
                open
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <kbd
                  style={{
                    padding: '1px 5px',
                    fontSize: '10px',
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                  }}
                >
                  esc
                </kbd>
                close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
