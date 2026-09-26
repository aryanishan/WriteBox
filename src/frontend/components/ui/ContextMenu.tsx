import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/shared/utils';

export interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  children: React.ReactNode;
}

export function ContextMenu({ isOpen, onClose, x, y, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Simple adjustment for screen boundaries
  let top = y;
  let left = x;
  
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) {
      left = x - rect.width;
    }
    if (y + rect.height > window.innerHeight) {
      top = y - rect.height;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-lg overflow-hidden flex flex-col py-1"
      style={{ top: `${top}px`, left: `${left}px`, minWidth: '160px' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

export interface ContextMenuItemProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function ContextMenuItem({ label, icon, onClick, className }: ContextMenuItemProps) {
  return (
    <button
      className={cn(
        'w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] transition-colors',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon && <span className="text-[var(--color-text-muted)] w-4 flex justify-center">{icon}</span>}
      {label}
    </button>
  );
}
