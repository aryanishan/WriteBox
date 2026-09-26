import { useState, useCallback, useEffect } from 'react';

export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close context menu on scroll
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => closeMenu();
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen, closeMenu]);

  return {
    isOpen,
    position,
    handleContextMenu,
    closeMenu,
  };
}
