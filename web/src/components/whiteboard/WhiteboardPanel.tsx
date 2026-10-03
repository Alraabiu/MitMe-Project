import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  Trash2,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';
import { api } from '../../services/api';

/* ─────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────── */

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

type Tool = 'pen' | 'eraser';

/* ─────────────────────────────────────────────────────
   Constants
   ───────────────────────────────────────────────────── */

const CANVAS_BG = '#ffffff';
const DEFAULT_COLOR = '#111827';
const DEFAULT_WIDTH = 4;

const PEN_COLORS = [
  '#111827',
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#ea580c',
  '#7c3aed',
];

const PEN_WIDTHS = [2, 4, 6, 10];

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const distToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
};

const strokeHitTest = (stroke: Stroke, point: Point, radius: number): boolean => {
  const pts = stroke.points;
  if (pts.length === 0) return false;
  const r = radius + stroke.width / 2;
  if (pts.length === 1) {
    return Math.hypot(pts[0].x - point.x, pts[0].y - point.y) < r;
  }
  for (let i = 1; i < pts.length; i++) {
    if (distToSegment(point, pts[i - 1], pts[i]) < r) return true;
  }
  return false;
};

/** Draw a smooth stroke path on the given canvas context. */
const drawStroke = (
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  scale: number
) => {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (pts.length === 1) {
    // Dot — a filled circle
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, (stroke.width * scale) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    return;
  }

  // Quadratic Bézier through midpoints — smooth curves
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i].x + pts[i + 1].x) / 2;
    const midY = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
};

/* ─────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────── */

interface WhiteboardPanelProps {
  meetingId: string;
  socket: Socket;
}

