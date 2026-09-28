import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  LiveKitRoom,
  useLocalParticipant,
  useTracks,
  VideoView,
  AudioSession,
  isTrackReference,
} from '@livekit/react-native';
import { Track, VideoTrack } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  PenTool,
} from 'lucide-react-native';
import { api } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useSocket } from '../src/hooks/useSocket';
import { colors, spacing, radii, font } from '../src/theme';
import type { Socket } from 'socket.io-client';

interface MediaInfo {
  provider: string;
  mode: string;
  url: string | null;
  token: string | null;
}

export default function MeetingScreen() {
  const router = useRouter();
  const { meetingId, title, code } = useLocalSearchParams<{
    meetingId: string;
    title?: string;
    code?: string;
  }>();
  useAuth(); // ensures auth context is mounted

  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch LiveKit token on mount
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.post<{ media: MediaInfo }>(
          `/meetings/${meetingId}/join`
        );
        if (cancelled) return;
        setMedia(r.data.media);
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message || 'Could not join the meeting.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const handleLeave = useCallback(() => {
    if (meetingId) {
      api.post(`/meetings/${meetingId}/leave`).catch(() => {});
    }
    router.back();
  }, [meetingId, router]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={s.loadingText}>Connecting to the meeting…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !media?.token || !media?.url) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorTitle}>Unable to join</Text>
          <Text style={s.errorText}>
            {error || 'LiveKit credentials were not provided.'}
          </Text>
          <Pressable style={s.leaveBtn} onPress={handleLeave}>
            <Text style={s.leaveBtnText}>Back to meetings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <RNStatusBar barStyle="light-content" />

      <View style={s.room}>
        <LiveKitRoom
          serverUrl={media.url}
          token={media.token}
          connect
          audio
          video
          onDisconnected={handleLeave}
          onError={(err) => {
            console.warn('[livekit] error:', err);
            Alert.alert('MitMe', 'Meeting connection lost.');
          }}
        >
          <MeetingUI
            title={title || 'Meeting'}
            code={code || ''}
            onLeave={handleLeave}
            meetingId={meetingId!}
          />
        </LiveKitRoom>
      </View>
    </SafeAreaView>
  );
}

// ─── Inner UI (needs LiveKitRoom as parent to use hooks) ──
function MeetingUI({
  title,
  code,
  onLeave,
  meetingId,
}: {
  title: string;
  code: string;
  onLeave: () => void;
  meetingId: string;
}) {
  const router = useRouter();
  const { localParticipant } = useLocalParticipant();
  const socket = useSocket();

  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [remoteBoardOpen, setRemoteBoardOpen] = useState(false);

  // iOS audio session management
  useEffect(() => {
    (async () => {
      try {
        await AudioSession.startAudioSession();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      AudioSession.stopAudioSession().catch(() => {});
    };
  }, []);

  // ─── Listen for whiteboard open/close from other participants ───
  useEffect(() => {
    if (!socket) return;

    const onState = (payload: {
      userId: string;
      type: string;
      value: any;
    }) => {
      if (payload.type === 'whiteboard') {
        setRemoteBoardOpen(!!payload.value);
      }
    };

    socket.on('meeting:state', onState);
    return () => {
      socket.off('meeting:state', onState);
    };
  }, [socket]);

  // ─── Broadcast when we open the whiteboard screen ────────────
  const openWhiteboard = () => {
    socket?.emit('meeting:state', {
      meetingId,
      type: 'whiteboard',
      value: true,
    });
    router.push({
      pathname: '/meeting-whiteboard',
      params: { meetingId, broadcast: '1' },
    });
  };

  // All camera tracks (with placeholders for participants without camera)
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const toggleMic = async () => {
    const next = !muted;
    await localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };

  const toggleCamera = async () => {
    const next = !cameraOn;
    await localParticipant.setCameraEnabled(next);
    setCameraOn(next);
  };

  const confirmLeave = () => {
    Alert.alert('Leave meeting?', 'You can rejoin with the same code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  };

  return (
    <>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.code}>{code}</Text>
        </View>
        <View style={s.liveDot} />
      </View>

      {/* Remote whiteboard banner */}
      {remoteBoardOpen && (
        <View style={s.boardBanner}>
          <PenTool size={14} color="#fff" />
          <Text style={s.boardBannerText}>
            A participant opened the whiteboard
          </Text>
          <Pressable style={s.boardBannerBtn} onPress={openWhiteboard}>
            <Text style={s.boardBannerBtnText}>Join</Text>
          </Pressable>
        </View>
      )}

      {/* Video tiles */}
      <View style={s.stage}>
        <View style={s.tiles}>
          {tracks.map((track, i) => {
            if (!isTrackReference(track)) {
              return (
                <View key={`ph-${i}`} style={s.tile}>
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarPlaceholderText}>
                      {(track.participant?.name ||
                        track.participant?.identity ||
                        '?')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <Text style={s.tileLabel}>
                    {track.participant?.name ||
                      track.participant?.identity ||
                      'Participant'}
                    {track.participant?.isLocal ? ' (You)' : ''}
                  </Text>
                </View>
              );
            }

            return (
              <View
                key={track.publication?.trackSid || `t-${i}`}
                style={s.tile}
              >
                <VideoView
                  style={s.video}
                  videoTrack={track.publication.track as VideoTrack | undefined}
                  mirror={track.participant?.isLocal ?? false}
                  objectFit="cover"
                />
                <Text style={s.tileLabel}>
                  {track.participant?.name ||
                    track.participant?.identity ||
                    'Participant'}
                  {track.participant?.isLocal ? ' (You)' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Pressable
          style={[s.control, muted ? s.controlDefault : s.controlActive]}
          onPress={toggleMic}
        >
          {muted ? (
            <MicOff size={22} color="#fff" />
          ) : (
            <Mic size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable
          style={[s.control, cameraOn ? s.controlActive : s.controlDefault]}
          onPress={toggleCamera}
        >
          {cameraOn ? (
            <VideoIcon size={22} color="#fff" />
          ) : (
            <VideoOff size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable style={[s.control, s.controlDefault]} onPress={openWhiteboard}>
          <PenTool size={22} color="#fff" />
        </Pressable>

        <Pressable style={[s.control, s.controlEnd]} onPress={confirmLeave}>
          <PhoneOff size={22} color="#fff" />
        </Pressable>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0c18' },
  room: { flex: 1, backgroundColor: '#0e0c18' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    color: '#aaa',
    marginTop: spacing.lg,
    fontSize: font.md,
  },
  errorTitle: {
    color: '#fff',
    fontSize: font.xl,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  errorText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontSize: font.md,
  },
  leaveBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  leaveBtnText: { color: '#fff', fontWeight: '800' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: '#fff', fontSize: font.lg, fontWeight: '800' },
  code: { color: '#aaa', fontSize: font.sm, marginTop: 2 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },

  boardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(94, 66, 190, 0.95)',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  boardBannerText: {
    color: '#fff',
    fontSize: font.sm,
    fontWeight: '700',
    flex: 1,
  },
  boardBannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  boardBannerBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: font.sm,
  },

  stage: { flex: 1, padding: spacing.md },
  tiles: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    aspectRatio: 3 / 4,
    backgroundColor: '#201c2e',
    borderRadius: radii.lg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  tileLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: font.sm,
    fontWeight: '700',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  control: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlDefault: { backgroundColor: '#29243a' },
  controlActive: { backgroundColor: colors.purple },
  controlEnd: { backgroundColor: colors.danger },
});