import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react-native';
import { api } from '../src/services/api';
import { useSocket } from '../src/hooks/useSocket';
import { useAuth } from '../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../src/theme';

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
const DEFAULT_COLOR = '#111827'; // near-black — always visible on white
const DEFAULT_WIDTH = 4;

const PEN_COLORS = [
  '#111827', // black
  '#dc2626', // red
  '#2563eb', // blue
  '#16a34a', // green
  '#ea580c', // orange
  '#7c3aed', // purple
];

const PEN_WIDTHS = [2, 4, 6, 10];

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Convert an array of points to a smooth SVG path using quadratic
 * Bézier curves through midpoints. Produces noticeably smoother
 * strokes than straight-line segments — especially on Android.
 */
const pointsToPath = (points: Point[]): string => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    // Dot — draw a zero-length line so it renders with round cap
    return `M ${p.x} ${p.y} L ${p.x} ${p.y}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)} ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
};

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

/* ─────────────────────────────────────────────────────
   Screen
   ───────────────────────────────────────────────────── */

export default function WhiteboardScreen() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const { user } = useAuth();
  const socket = useSocket();

  /* ── Board state ─────────────────────────────── */
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  /* ── Tool state ──────────────────────────────── */
  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState(DEFAULT_COLOR);
  const [penWidth, setPenWidth] = useState(DEFAULT_WIDTH);

  /* ── Undo / redo history ─────────────────────── */
  const [undoStack, setUndoStack] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);

  /* ── Canvas size (required for Android Svg) ─── */
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  /* ── Drawing refs (avoid re-renders per pixel) ─ */
  const currentPointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const [livePoints, setLivePoints] = useState<Point[]>([]);

  /* ── Keep tool refs fresh inside gesture closures ── */
  const toolRef = useRef<Tool>(tool);
  const colorRef = useRef<string>(penColor);
  const widthRef = useRef<number>(penWidth);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = penColor; }, [penColor]);
  useEffect(() => { widthRef.current = penWidth; }, [penWidth]);

  /* ── Strokes ref so gesture closures see latest ─ */
  const strokesRef = useRef<Stroke[]>(strokes);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  /* ─────────────────────────────────────────────────
     Ensure we are joined to the meeting socket room
     ─────────────────────────────────────────────────
     Expo Router keeps the previous screen (MeetingUI)
     mounted in the stack when we push the whiteboard.
     Its cleanup may fire 'meeting:leave' and drop us
     from the room — so we re-join here on mount.
     We deliberately DO NOT emit 'meeting:leave' on
     unmount because MeetingUI behind us still needs it.
     ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket || !meetingId) return;
    console.log('[whiteboard] joining meeting room', meetingId);
    socket.emit('meeting:join', meetingId);

    // Also broadcast that we opened the whiteboard so other
    // participants get the "Join whiteboard" banner.
    socket.emit('meeting:state', {
      meetingId,
      type: 'whiteboard',
      value: true,
    });

    return () => {
      // Only notify that the whiteboard closed — do NOT leave the room.
      socket.emit('meeting:state', {
        meetingId,
        type: 'whiteboard',
        value: false,
      });
    };
  }, [socket, meetingId]);

  /* ─────────────────────────────────────────────────
     Load from server
     ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!meetingId) return;
    api
      .get<{
        whiteboard: {
          pages: {
            _id: string;
            events: { type: string; payload: any }[];
          }[];
        };
      }>(`/whiteboards/${meetingId}`)
      .then((r) => {
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
      .finally(() => setLoading(false));
  }, [meetingId]);

  /* ─────────────────────────────────────────────────
     Realtime sync — receive strokes from others
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
     Emit helpers (socket + persistence)
     ───────────────────────────────────────────────── */

  const emitStroke = useCallback(
    (stroke: Stroke) => {
      const payload = {
        id: stroke.id,
        strokeId: stroke.id, // alias — some listeners use this key
        points: stroke.points,
        color: stroke.color,
        width: stroke.width,
      };

      console.log(
        '[whiteboard] emit stroke',
        stroke.id,
        stroke.points.length,
        'pts'
      );

      socket?.emit('whiteboard:event', {
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
      socket?.emit('whiteboard:event', {
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
     Drawing gesture handlers (rAF-throttled)
     ───────────────────────────────────────────────── */

  const flushFrame = () => {
    rafRef.current = null;
    if (!isDrawingRef.current) return;
    setLivePoints([...currentPointsRef.current]);
  };

  const scheduleFrame = () => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushFrame);
  };

  const handleGrant = (x: number, y: number) => {
    if (toolRef.current === 'eraser') {
      const hit = strokesRef.current.find((s) =>
        strokeHitTest(s, { x, y }, 24)
      );
      if (hit) {
        setStrokes((prev) => prev.filter((s) => s.id !== hit.id));
        emitErase(hit.id);
      }
      return;
    }

    isDrawingRef.current = true;
    currentPointsRef.current = [{ x, y }];
    setLivePoints([{ x, y }]);
  };

  const handleMove = (x: number, y: number) => {
    if (toolRef.current === 'eraser') {
      const hit = strokesRef.current.find((s) =>
        strokeHitTest(s, { x, y }, 24)
      );
      if (hit) {
        setStrokes((prev) => prev.filter((s) => s.id !== hit.id));
        emitErase(hit.id);
      }
      return;
    }

    if (!isDrawingRef.current) return;
    currentPointsRef.current.push({ x, y });
    scheduleFrame();
  };

  const handleRelease = () => {
    if (toolRef.current === 'eraser') return;

    isDrawingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
  const clearBoard = useCallback(async () => {
    if (!meetingId || clearing) return;

    Alert.alert(
      'Clear whiteboard?',
      'This will erase the board for everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
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

              socket?.emit('whiteboard:event', {
                meetingId,
                pageId: pageId || undefined,
                event: { type: 'clear', payload: {} },
              });
            } catch {
              Alert.alert('MitMe', 'Could not clear the whiteboard.');
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  }, [meetingId, clearing, pageId, socket]);

  /* ─────────────────────────────────────────────────
     Render
     ───────────────────────────────────────────────── */

  const liveStroke: Stroke | null = useMemo(() => {
    if (livePoints.length === 0) return null;
    return {
      id: '__live__',
      points: livePoints,
      color: penColor,
      width: penWidth,
    };
  }, [livePoints, penColor, penWidth]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* ── Header ─────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          style={s.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Whiteboard</Text>
          <Text style={s.sub}>Draw with your finger</Text>
        </View>
      </View>

      {/* ── Canvas ─────────────────────────────── */}
      <View
        style={s.canvasWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCanvasSize({ w: width, h: height });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onStartShouldSetResponderCapture={() => true}
        onMoveShouldSetResponderCapture={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          handleGrant(locationX, locationY);
        }}
        onResponderMove={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          handleMove(locationX, locationY);
        }}
        onResponderRelease={handleRelease}
        onResponderTerminate={handleRelease}
      >
        {canvasSize.w > 0 && canvasSize.h > 0 && (
          <Svg
            width={canvasSize.w}
            height={canvasSize.h}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {strokes.map((stroke) => (
              <Path
                key={stroke.id}
                d={pointsToPath(stroke.points)}
                stroke={stroke.color}
                strokeWidth={stroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {liveStroke && (
              <Path
                d={pointsToPath(liveStroke.points)}
                stroke={liveStroke.color}
                strokeWidth={liveStroke.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </Svg>
        )}

        {strokes.length === 0 && !liveStroke && (
          <View style={s.hint} pointerEvents="none">
            <Text style={s.hintText}>Draw with your finger</Text>
            <Text style={s.hintSub}>
              Strokes sync to everyone in the meeting
            </Text>
          </View>
        )}
      </View>

      {/* ── Toolbar ────────────────────────────── */}
      <View style={s.toolbar}>
        {/* Row 1: tools */}
        <View style={s.toolRow}>
          <ToolButton
            active={tool === 'pen'}
            onPress={() => setTool('pen')}
            icon={<Pencil size={20} color={tool === 'pen' ? '#fff' : colors.ink} />}
            label="Pen"
          />
          <ToolButton
            active={tool === 'eraser'}
            onPress={() => setTool('eraser')}
            icon={<Eraser size={20} color={tool === 'eraser' ? '#fff' : colors.ink} />}
            label="Eraser"
          />
          <ToolButton
            disabled={!canUndo}
            onPress={undo}
            icon={<Undo2 size={20} color={canUndo ? colors.ink : colors.mutedDim} />}
            label="Undo"
          />
          <ToolButton
            disabled={!canRedo}
            onPress={redo}
            icon={<Redo2 size={20} color={canRedo ? colors.ink : colors.mutedDim} />}
            label="Redo"
          />
          <ToolButton
            danger
            disabled={clearing}
            onPress={clearBoard}
            icon={<Trash2 size={20} color="#dc2626" />}
            label="Clear"
          />
        </View>

        {/* Row 2: pen options (only when pen is active) */}
        {tool === 'pen' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.optionsRow}
          >
            {PEN_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setPenColor(c)}
                style={[
                  s.colorSwatch,
                  { backgroundColor: c },
                  penColor === c && s.colorSwatchActive,
                ]}
                hitSlop={4}
              >
                {penColor === c && <View style={s.colorSwatchInner} />}
              </Pressable>
            ))}

            <View style={s.divider} />

            {PEN_WIDTHS.map((w) => (
              <Pressable
                key={w}
                onPress={() => setPenWidth(w)}
                style={[
                  s.widthBtn,
                  penWidth === w && s.widthBtnActive,
                ]}
                hitSlop={4}
              >
                <View
                  style={{
                    width: w,
                    height: w,
                    borderRadius: w / 2,
                    backgroundColor:
                      penWidth === w ? '#fff' : colors.ink,
                  }}
                />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────────────
   ToolButton
   ───────────────────────────────────────────────────── */

function ToolButton({
  active,
  disabled,
  danger,
  onPress,
  icon,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.toolBtn,
        active && s.toolBtnActive,
        danger && s.toolBtnDanger,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.7 },
      ]}
    >
      {icon}
      <Text
        style={[
          s.toolBtnLabel,
          active && s.toolBtnLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────────────
   Styles
   ───────────────────────────────────────────────────── */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: font.lg, fontWeight: '800', color: colors.ink },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },

  /* Canvas */
  canvasWrap: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: CANVAS_BG,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  hint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: font.lg,
    fontWeight: '800',
    color: '#9ca3af',
  },
  hintSub: {
    fontSize: font.sm,
    color: '#9ca3af',
    marginTop: 6,
  },

  /* Toolbar */
  toolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },

  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },

  toolBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'transparent',
  },
  toolBtnActive: {
    backgroundColor: '#6d42d8',
  },
  toolBtnDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.10)',
  },
  toolBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: 2,
  },
  toolBtnLabelActive: {
    color: '#fff',
  },

  /* Pen options */
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },

  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    borderColor: colors.ink,
  },
  colorSwatchInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    opacity: 0.9,
  },

  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },

  widthBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  widthBtnActive: {
    backgroundColor: '#6d42d8',
    borderColor: '#6d42d8',
  },
});