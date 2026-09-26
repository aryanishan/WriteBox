import React from 'react';
import { ContextMenu } from './ContextMenu';

interface AppearanceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  x: number;
  y: number;
  onBgColorSelect: (color: string | undefined) => void;
  onTextColorSelect: (color: string | undefined) => void;
}

const BG_COLORS = [
  { label: 'Default', value: undefined },
  { label: 'Red', value: '#fee2e2' }, // light red
  { label: 'Orange', value: '#ffedd5' },
  { label: 'Yellow', value: '#fef3c7' },
  { label: 'Green', value: '#dcfce7' },
  { label: 'Blue', value: '#dbeafe' },
  { label: 'Purple', value: '#f3e8ff' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Gray', value: '#f3f4f6' },
];

const TEXT_COLORS = [
  { label: 'Default', value: undefined },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Orange', value: '#c2410c' },
  { label: 'Yellow', value: '#a16207' },
  { label: 'Green', value: '#15803d' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Purple', value: '#7e22ce' },
  { label: 'Pink', value: '#be185d' },
  { label: 'Gray', value: '#374151' },
];

export function AppearanceMenu({ isOpen, onClose, x, y, onBgColorSelect, onTextColorSelect }: AppearanceMenuProps) {
  if (!isOpen) return null;

  return (
    <ContextMenu isOpen={isOpen} onClose={onClose} x={x} y={y}>
      <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase">
        Background Color
      </div>
      <div className="grid grid-cols-5 gap-1 px-3 pb-2">
        {BG_COLORS.map(color => (
          <button
            key={color.label}
            className="w-6 h-6 rounded-full border border-[var(--color-border)] hover:scale-110 transition-transform"
            style={{ backgroundColor: color.value || 'transparent' }}
            title={color.label}
            onClick={() => {
              onBgColorSelect(color.value);
              onClose();
            }}
          >
            {!color.value && <span className="block w-full h-full rounded-full bg-[linear-gradient(45deg,transparent_45%,#cbd5e1_45%,#cbd5e1_55%,transparent_55%)]" />}
          </button>
        ))}
      </div>
      
      <div className="border-t border-[var(--color-border)] my-1" />
      
      <div className="px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase">
        Text Color
      </div>
      <div className="grid grid-cols-5 gap-1 px-3 pb-2">
        {TEXT_COLORS.map(color => (
          <button
            key={color.label}
            className="w-6 h-6 rounded-full border border-[var(--color-border)] hover:scale-110 transition-transform flex items-center justify-center font-serif italic text-sm"
            style={{ color: color.value || 'var(--color-text-primary)' }}
            title={color.label}
            onClick={() => {
              onTextColorSelect(color.value);
              onClose();
            }}
          >
            A
          </button>
        ))}
      </div>
    </ContextMenu>
  );
}
