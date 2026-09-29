import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { api } from '../src/services/api';
import { useSocket } from '../src/hooks/useSocket';
import { useAuth } from '../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../src/theme';

interface Stroke {
  points: { x: number; y: number }[];
}

export default function WhiteboardScreen() {
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();
  const { user } = useAuth();
  const socket = useSocket();

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // ─── Load whiteboard ──────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    api
      .get<{
        whiteboard: {
          pages: { _id: string; events: { type: string; payload: any }[] }[];
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
            loaded.push({ points: e.payload?.points || [] });
          }
        }
        setStrokes(loaded);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [meetingId]);

  // ─── Realtime sync ────────────────────────────────────
  useEffect(() => {
    if (!socket || !meetingId) return;

    const onEvent = (packet: { event: { type: string; payload: any } }) => {
      if (packet.event.type === 'clear') {
        setStrokes([]);
        setCurrentStroke(null);
        return;
      }
      if (packet.event.type !== 'stroke') return;
      const points = packet.event.payload?.points || [];
      if (points.length < 2) return;
      setStrokes((prev) => [...prev, { points }]);
    };

    socket.on('whiteboard:event', onEvent);
    return () => {
      socket.off('whiteboard:event', onEvent);
    };
  }, [socket, meetingId]);

  // ─── Notify others when we leave ──────────────────────
  useEffect(() => {
    return () => {
      if (!socket || !meetingId) return;
      socket.emit('meeting:state', {
        meetingId,
        type: 'whiteboard',
        value: false,
      });
    };
  }, [socket, meetingId]);

  const saveStroke = async (points: { x: number; y: number }[]) => {
    if (!meetingId || points.length < 2) return;
    try {
      await api.post(`/whiteboards/${meetingId}/events`, {
        pageId: pageId || undefined,
        type: 'stroke',
        payload: { points },
      });
    } catch {
      /* ignore */
    }
  };

  const clearBoard = useCallback(async () => {
    if (!meetingId || clearing) return;
    if (!isTeacher) {
      Alert.alert('Only teachers can clear the board');
      return;
    }

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
              // Wipe locally
              setStrokes([]);
              setCurrentStroke(null);

              // Persist
              await api.post(`/whiteboards/${meetingId}/events`, {
                pageId: pageId || undefined,
                type: 'clear',
                payload: {},
              });

              // Broadcast to others
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
  }, [meetingId, clearing, isTeacher, pageId, socket]);

  const toPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  };

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
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Whiteboard</Text>
          <Text style={s.sub}>
            {isTeacher ? 'You can draw and clear' : 'Draw with your finger'}
          </Text>
        </View>
        {isTeacher && (
          <Pressable
            style={s.clearBtn}
            onPress={clearBoard}
            disabled={clearing}
          >
            <Trash2 size={16} color={colors.danger} />
            <Text style={s.clearBtnText}>
              {clearing ? 'Clearing…' : 'Clear'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Canvas */}
      <View
        style={s.canvasWrap}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          setCurrentStroke({ points: [{ x: locationX, y: locationY }] });
        }}
        onResponderMove={(e) => {
          if (!currentStroke) return;
          const { locationX, locationY } = e.nativeEvent;
          setCurrentStroke({
            points: [
              ...currentStroke.points,
              { x: locationX, y: locationY },
            ],
          });
        }}
        onResponderRelease={async () => {
          if (!currentStroke || currentStroke.points.length < 2) {
            setCurrentStroke(null);
            return;
          }
          const finished = currentStroke;
          setStrokes((prev) => [...prev, finished]);
          setCurrentStroke(null);
          await saveStroke(finished.points);
        }}
      >
        <Svg style={s.svg}>
          {strokes.map((stroke, i) => (
            <Path
              key={i}
              d={toPath(stroke.points)}
              stroke={colors.ink}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentStroke && (
            <Path
              d={toPath(currentStroke.points)}
              stroke={colors.purple}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>

        {strokes.length === 0 && !currentStroke && (
          <View style={s.hint}>
            <Text style={s.hintText}>Draw with your finger</Text>
            <Text style={s.hintSub}>
              Strokes sync to everyone in the meeting
            </Text>
          </View>
        )}
      </View>

      <Text style={s.footer}>
        {strokes.length} {strokes.length === 1 ? 'stroke' : 'strokes'} ·
        shared with the meeting
      </Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  clearBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: font.sm,
  },
  canvasWrap: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    color: colors.muted,
  },
  hintSub: {
    fontSize: font.sm,
    color: colors.muted,
    marginTop: 6,
  },
  footer: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: font.sm,
    paddingBottom: spacing.md,
  },
});