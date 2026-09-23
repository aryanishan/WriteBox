'use client';

import React, { useState } from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { useBooks, useChapters, useChapterNotes } from '@/frontend/hooks/useBooks';
import { createBook, createChapter, deleteBook, deleteChapter } from '@/lib/db/books';
import { createNote, deleteNote } from '@/lib/db/notes';
import { ChevronRight, ChevronDown, Plus, Book as BookIcon, Folder, FileText, Trash2 } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Modal } from '@/frontend/components/ui/Modal';
import { Button } from '@/frontend/components/ui/Button';

export function BookList() {
  const books = useBooks();
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('New Book');

  const handleCreateBook = async () => {
    if (newBookTitle.trim()) {
      const book = await createBook(newBookTitle.trim());
      setExpandedBooks(prev => ({ ...prev, [book.id]: true }));
    }
    setShowCreateModal(false);
    setNewBookTitle('New Book');
  };

  return (
    <div className="flex flex-col mt-4">
      <div className="flex items-center justify-between px-4 py-2 group">
        <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Books
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Book">
        <input
          type="text"
          value={newBookTitle}
          onChange={e => setNewBookTitle(e.target.value)}
          placeholder="Book Name"
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm mb-4 outline-none focus:border-[var(--color-accent)]"
          onKeyDown={e => e.key === 'Enter' && handleCreateBook()}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateBook}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}

function BookItem({ book, isExpanded, onToggle, onExpand }: { book: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const chapters = useChapters(book.id);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const [showChapterModal, setShowChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('New Chapter');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAddChapter = async () => {
    if (newChapterTitle.trim()) {
      await createChapter(book.id, newChapterTitle.trim());
      onExpand(); // ensure book is open
    }
    setShowChapterModal(false);
    setNewChapterTitle('New Chapter');
  };

  const handleDeleteBook = async () => {
    await deleteBook(book.id);
    setShowDeleteModal(false);
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
          <button onClick={(e) => { e.stopPropagation(); setShowChapterModal(true); }} className="p-1 hover:bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Add Chapter">
            <Plus size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Book">
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

      <Modal isOpen={showChapterModal} onClose={() => setShowChapterModal(false)} title="Create Chapter">
        <input
          type="text"
          value={newChapterTitle}
          onChange={e => setNewChapterTitle(e.target.value)}
          placeholder="Chapter Name"
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] text-sm mb-4 outline-none focus:border-[var(--color-accent)]"
          onKeyDown={e => e.key === 'Enter' && handleAddChapter()}
          autoFocus
        />
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowChapterModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddChapter}>Create</Button>
        </div>
      </Modal>

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Book">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete "{book.title}" and all its chapters/notes?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteBook}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

function ChapterItem({ chapter, isExpanded, onToggle, onExpand }: { chapter: any; isExpanded: boolean; onToggle: () => void; onExpand: () => void }) {
  const notes = useChapterNotes(chapter.id);
  const { selectedNoteId, setSelectedNoteId, setSidebarOpen } = useAppState();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState<string | null>(null);

  const handleAddNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const note = await createNote('Untitled Note');
    const { db } = await import('@/lib/db/dexie');
    await db.notes.update(note.id, { chapterId: chapter.id });
    setSelectedNoteId(note.id);
    onExpand();
  };

  const handleDeleteChapter = async () => {
    await deleteChapter(chapter.id);
    setShowDeleteModal(false);
  };

  const handleDeleteNote = async () => {
    if (showDeleteNoteModal) {
      await deleteNote(showDeleteNoteModal);
      if (selectedNoteId === showDeleteNoteModal) setSelectedNoteId(null);
    }
    setShowDeleteNoteModal(null);
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
          <button onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }} className="p-1 hover:bg-[var(--color-error-bg)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete Chapter">
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteNoteModal(note.id);
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

      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Chapter">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete "{chapter.title}" and its notes?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteChapter}>Delete</Button>
        </div>
      </Modal>

      <Modal isOpen={!!showDeleteNoteModal} onClose={() => setShowDeleteNoteModal(null)} title="Delete Note">
        <p className="text-sm text-[var(--color-text-secondary)] mb-6">
          Are you sure you want to delete this note?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeleteNoteModal(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteNote}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
