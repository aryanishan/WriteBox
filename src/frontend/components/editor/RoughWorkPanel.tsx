import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useAppState } from '@/frontend/contexts/AppStateProvider';
import { X, Pencil, Type, MousePointer2, Trash2, Eraser, Undo, Redo, Palette } from 'lucide-react';
import { cn } from '@/shared/utils';

interface Point { x: number; y: number; }
interface Stroke { color: string; width: number; points: Point[]; isEraser?: boolean; }
interface TextItem { id: string; x: number; y: number; text: string; color: string; fontSize: number; }
interface StateSnapshot { lines: Stroke[]; texts: TextItem[]; pageColor: string; }

export function RoughWorkPanel() {
  const { roughWorkOpen, setRoughWorkOpen } = useAppState();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [mode, setMode] = useState<'draw' | 'text' | 'select' | 'erase'>('draw');
  const [textColor, setTextColor] = useState('#000000');
  
  const [history, setHistory] = useState<StateSnapshot[]>([{ lines: [], texts: [], pageColor: '#ffffff' }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const { lines, texts, pageColor } = history[historyIndex] || { lines: [], texts: [], pageColor: '#ffffff' };
  
  const [currentLine, setCurrentLine] = useState<Stroke | null>(null);
  
  const [activeTextInput, setActiveTextInput] = useState<{ x: number; y: number; text: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<Point | null>(null);
  const [selectionImgData, setSelectionImgData] = useState<{ src: string; x: number; y: number; w: number; h: number } | null>(null);

  const pushState = useCallback((partialState: Partial<StateSnapshot>) => {
    const currentState = history[historyIndex];
    const newState = { ...currentState, ...partialState };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = () => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  };

  // Focus text input when it appears
  useEffect(() => {
    if (activeTextInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [activeTextInput]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const allLines = [...lines];
    if (currentLine) allLines.push(currentLine);

    allLines.forEach((line) => {
      if (line.points.length === 0) return;
      ctx.strokeStyle = line.isEraser ? '#000000' : line.color;
      ctx.lineWidth = line.isEraser ? 20 : line.width;
      ctx.globalCompositeOperation = line.isEraser ? 'destination-out' : 'source-over';
      
      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);
      if (line.points.length === 1) {
        ctx.lineTo(line.points[0].x, line.points[0].y);
      } else {
        for (let i = 1; i < line.points.length - 1; i++) {
          const xc = (line.points[i].x + line.points[i + 1].x) / 2;
          const yc = (line.points[i].y + line.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(line.points[i].x, line.points[i].y, xc, yc);
        }
        ctx.lineTo(line.points[line.points.length - 1].x, line.points[line.points.length - 1].y);
      }
      ctx.stroke();
    });
    
    ctx.globalCompositeOperation = 'source-over';

    // Draw text
    ctx.textBaseline = 'top';
    texts.forEach(t => {
      ctx.font = `${t.fontSize}px sans-serif`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });

    // Draw selection box
    if (isSelecting && selectionStart && selectionCurrent) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectionStart.x,
        selectionStart.y,
        selectionCurrent.x - selectionStart.x,
        selectionCurrent.y - selectionStart.y
      );
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        selectionStart.x,
        selectionStart.y,
        selectionCurrent.x - selectionStart.x,
        selectionCurrent.y - selectionStart.y
      );
    }
  }, [lines, currentLine, texts, isSelecting, selectionStart, selectionCurrent]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  const getCoordinates = (e: React.PointerEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeTextInput) {
      commitText();
    }
    setSelectionImgData(null);

    const coords = getCoordinates(e);

    if (mode === 'draw' || mode === 'erase') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDrawing(true);
      setCurrentLine({
        color: textColor,
        width: mode === 'erase' ? 20 : 3,
        points: [coords],
        isEraser: mode === 'erase'
      });
    } else if (mode === 'text') {
      setActiveTextInput({ x: coords.x, y: coords.y, text: '' });
    } else if (mode === 'select') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsSelecting(true);
      setSelectionStart(coords);
      setSelectionCurrent(coords);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(e);
    
    if ((mode === 'draw' || mode === 'erase') && isDrawing && currentLine) {
      setCurrentLine({
        ...currentLine,
        points: [...currentLine.points, coords],
      });
    } else if (mode === 'select' && isSelecting) {
      setSelectionCurrent(coords);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if ((mode === 'draw' || mode === 'erase') && isDrawing && currentLine) {
      setIsDrawing(false);
      pushState({ lines: [...lines, currentLine] });
      setCurrentLine(null);
    } else if (mode === 'select' && isSelecting && selectionStart && selectionCurrent) {
      setIsSelecting(false);
      
      const x = Math.min(selectionStart.x, selectionCurrent.x);
      const y = Math.min(selectionStart.y, selectionCurrent.y);
      const w = Math.abs(selectionCurrent.x - selectionStart.x);
      const h = Math.abs(selectionCurrent.y - selectionStart.y);
      
      setSelectionStart(null);
      setSelectionCurrent(null);
      
      if (w > 10 && h > 10) {
        captureSelection(x, y, w, h);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'select') return;
    setMode('select');
    setSelectionImgData(null);
  };

  const captureSelection = (x: number, y: number, w: number, h: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const tempCanvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    tempCanvas.width = w * dpr;
    tempCanvas.height = h * dpr;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;
    
    // Draw background
    tCtx.fillStyle = pageColor;
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Copy pixels from main canvas
    tCtx.drawImage(
      canvas,
      x * dpr, y * dpr, w * dpr, h * dpr,
      0, 0, w * dpr, h * dpr
    );
    
    setSelectionImgData({
      src: tempCanvas.toDataURL('image/png'),
      x, y, w, h
    });
    setMode('draw'); // Reset to draw after selection
  };

  const commitText = () => {
    if (activeTextInput && activeTextInput.text.trim()) {
      pushState({ texts: [...texts, {
        id: Math.random().toString(),
        x: activeTextInput.x,
        y: activeTextInput.y,
        text: activeTextInput.text,
        color: textColor,
        fontSize: 16
      }]});
    }
    setActiveTextInput(null);
  };

  const clearAll = () => {
    pushState({ lines: [], texts: [] });
    setSelectionImgData(null);
    setActiveTextInput(null);
  };

  const handlePageColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pushState({ pageColor: e.target.value });
  };

  if (!roughWorkOpen) return null;

  // Custom pencil cursor
  const cursorStyle = mode === 'draw' 
    ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'></path></svg>") 0 18, auto`
    : mode === 'erase'
    ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21'></path><path d='M22 21H7'></path></svg>") 0 24, auto`
    : mode === 'text' ? 'text' : 'crosshair';

  return (
    <div className="w-[300px] lg:w-[400px] h-full bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] flex flex-col shrink-0 absolute right-0 md:relative z-20 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)] md:shadow-none transition-transform">
      <div className="flex flex-col border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between p-3 pb-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Rough Work</h2>
          <button onClick={() => setRoughWorkOpen(false)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]" title="Close">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 px-3 pb-3 overflow-x-auto no-scrollbar">
          <button onClick={() => setMode('draw')} className={cn("p-1.5 rounded", mode === 'draw' ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} title="Draw">
            <Pencil size={16} />
          </button>
          <button onClick={() => setMode('text')} className={cn("p-1.5 rounded", mode === 'text' ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} title="Text">
            <Type size={16} />
          </button>
          <button onClick={() => setMode('erase')} className={cn("p-1.5 rounded", mode === 'erase' ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} title="Erase">
            <Eraser size={16} />
          </button>
          <button onClick={() => setMode('select')} className={cn("p-1.5 rounded", mode === 'select' ? "bg-[var(--color-bg-hover)] text-[var(--color-accent)]" : "text-[var(--color-text-muted)]")} title="Select & Drag (Double Click Canvas)">
            <MousePointer2 size={16} />
          </button>
          
          <div className="w-px h-4 bg-[var(--color-border)] mx-1 shrink-0" />
          
          <div className="relative flex items-center shrink-0" title="Text/Pen Color">
            <Palette size={14} className="absolute left-1 pointer-events-none text-[var(--color-text-muted)]" />
            <input 
              type="color" 
              value={textColor} 
              onChange={e => setTextColor(e.target.value)} 
              className="w-7 h-7 p-0 border-0 rounded cursor-pointer opacity-0 absolute inset-0"
            />
            <div className="w-6 h-6 rounded ml-1" style={{ backgroundColor: textColor, border: '1px solid var(--color-border)' }} />
          </div>

          <div className="relative flex items-center shrink-0" title="Page Color">
            <div className="w-6 h-6 rounded overflow-hidden relative border border-[var(--color-border)] ml-1">
              <input 
                type="color" 
                value={pageColor} 
                onChange={handlePageColorChange} 
                className="w-10 h-10 -m-2 p-0 border-0 cursor-pointer"
              />
            </div>
          </div>
          
          <div className="w-px h-4 bg-[var(--color-border)] mx-1 shrink-0" />
          
          <button onClick={undo} disabled={historyIndex === 0} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50" title="Undo">
            <Undo size={16} />
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50" title="Redo">
            <Redo size={16} />
          </button>

          <div className="w-px h-4 bg-[var(--color-border)] mx-1 shrink-0" />
          
          <button onClick={clearAll} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-error)]" title="Delete All">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden transition-colors" style={{ backgroundColor: pageColor }} ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ cursor: cursorStyle }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        />
        
        {activeTextInput && (
          <textarea
            ref={textInputRef}
            className="absolute bg-transparent outline-none resize-none overflow-hidden m-0 p-0"
            style={{
              left: activeTextInput.x,
              top: activeTextInput.y,
              color: textColor,
              font: '16px sans-serif',
              lineHeight: 1.2,
              minWidth: '50px',
              minHeight: '20px'
            }}
            value={activeTextInput.text}
            onChange={e => setActiveTextInput({ ...activeTextInput, text: e.target.value })}
            onBlur={commitText}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitText();
              }
            }}
          />
        )}

        {selectionImgData && (
          <img
            src={selectionImgData.src}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/html', `<img src="${selectionImgData.src}" alt="Rough Work Selection" />`);
            }}
            className="absolute border-2 border-dashed border-blue-500 cursor-move"
            style={{
              left: selectionImgData.x,
              top: selectionImgData.y,
              width: selectionImgData.w,
              height: selectionImgData.h,
              opacity: 0.9,
            }}
            alt="Selection"
          />
        )}
      </div>
    </div>
  );
}
