import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { File, Download, X } from 'lucide-react';
import React from 'react';

export const FileAttachmentComponent = ({ node, deleteNode }: NodeViewProps) => {
  const { src, filename, size } = node.attrs;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename;
    a.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode();
  };

  return (
    <NodeViewWrapper className="file-attachment-wrapper my-4">
      <div 
        className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] cursor-pointer transition-colors max-w-sm group"
        onClick={handleDownload}
        title="Click to download"
      >
        <div className="p-2 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-md shrink-0">
          <File size={24} />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate" title={filename}>
            {filename}
          </p>
          {size && <p className="text-xs text-[var(--color-text-tertiary)]">{size}</p>}
        </div>
        <div className="text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0">
          <div className="p-1 hover:bg-[var(--color-bg-primary)] rounded">
            <Download size={18} />
          </div>
          <button 
            onClick={handleRemove}
            className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded transition-colors opacity-0 group-hover:opacity-100"
            title="Remove file"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
};
