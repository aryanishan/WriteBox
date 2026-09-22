import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Trash2, RotateCcw, Palette } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: Point[];
}

const COLORS = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];

export function DrawingComponent(props: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { node, updateAttributes, deleteNode } = props;
  const lines = (node.attrs.lines as Stroke[]) || [];

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [currentLine, setCurrentLine] = useState<Stroke | null>(null);
  const [showColors, setShowColors] = useState(false);

  // Redraw all lines when lines or currentLine changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const allLines = [...lines];
    if (currentLine) {
      allLines.push(currentLine);
    }

    allLines.forEach((line) => {
      if (line.points.length === 0) return;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;

      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        // Simple quadratic bezier for smoother lines could be added here,
        // but straight lines to many points is usually fine for handwritten notes
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });
  }, [lines, currentLine]);

  useEffect(() => {
    redraw();
    
    // Handle resize
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Prevent drag and drop of the whole node while drawing
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentLine({
      color,
      width: 3,
      points: [getCoordinates(e)],
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentLine) return;
    
    setCurrentLine({
      ...currentLine,
      points: [...currentLine.points, getCoordinates(e)],
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!isDrawing || !currentLine) return;
    setIsDrawing(false);

    // Save to TipTap document
    const newLines = [...lines, currentLine];
    updateAttributes({ lines: newLines });
    setCurrentLine(null);
  };

  const clearCanvas = () => {
    updateAttributes({ lines: [] });
  };

  return (
    <NodeViewWrapper className="my-6 relative group" data-drag-handle>
      <div 
        ref={containerRef}
        className="relative w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        
        {/* Internal Toolbar */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-raised)] border border-[var(--color-border)] p-1 rounded-[var(--radius-md)] shadow-sm">
          
          <div className="relative">
            <button
              onClick={() => setShowColors(!showColors)}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Change Color"
            >
              <Palette size={16} style={{ color }} />
            </button>
            
            {showColors && (
              <div className="absolute top-full right-0 mt-1 flex gap-1 p-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-md">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setShowColors(false); }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-gray-400" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
            title="Clear Canvas"
          >
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-4 bg-[var(--color-border)] mx-1" />
          <button
            onClick={deleteNode}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors"
            title="Delete Drawing"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
