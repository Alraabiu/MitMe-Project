// React types are unavailable in this project; keep this file compilable until they are installed.
import { createElement, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useWhiteboard } from '../../hooks/useWhiteboard';
import type { Whiteboard } from '../../types';

type PointerEventLike = {
  clientX: number;
  clientY: number;
  pointerId: number;
};

interface WhiteboardPanelProps {
  meetingId: string;
  socket: Socket;
  board: Whiteboard | null;
  setBoard: (
    value: Whiteboard | null | ((previous: Whiteboard | null) => Whiteboard | null),
  ) => void;
}

export function WhiteboardPanel({
  meetingId,
  socket,
  board,
  setBoard,
}: WhiteboardPanelProps) {
  const canvasRef = useRef(null) as { current: HTMLCanvasElement | null };
  const drawing = useRef(false) as { current: boolean };
  const stroke = useRef([]) as { current: { x: number; y: number }[] };

  const { persistStroke } = useWhiteboard(meetingId, socket, board, setBoard);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#17152b';

    for (const ev of board?.pages?.[0]?.events ?? []) {
      if (ev.type !== 'stroke') continue;
      const points = ev.payload?.points ?? [];
      if (points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const pt of points.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

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

  const getPoint = (e: PointerEventLike) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: PointerEventLike) => {
    drawing.current = true;
    stroke.current = [getPoint(e)];
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEventLike) => {
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

  return createElement(
    'div',
    { className: 'whiteboard' },
    createElement(
      'div',
      { className: 'toolbar' },
      createElement('b', null, 'Shared canvas'),
      createElement('span', { className: 'muted' }, 'Draw with mouse, finger or stylus'),
    ),
    createElement('canvas', {
      ref: canvasRef,
      style: {
        width: '100%',
        height: 360,
        border: '2px solid #ddd6eb',
        borderRadius: 12,
        touchAction: 'none',
        background: '#fff',
      },
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    }),
  );
}