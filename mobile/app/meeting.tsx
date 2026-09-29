import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar as RNStatusBar,
  ScrollView,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Track } from 'livekit-client';
import type { VideoTrack } from 'livekit-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  PenTool,
  MonitorUp,
  UserCheck,
  Check,
  X,
} from 'lucide-react-native';
import { api } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useSocket } from '../src/hooks/useSocket';
import { useNotificationSound } from '../src/hooks/useNotificationSound';
import { colors, spacing, radii, font } from '../src/theme';
import type { Socket } from 'socket.io-client';

// ─── Environment detection ──────────────────────────────────
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LiveKit: any = null;
if (!isExpoGo) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    LiveKit = require('@livekit/react-native');
  } catch (err) {
    console.warn('[MitMe] LiveKit native module unavailable:', err);
  }
}

const LiveKitRoom = LiveKit?.LiveKitRoom;
const useLocalParticipant: () => { localParticipant: any } =
  LiveKit?.useLocalParticipant ?? (() => ({ localParticipant: null }));
const useTracks: (sources: any[], options?: any) => any[] =
  LiveKit?.useTracks ?? (() => []);
const VideoView: any = LiveKit?.VideoView ?? (() => null);
const AudioSession: any =
  LiveKit?.AudioSession ?? {
    startAudioSession: async () => {},
    stopAudioSession: async () => {},
  };
const isTrackReference: (t: any) => boolean =
  LiveKit?.isTrackReference ?? (() => false);

// ─── Types ──────────────────────────────────────────────────
interface MediaInfo {
  provider: string;
  mode: string;
  url: string | null;
  token: string | null;
}

interface WaitingParticipant {
  _id: string;
  user: {
    _id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

type JoinState = 'loading' | 'pending' | 'admitted' | 'error';
type PermState = 'checking' | 'granted' | 'denied';

interface TrackRef {
  source: string;
  participant?: any;
  publication?: any;
}

// ─── Android permission helper ──────────────────────────────
async function checkAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const camera = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA
    );
    const mic = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return camera && mic;
  } catch {
    return false;
  }
}