export function WhiteboardPanel({
  meetingId,
  socket,
}: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const [livePoints, setLivePoints] = useState<Point[]>([]);

  /* ── Local state ─────────────────────────────── */
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState<string | null>(null);

  /* ── Tool state ──────────────────────────────── */
  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState(DEFAULT_COLOR);
  const [penWidth, setPenWidth] = useState(DEFAULT_WIDTH);
  const [clearing, setClearing] = useState(false);

  /* ── Undo / redo ─────────────────────────────── */
  const [undoStack, setUndoStack] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  /* ── Keep refs fresh for gesture closures ────── */
  const toolRef = useRef(tool);
  const colorRef = useRef(penColor);
  const widthRef = useRef(penWidth);
  const strokesRef = useRef(strokes);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = penColor; }, [penColor]);
  useEffect(() => { widthRef.current = penWidth; }, [penWidth]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  /* ─────────────────────────────────────────────────
     Load strokes from server on mount
     ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;

    api
      .get<{
        whiteboard: {
          pages: { _id: string; events: { type: string; payload: any }[] }[];
        };
      }>(`/whiteboards/${meetingId}`)
      .then((r) => {
        if (cancelled) return;
        const page = r.data.whiteboard.pages?.[0];
        if (!page) return;
        setPageId(page._id);
        const loaded: Stroke[] = [];
        for (const e of page.events) {
          if (e.type === 'clear') {
            loaded.length = 0;
          } else if (e.type === 'stroke') {
            const p = e.payload || {};
            loaded.push({
              id: p.id || p.strokeId || makeId(),
              points: p.points || [],
              color: p.color || DEFAULT_COLOR,
              width: p.width || DEFAULT_WIDTH,
            });
          } else if (e.type === 'erase') {
            const id = e.payload?.id || e.payload?.strokeId;
            if (id) {
              const idx = loaded.findIndex((s) => s.id === id);
              if (idx >= 0) loaded.splice(idx, 1);
            }
          }
        }
        setStrokes(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [meetingId]);

  /* ─────────────────────────────────────────────────
     Realtime sync
     ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket || !meetingId) return;

    const onEvent = (packet: { event: { type: string; payload: any } }) => {
      const { type, payload } = packet.event || {};

      if (type === 'clear') {
        setStrokes([]);
        setLivePoints([]);
        currentPointsRef.current = [];
        return;
      }

      if (type === 'stroke') {
        const p = payload || {};
        const incoming: Stroke = {
          id: p.id || p.strokeId || makeId(),
          points: p.points || [],
          color: p.color || DEFAULT_COLOR,
          width: p.width || DEFAULT_WIDTH,
        };
        if (incoming.points.length === 0) return;
        setStrokes((prev) =>
          prev.some((s) => s.id === incoming.id) ? prev : [...prev, incoming]
        );
        return;
      }

      if (type === 'erase') {
        const id = payload?.id || payload?.strokeId;
        if (!id) return;
        setStrokes((prev) => prev.filter((s) => s.id !== id));
        return;
      }
    };

    socket.on('whiteboard:event', onEvent);
    return () => {
      socket.off('whiteboard:event', onEvent);
    };
  }, [socket, meetingId]);

  /* ─────────────────────────────────────────────────
     Render pipeline — draw strokes to canvas
     ───────────────────────────────────────────────── */

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const s of strokesRef.current) {
      drawStroke(ctx, s, 1);
    }

    // Live preview
    if (livePoints.length > 0) {
      drawStroke(
        ctx,
        {
          id: '__live__',
          points: livePoints,
          color: colorRef.current,
          width: widthRef.current,
        },
        1
      );
    }
  }, [livePoints]);

  /* Resize canvas (DPR aware) + redraw */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      redraw();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  /* Redraw whenever strokes or live preview change */
  useEffect(() => {
    redraw();
  }, [strokes, livePoints, redraw]);

  /* ─────────────────────────────────────────────────
     Emit helpers
     ───────────────────────────────────────────────── */

  const emitStroke = useCallback(
    (stroke: Stroke) => {
      const payload = {
        id: stroke.id,
        strokeId: stroke.id,
        points: stroke.points,
        color: stroke.color,
        width: stroke.width,
      };

      socket.emit('whiteboard:event', {
        meetingId,
        pageId: pageId || undefined,
        event: { type: 'stroke', payload },
      });

      api
        .post(`/whiteboards/${meetingId}/events`, {
          pageId: pageId || undefined,
          type: 'stroke',
          payload,
        })
        .catch(() => {});
    },
    [socket, meetingId, pageId]
  );

  const emitErase = useCallback(
    (strokeId: string) => {
      const payload = { id: strokeId, strokeId };
      socket.emit('whiteboard:event', {
        meetingId,
        pageId: pageId || undefined,
        event: { type: 'erase', payload },
      });
      api
        .post(`/whiteboards/${meetingId}/events`, {
          pageId: pageId || undefined,
          type: 'erase',
          payload,
        })
        .catch(() => {});
    },
    [socket, meetingId, pageId]
  );

  /* ─────────────────────────────────────────────────
     Pointer handlers
     ───────────────────────────────────────────────── */

  const getPoint = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (loading) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const p = getPoint(e);

    if (toolRef.current === 'eraser') {
      const hit = strokesRef.current.find((s) => strokeHitTest(s, p, 24));
      if (hit) {
        setStrokes((prev) => prev.filter((s) => s.id !== hit.id));
        emitErase(hit.id);
      }
      drawing.current = true; // allow drag-erase
      return;
    }

    drawing.current = true;
    currentPointsRef.current = [p];
    setLivePoints([p]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = getPoint(e);

    if (toolRef.current === 'eraser') {
      const hit = strokesRef.current.find((s) => strokeHitTest(s, p, 24));
      if (hit) {
        setStrokes((prev) => prev.filter((s) => s.id !== hit.id));
        emitErase(hit.id);
      }
      return;
    }

    currentPointsRef.current.push(p);
    setLivePoints([...currentPointsRef.current]);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;

    if (toolRef.current === 'eraser') {
      return;
    }

    const points = currentPointsRef.current;
    currentPointsRef.current = [];
    setLivePoints([]);

    if (points.length === 0) return;

    const stroke: Stroke = {
      id: makeId(),
      points,
      color: colorRef.current,
      width: widthRef.current,
    };

    setStrokes((prev) => [...prev, stroke]);
    setUndoStack((prev) => [...prev, stroke]);
    setRedoStack([]);
    emitStroke(stroke);
  };

  /* ─────────────────────────────────────────────────
     Undo / Redo
     ───────────────────────────────────────────────── */

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const undo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
    setStrokes((prev) => prev.filter((s) => s.id !== last.id));
    emitErase(last.id);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, next]);
    setStrokes((prev) =>
      prev.some((s) => s.id === next.id) ? prev : [...prev, next]
    );
    emitStroke(next);
  };

  /* ─────────────────────────────────────────────────
     Clear
     ───────────────────────────────────────────────── */

  const clearBoard = async () => {
    if (clearing) return;
    if (!confirm('Clear the whiteboard for everyone?')) return;

    setClearing(true);
    try {
      setStrokes([]);
      setLivePoints([]);
      currentPointsRef.current = [];
      setUndoStack([]);
      setRedoStack([]);

      await api.post(`/whiteboards/${meetingId}/events`, {
        pageId: pageId || undefined,
        type: 'clear',
        payload: {},
      });

      socket.emit('whiteboard:event', {
        meetingId,
        pageId: pageId || undefined,
        event: { type: 'clear', payload: {} },
      });
    } catch {
      alert('Could not clear the whiteboard.');
    } finally {
      setClearing(false);
    }
  };

  /* ─────────────────────────────────────────────────
     Render
     ───────────────────────────────────────────────── */

  return (
    <div
      className="whiteboard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        gap: 10,
      }}
    >
      {/* Toolbar row 1: tools */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ToolBtn
          active={tool === 'pen'}
          onClick={() => setTool('pen')}
          icon={<Pencil size={18} />}
          label="Pen"
        />
        <ToolBtn
          active={tool === 'eraser'}
          onClick={() => setTool('eraser')}
          icon={<Eraser size={18} />}
          label="Eraser"
        />
        <ToolBtn
          disabled={!canUndo}
          onClick={undo}
          icon={<Undo2 size={18} />}
          label="Undo"
        />
        <ToolBtn
          disabled={!canRedo}
          onClick={redo}
          icon={<Redo2 size={18} />}
          label="Redo"
        />
        <ToolBtn
          danger
          disabled={clearing}
          onClick={clearBoard}
          icon={<Trash2 size={18} />}
          label="Clear"
        />
      </div>

      {/* Toolbar row 2: pen options */}
      {tool === 'pen' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 0',
            overflowX: 'auto',
          }}
        >
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPenColor(c)}
              aria-label={`Color ${c}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: c,
                border:
                  penColor === c
                    ? '2px solid #6d42d8'
                    : '2px solid transparent',
                cursor: 'pointer',
                flexShrink: 0,
                position: 'relative',
                padding: 0,
              }}
            >
              {penColor === c && (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          ))}

          <span
            style={{
              width: 1,
              height: 22,
              background: 'rgba(255,255,255,0.15)',
              margin: '0 4px',
              flexShrink: 0,
            }}
          />

          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setPenWidth(w)}
              aria-label={`Width ${w}`}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                border:
                  penWidth === w
                    ? '2px solid #6d42d8'
                    : '2px solid rgba(255,255,255,0.15)',
                background:
                  penWidth === w ? 'rgba(109,66,216,0.25)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <span
                style={{
                  width: w,
                  height: w,
                  borderRadius: w / 2,
                  background: penWidth === w ? '#fff' : '#cfc9dd',
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Canvas — big and fills the space */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          background: '#fff',
          borderRadius: 12,
          border: '2px solid #ddd6eb',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: 13,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            Loading whiteboard…
          </div>
        )}

        {!loading && strokes.length === 0 && !livePoints.length && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#6b7280' }}>
              Draw with mouse, finger or stylus
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Strokes sync to everyone in the meeting
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            touchAction: 'none',
            background: '#fff',
            cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            display: 'block',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   ToolBtn
   ───────────────────────────────────────────────────── */

function ToolBtn({
  active,
  disabled,
  danger,
  onClick,
  icon,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 6px',
        borderRadius: 10,
        border: 0,
        background: active
          ? '#6d42d8'
          : danger
          ? 'rgba(220,38,38,0.10)'
          : 'transparent',
        color: active
          ? '#fff'
          : danger
          ? '#dc2626'
          : disabled
          ? 'rgba(207,201,221,0.4)'
          : '#cfc9dd',
        fontWeight: 700,
        fontSize: 12,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 120ms ease',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}