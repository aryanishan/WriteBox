'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/frontend/contexts/ThemeProvider';
import {
  Pencil, Eraser, Square, Circle, Minus, Download, Trash2,
  Undo2, Redo2, Sun, Moon, ArrowLeft, Paintbrush, Type,
  Highlighter, ArrowUpRight,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */

type Tool = 'pen' | 'brush' | 'highlighter' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text';

interface Point { x: number; y: number }

interface Stroke {
  tool: Tool;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
  fontSize?: number;
  fill?: boolean;
}

/* ─── Constants ──────────────────────────────────────────────────── */

const COLORS = [
  '#1a1a2e', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#6366f1', '#a855f7', '#ec4899', '#78716c',
];

const SIZES: { value: number; label: string }[] = [
  { value: 2, label: '1px' },
  { value: 4, label: '2px' },
  { value: 6, label: '3px' },
  { value: 10, label: '5px' },
  { value: 16, label: '8px' },
  { value: 24, label: '12px' },
];

const SHAPE_TOOLS = new Set<Tool>(['line', 'arrow', 'rect', 'circle']);
const FREEHAND_TOOLS = new Set<Tool>(['pen', 'brush', 'highlighter', 'eraser']);

const TOOL_DEFS: { id: Tool; icon: React.ReactNode; label: string; shortcut: string; group: number }[] = [
  { id: 'pen', icon: <Pencil size={16} />, label: 'Pen', shortcut: 'P', group: 0 },
  { id: 'brush', icon: <Paintbrush size={16} />, label: 'Brush', shortcut: 'B', group: 0 },
  { id: 'highlighter', icon: <Highlighter size={16} />, label: 'Highlighter', shortcut: 'H', group: 0 },
  { id: 'eraser', icon: <Eraser size={16} />, label: 'Eraser', shortcut: 'E', group: 0 },
  { id: 'line', icon: <Minus size={16} />, label: 'Line', shortcut: 'L', group: 1 },
  { id: 'arrow', icon: <ArrowUpRight size={16} />, label: 'Arrow', shortcut: 'A', group: 1 },
  { id: 'rect', icon: <Square size={16} />, label: 'Rectangle', shortcut: 'R', group: 1 },
  { id: 'circle', icon: <Circle size={16} />, label: 'Ellipse', shortcut: 'C', group: 1 },
  { id: 'text', icon: <Type size={16} />, label: 'Text', shortcut: 'T', group: 2 },
];

/* ─── Helpers ────────────────────────────────────────────────────── */

function getEffectiveWidth(tool: Tool, size: number): number {
  if (tool === 'brush') return size * 2.5;
  if (tool === 'highlighter') return size * 4;
  if (tool === 'eraser') return size * 3;
  return size;
}

function drawArrowhead(ctx: CanvasRenderingContext2D, from: Point, to: Point, lineWidth: number) {
  const headLen = Math.max(lineWidth * 3, 12);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 7), to.y - headLen * Math.sin(angle - Math.PI / 7));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 7), to.y - headLen * Math.sin(angle + Math.PI / 7));
  ctx.stroke();
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else if (s.tool === 'highlighter') {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = s.opacity / 100;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
  }
  ctx.lineWidth = s.width;

  if (s.tool === 'text' && s.text && s.startPoint) {
    ctx.font = `${s.fontSize || 18}px 'Inter', system-ui, sans-serif`;
    ctx.fillText(s.text, s.startPoint.x, s.startPoint.y);
  } else if ((s.tool === 'line' || s.tool === 'arrow') && s.startPoint && s.endPoint) {
    ctx.beginPath();
    ctx.moveTo(s.startPoint.x, s.startPoint.y);
    ctx.lineTo(s.endPoint.x, s.endPoint.y);
    ctx.stroke();
    if (s.tool === 'arrow') drawArrowhead(ctx, s.startPoint, s.endPoint, s.width);
  } else if (s.tool === 'rect' && s.startPoint && s.endPoint) {
    const x = Math.min(s.startPoint.x, s.endPoint.x);
    const y = Math.min(s.startPoint.y, s.endPoint.y);
    const w = Math.abs(s.endPoint.x - s.startPoint.x);
    const h = Math.abs(s.endPoint.y - s.startPoint.y);
    if (s.fill) { ctx.fillRect(x, y, w, h); } else { ctx.strokeRect(x, y, w, h); }
  } else if (s.tool === 'circle' && s.startPoint && s.endPoint) {
    const cx = (s.startPoint.x + s.endPoint.x) / 2;
    const cy = (s.startPoint.y + s.endPoint.y) / 2;
    const rx = Math.abs(s.endPoint.x - s.startPoint.x) / 2;
    const ry = Math.abs(s.endPoint.y - s.startPoint.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
    if (s.fill) { ctx.fill(); } else { ctx.stroke(); }
  } else if (s.points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      const prev = s.points[i - 1];
      const curr = s.points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    const last = s.points[s.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  } else if (s.points.length === 1) {
    ctx.beginPath();
    ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────────────── */

export function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, setTheme } = useTheme();

  /* ── UI state (drives renders / button states) ─────────────────── */
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#1a1a2e');
  const [brushSize, setBrushSize] = useState(4);
  const [opacity, setOpacity] = useState(100);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [fillMode, setFillMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [activePopover, setActivePopover] = useState<'color' | 'size' | null>(null);

  /* ── Text input ────────────────────────────────────────────────── */
  const [textInput, setTextInput] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  /* ── Drawing refs — immediate access for pointer handlers ──────── */
  const drawingRef = useRef(false);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(brushSize);
  const opacityRef = useRef(opacity);
  const fillRef = useRef(fillMode);
  const strokesRef = useRef(strokes);
  const currentPointsRef = useRef<Point[]>([]);
  const shapeStartRef = useRef<Point | null>(null);
  const shapeEndRef = useRef<Point | null>(null);
  const rafRef = useRef(0);

  /* Sync refs with state so pointer handlers always read current values */
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);
  useEffect(() => { fillRef.current = fillMode; }, [fillMode]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  /* ── Popover outside-click ─────────────────────────────────────── */
  const colorPopRef = useRef<HTMLDivElement>(null);
  const sizePopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activePopover) return;
    const handler = (e: MouseEvent) => {
      const ref = activePopover === 'color' ? colorPopRef : sizePopRef;
      if (ref.current && !ref.current.contains(e.target as Node)) setActivePopover(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activePopover]);

  /* ── Canvas sizing ─────────────────────────────────────────────── */

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  /* ── Full canvas redraw ────────────────────────────────────────── */

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // 1. Draw all committed strokes
    for (const s of strokesRef.current) {
      drawStroke(ctx, s);
    }

    // 2. Draw in-progress stroke (if currently drawing)
    if (drawingRef.current) {
      const t = toolRef.current;

      if (FREEHAND_TOOLS.has(t) && currentPointsRef.current.length > 0) {
        drawStroke(ctx, {
          tool: t,
          points: currentPointsRef.current,
          color: colorRef.current,
          width: getEffectiveWidth(t, sizeRef.current),
          opacity: opacityRef.current,
        });
      } else if (SHAPE_TOOLS.has(t) && shapeStartRef.current && shapeEndRef.current) {
        drawStroke(ctx, {
          tool: t,
          points: [],
          color: colorRef.current,
          width: sizeRef.current,
          opacity: opacityRef.current,
          startPoint: shapeStartRef.current,
          endPoint: shapeEndRef.current,
          fill: fillRef.current,
        });
      }
    }
  }, []);

  // Redraw whenever committed strokes change (undo/redo/clear/commit)
  useEffect(() => { redrawAll(); }, [strokes, redrawAll]);

  /* ── Pointer handlers ──────────────────────────────────────────── */

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = toolRef.current;
    const pt = getCanvasPoint(e);

    if (t === 'text') {
      setTextInput({ x: pt.x, y: pt.y, visible: true });
      setTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }

    drawingRef.current = true;
    setRedoStack([]);
    setActivePopover(null);

    if (SHAPE_TOOLS.has(t)) {
      shapeStartRef.current = pt;
      shapeEndRef.current = pt;
    } else {
      currentPointsRef.current = [pt];
    }

    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [getCanvasPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const pt = getCanvasPoint(e);
    const t = toolRef.current;

    if (SHAPE_TOOLS.has(t)) {
      shapeEndRef.current = pt;
    } else {
      currentPointsRef.current.push(pt);
    }

    // Redraw via rAF to avoid excessive paints
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(redrawAll);
  }, [getCanvasPoint, redrawAll]);

  const handlePointerUp = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const t = toolRef.current;

    if (SHAPE_TOOLS.has(t) && shapeStartRef.current && shapeEndRef.current) {
      const dx = Math.abs(shapeEndRef.current.x - shapeStartRef.current.x);
      const dy = Math.abs(shapeEndRef.current.y - shapeStartRef.current.y);
      if (dx > 2 || dy > 2) {
        setStrokes(prev => [...prev, {
          tool: t, points: [],
          color: colorRef.current, width: sizeRef.current, opacity: opacityRef.current,
          startPoint: { ...shapeStartRef.current! }, endPoint: { ...shapeEndRef.current! },
          fill: fillRef.current,
        }]);
      }
      shapeStartRef.current = null;
      shapeEndRef.current = null;
    } else if (currentPointsRef.current.length > 0) {
      setStrokes(prev => [...prev, {
        tool: t, points: [...currentPointsRef.current],
        color: colorRef.current,
        width: getEffectiveWidth(t, sizeRef.current),
        opacity: opacityRef.current,
      }]);
      currentPointsRef.current = [];
    }
  }, []);

  /* ── Text commit ───────────────────────────────────────────────── */

  const commitText = useCallback(() => {
    if (!textValue.trim()) {
      setTextInput(prev => ({ ...prev, visible: false }));
      return;
    }
    setStrokes(prev => [...prev, {
      tool: 'text', points: [], color, width: brushSize, opacity,
      startPoint: { x: textInput.x, y: textInput.y },
      text: textValue, fontSize: Math.max(18, brushSize * 4),
    }]);
    setRedoStack([]);
    setTextInput(prev => ({ ...prev, visible: false }));
    setTextValue('');
  }, [textValue, color, brushSize, opacity, textInput.x, textInput.y]);

  /* ── Undo / Redo / Clear ───────────────────────────────────────── */

  const undo = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      setRedoStack(r => [...r, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      setStrokes(s => [...s, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  }, []);

  const clearCanvas = useCallback(() => {
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      return [];
    });
    setRedoStack([]);
  }, []);

  /* ── Export ────────────────────────────────────────────────────── */

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tmp = document.createElement('canvas');
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const ctx = tmp.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = resolvedTheme === 'dark' ? '#0f0f13' : '#ffffff';
    ctx.fillRect(0, 0, tmp.width, tmp.height);
    ctx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `writebox-drawing-${Date.now()}.png`;
    link.href = tmp.toDataURL('image/png');
    link.click();
  }, [resolvedTheme]);

  /* ── Keyboard shortcuts ────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete') clearCanvas();
      if (!mod) {
        const map: Record<string, Tool> = {
          p: 'pen', b: 'brush', h: 'highlighter', e: 'eraser',
          l: 'line', a: 'arrow', r: 'rect', c: 'circle', t: 'text',
        };
        const t = map[e.key.toLowerCase()];
        if (t) setTool(t);
        if (e.key === 'g' || e.key === 'G') setShowGrid(v => !v);
        if (e.key === 'f' || e.key === 'F') setFillMode(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, clearCanvas]);

  /* ── Derived ───────────────────────────────────────────────────── */

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const cursorStyle =
    tool === 'eraser' ? 'cursor-cell'
    : tool === 'text' ? 'cursor-text'
    : 'cursor-crosshair';

  const isShapeFillable = tool === 'rect' || tool === 'circle';

  /* ── Render ────────────────────────────────────────────────────── */

  let lastGroup = -1;

  return (
    <div className="draw">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <header className="draw-toolbar">
        {/* Left: navigation */}
        <div className="draw-toolbar-section">
          <Link href="/" className="draw-icon-btn" title="Back to home" aria-label="Back to home">
            <ArrowLeft size={16} />
          </Link>
          <span className="draw-toolbar-title">Draw</span>
        </div>

        {/* Center: tools */}
        <div className="draw-toolbar-section draw-toolbar-tools">
          {TOOL_DEFS.map(t => {
            const showDivider = lastGroup !== -1 && t.group !== lastGroup;
            lastGroup = t.group;
            return (
              <React.Fragment key={t.id}>
                {showDivider && <div className="draw-divider" />}
                <button
                  onClick={() => setTool(t.id)}
                  title={`${t.label} (${t.shortcut})`}
                  aria-label={t.label}
                  className={`draw-icon-btn ${tool === t.id ? 'draw-icon-btn--active' : ''}`}
                >
                  {t.icon}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Right: properties + actions */}
        <div className="draw-toolbar-section">
          {/* Color picker */}
          <div className="draw-popover-anchor" ref={colorPopRef}>
            <button
              className="draw-prop-btn"
              onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
              title="Color"
              aria-label="Pick color"
            >
              <span className="draw-color-swatch" style={{ background: color }} />
            </button>
            {activePopover === 'color' && (
              <div className="draw-popover">
                <div className="draw-popover-grid">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`draw-color-dot ${color === c ? 'draw-color-dot--active' : ''}`}
                      style={{ background: c }}
                      onClick={() => { setColor(c); setActivePopover(null); }}
                      aria-label={c}
                    />
                  ))}
                </div>
                <label className="draw-custom-color">
                  <span>Custom</span>
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="draw-color-input"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Size picker */}
          <div className="draw-popover-anchor" ref={sizePopRef}>
            <button
              className="draw-prop-btn"
              onClick={() => setActivePopover(activePopover === 'size' ? null : 'size')}
              title="Brush size"
              aria-label="Brush size"
            >
              <span
                className="draw-size-indicator"
                style={{ width: Math.min(brushSize, 14), height: Math.min(brushSize, 14) }}
              />
            </button>
            {activePopover === 'size' && (
              <div className="draw-popover draw-popover--sizes">
                {SIZES.map(s => (
                  <button
                    key={s.value}
                    className={`draw-size-row ${brushSize === s.value ? 'draw-size-row--active' : ''}`}
                    onClick={() => { setBrushSize(s.value); setActivePopover(null); }}
                  >
                    <span
                      className="draw-size-dot"
                      style={{ width: Math.min(s.value, 16), height: Math.min(s.value, 16) }}
                    />
                    <span className="draw-size-label">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opacity slider */}
          <div className="draw-opacity" title={`Opacity: ${opacity}%`}>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              className="draw-opacity-slider"
              aria-label="Opacity"
            />
            <span className="draw-opacity-value">{opacity}</span>
          </div>

          <div className="draw-divider" />

          {/* Fill toggle (visible for rect/circle) */}
          {isShapeFillable && (
            <button
              onClick={() => setFillMode(!fillMode)}
              title={`Fill: ${fillMode ? 'On' : 'Off'} (F)`}
              aria-label="Toggle fill mode"
              className={`draw-icon-btn ${fillMode ? 'draw-icon-btn--active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                {fillMode
                  ? <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" />
                  : <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />}
              </svg>
            </button>
          )}

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title={`Grid: ${showGrid ? 'On' : 'Off'} (G)`}
            aria-label="Toggle grid"
            className={`draw-icon-btn ${showGrid ? 'draw-icon-btn--active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 5.33h12M2 10.67h12M5.33 2v12M10.67 2v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="draw-divider" />

          {/* Undo / Redo */}
          <button onClick={undo} disabled={strokes.length === 0} title="Undo (Ctrl+Z)" className="draw-icon-btn">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)" className="draw-icon-btn">
            <Redo2 size={16} />
          </button>

          <div className="draw-divider" />

          <button onClick={clearCanvas} disabled={strokes.length === 0} title="Clear (Del)" className="draw-icon-btn draw-icon-btn--danger">
            <Trash2 size={16} />
          </button>
          <button onClick={exportPNG} title="Export PNG" className="draw-icon-btn">
            <Download size={16} />
          </button>

          <div className="draw-divider" />

          <button onClick={toggleTheme} aria-label="Toggle theme" className="draw-icon-btn">
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── Status bar ──────────────────────────────────────────── */}
      <div className="draw-status">
        <span className="draw-status-item">
          {TOOL_DEFS.find(t => t.id === tool)?.label}
          {isShapeFillable && fillMode ? ' · Fill' : ''}
        </span>
        <span className="draw-status-item">
          {strokes.length} stroke{strokes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────── */}
      <div ref={containerRef} className={`draw-canvas-area ${cursorStyle} ${showGrid ? 'draw-canvas-area--grid' : ''}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="draw-canvas"
        />

        {textInput.visible && (
          <input
            ref={textInputRef}
            type="text"
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitText();
              if (e.key === 'Escape') setTextInput(prev => ({ ...prev, visible: false }));
            }}
            onBlur={commitText}
            className="draw-text-input"
            style={{ left: textInput.x, top: textInput.y - 24 }}
            placeholder="Type here…"
          />
        )}
      </div>
    </div>
  );
}