async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    return (
      result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

// ─── Root screen ────────────────────────────────────────────
export default function MeetingScreen() {
  const router = useRouter();
  const { meetingId, title, code } = useLocalSearchParams<{
    meetingId: string;
    title?: string;
    code?: string;
  }>();
  const { user } = useAuth();
  const socket = useSocket();

  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [joinState, setJoinState] = useState<JoinState>('loading');
  const [permState, setPermState] = useState<PermState>('checking');
  const [error, setError] = useState('');
  const [admitRetry, setAdmitRetry] = useState(0);
  const [rejected, setRejected] = useState(false);

  // ─── Check/request permissions FIRST ────────────────────
  useEffect(() => {
    if (isExpoGo) return;

    (async () => {
      const already = await checkAndroidPermissions();
      if (already) {
        setPermState('granted');
        return;
      }

      const granted = await requestAndroidPermissions();
      setPermState(granted ? 'granted' : 'denied');
    })();
  }, []);

  // ─── Fetch LiveKit token ────────────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api.post<{
          status?: 'pending' | 'admitted';
          media?: MediaInfo;
        }>(`/meetings/${meetingId}/join`);
        if (cancelled) return;

        const status = r.data.status ?? 'admitted';
        if (status === 'pending') {
          setJoinState('pending');
          return;
        }
        setMedia(r.data.media ?? null);
        setJoinState('admitted');
      } catch (err: any) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message || 'Could not join the meeting.'
        );
        setJoinState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meetingId, admitRetry]);

  // ─── Admission / rejection listener ─────────────────────
  useEffect(() => {
    if (!socket || !meetingId) return;
    const onAdmitted = (payload: { meetingId: string }) => {
      if (payload.meetingId !== meetingId) return;
      setAdmitRetry((n) => n + 1);
    };
    const onRejected = (payload: { meetingId: string }) => {
      if (payload.meetingId !== meetingId) return;
      setRejected(true);
    };
    socket.on('meeting:admitted', onAdmitted);
    socket.on('meeting:rejected', onRejected);
    return () => {
      socket.off('meeting:admitted', onAdmitted);
      socket.off('meeting:rejected', onRejected);
    };
  }, [socket, meetingId]);

  const handleLeave = useCallback(() => {
    if (meetingId) {
      api.post(`/meetings/${meetingId}/leave`).catch(() => {});
    }
    router.back();
  }, [meetingId, router]);

  // ─── EXPO GO FALLBACK ───────────────────────────────────
  if (isExpoGo) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <RNStatusBar barStyle="light-content" />
        <View style={s.center}>
          <View style={s.expoGoIcon}>
            <VideoIcon size={40} color={colors.purple} />
          </View>
          <Text style={s.errorTitle}>Video calls need the MitMe app</Text>
          <Text style={s.errorText}>
            Expo Go doesn't support live video. Install the MitMe APK to
            join meetings from your phone.
          </Text>
          <Pressable style={s.leaveBtn} onPress={handleLeave}>
            <Text style={s.leaveBtnText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ─── PERMISSION CHECK SCREEN ────────────────────────────
  if (permState === 'checking') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={s.loadingText}>Preparing camera and microphone…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permState === 'denied') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <RNStatusBar barStyle="light-content" />
        <View style={s.center}>
          <VideoOff size={48} color={colors.danger} />
          <Text style={s.errorTitle}>Permissions required</Text>
          <Text style={s.errorText}>
            MitMe needs camera and microphone access for meetings. Please
            grant them in your phone's settings, then try again.
          </Text>
          <Pressable
            style={s.leaveBtn}
            onPress={async () => {
              const granted = await requestAndroidPermissions();
              setPermState(granted ? 'granted' : 'denied');
            }}
          >
            <Text style={s.leaveBtnText}>Try again</Text>
          </Pressable>
          <Pressable
            style={[s.leaveOutlineBtn, { marginTop: spacing.md }]}
            onPress={handleLeave}
          >
            <Text style={s.leaveOutlineBtnText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (rejected) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <RNStatusBar barStyle="light-content" />
        <View style={s.center}>
          <X size={48} color={colors.danger} />
          <Text style={s.errorTitle}>The host did not admit you</Text>
          <Text style={s.errorText}>
            You were not allowed into this meeting.
          </Text>
          <Pressable style={s.leaveBtn} onPress={handleLeave}>
            <Text style={s.leaveBtnText}>Back to meetings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (joinState === 'pending') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <RNStatusBar barStyle="light-content" />
        <View style={s.center}>
          <View style={s.waitingSpinner} />
          <Text style={s.waitingTitle}>
            Waiting for the host to admit you
          </Text>
          <Text style={s.waitingSub}>
            {title || 'Meeting'} · {code || ''}
          </Text>
          <Text style={s.waitingHint}>
            The host has been notified. Please stay on this screen.
          </Text>
          <Pressable style={s.leaveOutlineBtn} onPress={handleLeave}>
            <Text style={s.leaveOutlineBtnText}>Leave</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (joinState === 'loading') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={s.loadingText}>Connecting to the meeting…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (joinState === 'error' || !media?.token || !media?.url) {
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

  // ─── ADMITTED + PERMISSIONS OK ──────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <RNStatusBar barStyle="light-content" />
      <View style={s.room}>
        <LiveKitRoom
          serverUrl={media.url}
          token={media.token}
          connect
          // NOTE: we do NOT pass `audio video` here — we enable them
          // explicitly via setMicrophoneEnabled / setCameraEnabled
          // after the user taps the buttons. This avoids the WebRTC
          // internal state breaking when permissions weren't granted
          // during LiveKit's initial connect.
          onDisconnected={handleLeave}
          onError={(err: Error) => {
            console.warn('[livekit] error:', err);
            Alert.alert('MitMe', 'Meeting connection lost.');
          }}
        >
          <MeetingUI
            meetingId={meetingId!}
            title={title || 'Meeting'}
            code={code || ''}
            onLeave={handleLeave}
            socket={socket}
            userRole={user?.role}
          />
        </LiveKitRoom>
      </View>
    </SafeAreaView>
  );
}

