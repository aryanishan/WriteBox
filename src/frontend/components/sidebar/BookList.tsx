'use client';

import React, { useState } from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useBooks, useChapters, useChapterNotes } from '@/frontend/hooks/useBooks';
import { createBook, createChapter, deleteBook, deleteChapter } from '@/lib/db/books';
import { createNote, deleteNote } from '@/lib/db/notes';
import { ChevronRight, ChevronDown, Plus, Book as BookIcon, Folder, FileText, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/shared/utils';

export function BookList() {
  const books = useBooks();
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});

  const handleCreateBook = async () => {
    const title = window.prompt('Enter book name:', 'New Book');
    if (title) {
      const book = await createBook(title);
      setExpandedBooks(prev => ({ ...prev, [book.id]: true }));
    }
  };

  return (
    <div className="flex flex-col mt-4">
      <div className="flex items-center justify-between px-4 py-2 group">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Books
        </h3>
        <button
          onClick={handleCreateBook}
          className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all cursor-pointer rounded hover:bg-[var(--color-bg-hover)]"
          title="New Book"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {books.map(book => (
          <BookItem
            key={book.id}
            book={book}
            isExpanded={!!expandedBooks[book.id]}
            onToggle={() => setExpandedBooks(prev => ({ ...prev, [book.id]: !prev[book.id] }))}
            onExpand={() => setExpandedBooks(prev => ({ ...prev, [book.id]: true }))}
          />
        ))}
        {books.length === 0 && (
          <div className="px-4 py-2 text-xs text-[var(--color-text-muted)] italic">
            No books yet.
          </div>
        )}
      </div>
    </div>
  );
}

function BookItem({ book, isExpanded, onToggle, onExpand }: { book: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const chapters = useChapters(book.id);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const handleAddChapter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = window.prompt('Enter chapter name:', 'New Chapter');
    if (title) {
      await createChapter(book.id, title);
      onExpand(); // ensure book is open
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete book "${book.title}" and all its chapters/notes?`)) {
      await deleteBook(book.id);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] cursor-pointer group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[var(--color-text-tertiary)] shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <BookIcon size={14} className="text-[var(--color-text-muted)] shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{book.title}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={handleAddChapter} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Add Chapter">
            <Plus size={14} />
          </button>
          <button onClick={handleDeleteBook} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Book">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col ml-4 border-l border-[var(--color-border)] pl-1 mt-0.5">
          {chapters.map(chapter => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isExpanded={!!expandedChapters[chapter.id]}
              onToggle={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
              onExpand={() => setExpandedChapters(prev => ({ ...prev, [chapter.id]: true }))}
            />
          ))}
          {chapters.length === 0 && (
            <div className="px-4 py-1 text-xs text-[var(--color-text-muted)] italic">No chapters</div>
          )}
        </div>
      )}
    </div>
  );
}

function ChapterItem({ chapter, isExpanded, onToggle, onExpand }: { chapter: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const notes = useChapterNotes(chapter.id);
  const { selectedNoteId, setSelectedNoteId, setSidebarOpen } = useAppState();

  const handleAddNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const note = await createNote('Untitled Note');
    // We must hack it to attach the chapter ID since createNote doesn't take it currently.
    // Or we can import db and update it, wait let's use a cleaner way.
    // I will write it directly here for now, but really createNote should accept chapterId.
    const { db } = await import('@/lib/db/dexie');
    await db.notes.update(note.id, { chapterId: chapter.id });
    setSelectedNoteId(note.id);
    onExpand();
  };

  const handleDeleteChapter = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete chapter "${chapter.title}" and its notes?`)) {
      await deleteChapter(chapter.id);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-bg-hover)] cursor-pointer group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[var(--color-text-tertiary)] shrink-0">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <Folder size={14} className="text-[var(--color-text-muted)] shrink-0" />
          <span className="text-sm text-[var(--color-text-secondary)] truncate">{chapter.title}</span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <button onClick={handleAddNote} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Add Note">
            <Plus size={14} />
          </button>
          <button onClick={handleDeleteChapter} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Chapter">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col ml-4 border-l border-[var(--color-border)] pl-1 mt-0.5">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => {
                setSelectedNoteId(note.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 rounded-[var(--radius-md)] cursor-pointer group',
                selectedNoteId === note.id
                  ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                  : 'hover:bg-[var(--color-bg-hover)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileText size={12} className="shrink-0" />
                <span className="text-xs truncate">{note.title || 'Untitled'}</span>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (window.confirm('Delete note?')) {
                    await deleteNote(note.id);
                    if (selectedNoteId === note.id) setSelectedNoteId(null);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[var(--color-error-bg)] rounded hover:text-[var(--color-error)] shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <div className="px-4 py-1 text-[10px] text-[var(--color-text-muted)] italic">No notes</div>
          )}
        </div>
      )}
    </div>
  );
}
