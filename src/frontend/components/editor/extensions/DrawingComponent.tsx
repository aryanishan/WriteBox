import React, { useRef, useEffect, useState, useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Trash2, RotateCcw, Palette, GripHorizontal } from 'lucide-react';
import { cn } from '@/shared/utils';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  width: number;
  points: Point[];
  isEraser?: boolean;
}

const COLORS = [
  '#000000', '#ffffff', '#9ca3af', '#fbcfe8', '#bfdbfe', 
  '#ef4444', '#3b82f6', '#22c55e', '#eab308'
];

export function DrawingComponent(props: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { node, updateAttributes, deleteNode } = props;
  const lines = (node.attrs.lines as Stroke[]) || [];

  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [currentLine, setCurrentLine] = useState<Stroke | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [height, setHeight] = useState(node.attrs.height || 300);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

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
      ctx.globalCompositeOperation = line.isEraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = line.isEraser ? 'rgba(0,0,0,1)' : line.color;
      ctx.lineWidth = line.isEraser ? line.width * 5 : line.width;

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
  }, [redraw, height]);

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
      isEraser: isEraserMode,
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

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    const dy = e.clientY - startY.current;
    const newHeight = Math.max(100, startHeight.current + dy);
    setHeight(newHeight);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    isResizing.current = false;
    updateAttributes({ height });
  };

  return (
    <NodeViewWrapper className="my-6 relative group" data-drag-handle>
      <div 
        ref={containerRef}
        className="relative w-full rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-[height] duration-0"
        style={{ height: `${height}px` }}
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
              onClick={() => {
                setIsEraserMode(false);
                setShowColors(!showColors);
              }}
              className={cn(
                "p-1.5 rounded-[var(--radius-sm)] transition-colors",
                !isEraserMode ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
              )}
              title="Change Color"
            >
              <Palette size={16} style={{ color: !isEraserMode ? color : 'currentColor' }} />
            </button>
            
            {showColors && (
              <div className="absolute top-full right-0 mt-1 flex gap-1 p-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-md flex-wrap w-[120px]">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setIsEraserMode(false); setShowColors(false); }}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === c && !isEraserMode ? "border-gray-400" : "border-[var(--color-border)]"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsEraserMode(true);
              setShowColors(false);
            }}
            className={cn(
              "p-1.5 rounded-[var(--radius-sm)] transition-colors",
              isEraserMode ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]"
            )}
            title="Eraser"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
          </button>

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

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-[var(--color-border)]/50 to-transparent flex items-end justify-center cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <GripHorizontal size={14} className="text-[var(--color-text-tertiary)] mb-0.5" />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