// ─── Inner UI ───────────────────────────────────────────────
function MeetingUI({
  meetingId,
  title,
  code,
  onLeave,
  socket,
  userRole,
}: {
  meetingId: string;
  title: string;
  code: string;
  onLeave: () => void;
  socket: Socket | null;
  userRole?: string;
}) {
  const router = useRouter();
  const { localParticipant } = useLocalParticipant();
  const { play } = useNotificationSound();

  const [muted, setMuted] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [remoteBoardOpen, setRemoteBoardOpen] = useState(false);
  const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);
  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCamera, setTogglingCamera] = useState(false);
  const [togglingShare, setTogglingShare] = useState(false);

  const isHost = useMemo(
    () => userRole === 'teacher' || userRole === 'admin',
    [userRole]
  );

  // ─── iOS audio session ──────────────────────────────────
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

  // ─── Socket join ────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    socket.emit('meeting:join', meetingId);
    return () => {
      socket.emit('meeting:leave', meetingId);
    };
  }, [socket, meetingId]);

  // ─── Whiteboard sync ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onState = (payload: {
      userId: string;
      type: string;
      value: unknown;
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

  // ─── Host waiting-room subscription ────────────────────
  useEffect(() => {
    if (!socket || !isHost) return;

    api
      .get<{ waiting: WaitingParticipant[] }>(`/meetings/${meetingId}/waiting`)
      .then((r) => setWaiting(r.data.waiting))
      .catch(() => {});

    socket.emit('meeting:watch-requests', meetingId);

    const onList = (payload: {
      meetingId: string;
      pending: WaitingParticipant[];
    }) => {
      if (payload.meetingId !== meetingId) return;
      setWaiting(payload.pending);
    };

    const onRequest = (payload: {
      meetingId: string;
      participant: {
        _id: string;
        displayName: string;
        username: string;
        avatarUrl?: string;
      };
    }) => {
      if (payload.meetingId !== meetingId) return;
      let isNew = false;
      setWaiting((prev) => {
        if (prev.some((p) => p.user._id === payload.participant._id)) {
          return prev;
        }
        isNew = true;
        return [
          ...prev,
          { _id: payload.participant._id, user: payload.participant },
        ];
      });
      if (isNew) play('request');
    };

    socket.on('meeting:pending-list', onList);
    socket.on('meeting:join-request', onRequest);
    return () => {
      socket.emit('meeting:unwatch-requests', meetingId);
      socket.off('meeting:pending-list', onList);
      socket.off('meeting:join-request', onRequest);
    };
  }, [socket, meetingId, isHost, play]);

  // ─── Tracks ─────────────────────────────────────────────
  const tracks: TrackRef[] = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Debug log
  useEffect(() => {
    console.log(
      '[tracks] count:',
      tracks.length,
      tracks.map((t) => ({
        source: t.source,
        isLocal: t.participant?.isLocal,
        isRef: isTrackReference(t),
      }))
    );
  }, [tracks]);

  const isScreenShareActive = tracks.some(
    (t) => t.source === Track.Source.ScreenShare
  );

  const myCamera = tracks.find(
    (t) =>
      isTrackReference(t) &&
      t.participant?.isLocal === true &&
      t.source === Track.Source.Camera
  );

  const remoteCameras = tracks.filter(
    (t) =>
      t.source === Track.Source.Camera && t.participant?.isLocal !== true
  );

  // ─── Toggle mic ─────────────────────────────────────────
  const toggleMic = async () => {
    if (!localParticipant || togglingMic) return;
    setTogglingMic(true);
    const willBeEnabled = muted; // currently muted → will enable
    try {
      console.log('[mic] setMicrophoneEnabled', willBeEnabled);
      await localParticipant.setMicrophoneEnabled(willBeEnabled);
      setMuted(!willBeEnabled);
      console.log('[mic] success, muted =', !willBeEnabled);
    } catch (err) {
      console.warn('[mic] failed:', err);
      Alert.alert(
        'Microphone error',
        'Could not start the microphone. Check app permissions in your phone settings.'
      );
    } finally {
      setTogglingMic(false);
    }
  };

  // ─── Toggle camera ──────────────────────────────────────
  const toggleCamera = async () => {
    if (!localParticipant || togglingCamera) return;
    setTogglingCamera(true);
    const willBeEnabled = !cameraOn;
    try {
      console.log('[camera] setCameraEnabled', willBeEnabled);
      await localParticipant.setCameraEnabled(willBeEnabled);
      setCameraOn(willBeEnabled);
      console.log('[camera] success, cameraOn =', willBeEnabled);
    } catch (err) {
      console.warn('[camera] failed:', err);
      Alert.alert(
        'Camera error',
        'Could not start the camera. Check app permissions in your phone settings.'
      );
    } finally {
      setTogglingCamera(false);
    }
  };

  // ─── Screen share ───────────────────────────────────────
  const shareScreen = async () => {
    if (!localParticipant || togglingShare) return;
    setTogglingShare(true);
    try {
      await localParticipant.setScreenShareEnabled(true);
    } catch (err: any) {
      console.warn('[share] failed:', err);
      Alert.alert(
        'Screen share unavailable',
        'Screen sharing from mobile requires the MitMe APK built with the screen-capture module. Try from web.'
      );
    } finally {
      setTogglingShare(false);
    }
  };

  const confirmLeave = () => {
    Alert.alert('Leave meeting?', 'You can rejoin with the same code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  };

  const openWhiteboard = () => {
    socket?.emit('meeting:state', {
      meetingId,
      type: 'whiteboard',
      value: true,
    });
    router.push({
      pathname: '/meeting-whiteboard',
      params: { meetingId },
    });
  };

  const admit = async (userId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/admit/${userId}`);
      setWaiting((prev) => prev.filter((w) => w.user._id !== userId));
    } catch {
      Alert.alert('MitMe', 'Could not admit this participant.');
    }
  };

  const reject = async (userId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/reject/${userId}`);
      setWaiting((prev) => prev.filter((w) => w.user._id !== userId));
    } catch {
      Alert.alert('MitMe', 'Could not reject this participant.');
    }
  };

  return (
    <>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={s.code}>{code}</Text>
        </View>
        <View style={s.liveDot} />
      </View>

      {remoteBoardOpen && (
        <Pressable style={s.boardBanner} onPress={openWhiteboard}>
          <PenTool size={14} color="#fff" />
          <Text style={s.boardBannerText}>
            A participant opened the whiteboard
          </Text>
          <View style={s.boardBannerBtn}>
            <Text style={s.boardBannerBtnText}>Join</Text>
          </View>
        </Pressable>
      )}

      {isHost && waiting.length > 0 && (
        <View style={s.hostPanel}>
          <View style={s.hostPanelHeader}>
            <UserCheck size={14} color="#d5cfe6" />
            <Text style={s.hostPanelTitle}>
              Waiting room · {waiting.length}
            </Text>
          </View>
          <ScrollView style={{ maxHeight: 220 }}>
            {waiting.map((w) => (
              <View key={w.user._id} style={s.hostPanelRow}>
                <View style={s.hostAvatar}>
                  <Text style={s.hostAvatarText}>
                    {w.user.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.hostName} numberOfLines={1}>
                    {w.user.displayName}
                  </Text>
                  <Text style={s.hostSub} numberOfLines={1}>
                    @{w.user.username}
                  </Text>
                </View>
                <Pressable
                  style={[s.hostBtn, s.hostBtnAdmit]}
                  onPress={() => admit(w.user._id)}
                >
                  <Check size={14} color="#fff" />
                </Pressable>
                <Pressable
                  style={[s.hostBtn, s.hostBtnReject]}
                  onPress={() => reject(w.user._id)}
                >
                  <X size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={s.stage}>
        {isScreenShareActive ? (
          <>
            {tracks
              .filter((t) => t.source === Track.Source.ScreenShare)
              .map((track, i) => {
                if (!isTrackReference(track)) return null;
                return (
                  <View key={`ss-${i}`} style={s.screenShareTile}>
                    <VideoView
                      style={s.video}
                      videoTrack={
                        track.publication?.track as VideoTrack | undefined
                      }
                      objectFit="contain"
                    />
                    <Text style={s.tileLabel}>
                      {track.participant?.name ||
                        track.participant?.identity ||
                        'Participant'}
                      's screen
                    </Text>
                  </View>
                );
              })}

            <View style={s.tilesRow}>
              {remoteCameras.map((track, i) => {
                if (!isTrackReference(track)) {
                  return (
                    <View key={`ph-${i}`} style={s.smallTile}>
                      <Text style={s.tileLabelSmall}>
                        {track.participant?.name ||
                          track.participant?.identity ||
                          '?'}
                      </Text>
                    </View>
                  );
                }
                return (
                  <View key={`t-${i}`} style={s.smallTile}>
                    <VideoView
                      style={s.video}
                      videoTrack={
                        track.publication?.track as VideoTrack | undefined
                      }
                      objectFit="cover"
                    />
                    <Text style={s.tileLabelSmall}>
                      {track.participant?.name ||
                        track.participant?.identity ||
                        '?'}
                    </Text>
                  </View>
                );
              })}
            </View>

            {myCamera && (
              <View style={s.selfView}>
                <VideoView
                  style={s.video}
                  videoTrack={
                    myCamera.publication?.track as VideoTrack | undefined
                  }
                  mirror
                  objectFit="cover"
                />
                <Text style={s.selfViewLabel}>You</Text>
              </View>
            )}
          </>
        ) : (
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
                    videoTrack={
                      track.publication?.track as VideoTrack | undefined
                    }
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
        )}
      </View>

      <View style={s.controls}>
        <Pressable
          style={[
            s.control,
            muted ? s.controlDefault : s.controlActive,
            togglingMic && { opacity: 0.5 },
          ]}
          onPress={toggleMic}
          disabled={togglingMic}
        >
          {muted ? (
            <MicOff size={22} color="#fff" />
          ) : (
            <Mic size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable
          style={[
            s.control,
            cameraOn ? s.controlActive : s.controlDefault,
            togglingCamera && { opacity: 0.5 },
          ]}
          onPress={toggleCamera}
          disabled={togglingCamera}
        >
          {cameraOn ? (
            <VideoIcon size={22} color="#fff" />
          ) : (
            <VideoOff size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable
          style={[s.control, s.controlDefault]}
          onPress={shareScreen}
          disabled={togglingShare}
        >
          <MonitorUp size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={[s.control, s.controlDefault]}
          onPress={openWhiteboard}
        >
          <PenTool size={22} color="#fff" />
        </Pressable>

        <Pressable style={[s.control, s.controlEnd]} onPress={confirmLeave}>
          <PhoneOff size={22} color="#fff" />
        </Pressable>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0c18' },
  room: { flex: 1, backgroundColor: '#0e0c18' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  loadingText: { color: '#aaa', marginTop: spacing.lg, fontSize: font.md },
  errorTitle: {
    color: '#fff',
    fontSize: font.xl,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontSize: font.md,
    maxWidth: 320,
  },
  leaveBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  leaveBtnText: { color: '#fff', fontWeight: '800' },
  leaveOutlineBtn: {
    borderWidth: 1,
    borderColor: '#3a3451',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.xl,
  },
  leaveOutlineBtnText: { color: '#fff', fontWeight: '700' },

  expoGoIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(109, 66, 216, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },

  waitingSpinner: {
    width: 56,
    height: 56,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: colors.purple,
    borderRadius: 28,
    marginBottom: spacing.lg,
  },
  waitingTitle: {
    color: '#fff',
    fontSize: font.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  waitingSub: {
    color: '#9b94b8',
    fontSize: font.md,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  waitingHint: {
    color: '#6b6480',
    fontSize: font.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 260,
  },

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
    marginBottom: spacing.sm,
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

  hostPanel: {
    position: 'absolute',
    top: 70,
    right: 12,
    left: 12,
    zIndex: 30,
    backgroundColor: 'rgba(20, 17, 32, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radii.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  hostPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  hostPanelTitle: {
    color: '#d5cfe6',
    fontSize: font.sm,
    fontWeight: '800',
  },
  hostPanelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 6,
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarText: { color: '#fff', fontWeight: '800', fontSize: font.md },
  hostName: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  hostSub: { color: '#9b94b8', fontSize: 11 },
  hostBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostBtnAdmit: { backgroundColor: colors.green },
  hostBtnReject: { backgroundColor: colors.danger },

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
  screenShareTile: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: spacing.sm,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    height: 120,
    marginBottom: spacing.sm,
  },
  smallTile: {
    flex: 1,
    backgroundColor: '#201c2e',
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
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
  tileLabelSmall: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },

  selfView: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 110,
    height: 155,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#201c2e',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  selfViewLabel: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '700',
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    flexWrap: 'wrap',
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