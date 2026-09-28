import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import type { Whiteboard } from '../../types';

interface WhiteboardPanelProps {
  meetingId: string;
  socket: Socket;
  board: Whiteboard | null;
  setBoard: React.Dispatch<React.SetStateAction<Whiteboard | null>>;
  canClear?: boolean;
}

export function WhiteboardPanel({
  meetingId,
  socket,
  board,
  setBoard,
  canClear = false,
}: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const stroke = useRef<{ x: number; y: number }[]>([]);
  const [clearing, setClearing] = useState(false);

  const { persistStroke } = useWhiteboard(meetingId, socket, board, setBoard);

  // ─── Redraw the canvas from board events ────────────────
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#17152b';

    for (const event of board?.pages?.[0]?.events ?? []) {
      if (event.type === 'clear') {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        continue;
      }
      if (event.type !== 'stroke') continue;
      const points = (event.payload as any)?.points ?? [];
      if (points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const pt of points.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  // ─── Resize canvas ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  // ─── Handle clear when board changes ─────────────────────
  useEffect(() => {
    if (!board) return;
    const lastEvent = board.pages?.[0]?.events?.slice(-1)[0];
    if (lastEvent?.type === 'clear') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      }
    }
  }, [board]);

  // ─── Pointer handlers ────────────────────────────────────
  const getPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawing.current = true;
    stroke.current = [getPoint(e)];
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = getPoint(e);
    stroke.current.push(p);
    const pts = stroke.current;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#17152b';
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const onPointerUp = async () => {
    if (!drawing.current) return;
    drawing.current = false;
    const points = stroke.current;
    stroke.current = [];
    await persistStroke(points);
  };

  // ─── Clear for everyone ──────────────────────────────────
  const clearBoard = async () => {
    if (!canClear || clearing) return;
    if (!confirm('Clear the whiteboard for everyone?')) return;

    setClearing(true);
    try {
      // Wipe locally
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      }

      // Persist the clear event
      await api.post(`/whiteboards/${meetingId}/events`, {
        pageId: board?.pages?.[0]?._id,
        type: 'clear',
        payload: {},
      });

      // Emit over socket for real-time sync
      socket.emit('whiteboard:event', {
        meetingId,
        pageId: board?.pages?.[0]?._id,
        event: { type: 'clear', payload: {} },
      });

      // Reset local board state
      setBoard((prev) => {
        if (!prev?.pages?.[0]) return prev;
        const copy: Whiteboard = JSON.parse(JSON.stringify(prev));
        copy.pages[0].events = [{ type: 'clear', payload: {} }];
        return copy;
      });
    } catch {
      alert('Could not clear the whiteboard.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="whiteboard">
      <div className="toolbar">
        <b>Shared canvas</b>
        <span className="muted">
          {canClear
            ? 'You can draw · as a teacher, you can clear'
            : 'Draw with mouse, finger or stylus'}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: 360,
          border: '2px solid #ddd6eb',
          borderRadius: 12,
          touchAction: 'none',
          background: '#fff',
          cursor: 'crosshair',
          display: 'block',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {canClear && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 10,
            justifyContent: 'flex-end',
          }}
        >
          <button
            className="btn"
            onClick={clearBoard}
            disabled={clearing}
            style={{
              color: '#d94b65',
              borderColor: '#d94b65',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Trash2 size={14} />
            {clearing ? 'Clearing…' : 'Clear board'}
          </button>
        </div>
      )}
    </div>
  );
}