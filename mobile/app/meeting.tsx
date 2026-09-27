import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Hand,
  PhoneOff,
  PenTool,
  MonitorUp,
} from 'lucide-react-native';
import { api } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';
import { useSocket } from '../src/hooks/useSocket';
import { colors, spacing, radii, font } from '../src/theme';

export default function MeetingScreen() {
  const router = useRouter();
  const { meetingId, title, code } = useLocalSearchParams<{
    meetingId: string;
    title?: string;
    code?: string;
  }>();
  const { user } = useAuth();
  const socket = useSocket();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('front');
  const [cameraOn, setCameraOn] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hand, setHand] = useState(false);
  const [share, setShare] = useState(false);

  // Remote participant state (shown in the top-right indicator)
  const [remoteMuted, setRemoteMuted] = useState(true);
  const [remoteCamera, setRemoteCamera] = useState(false);
  const [remoteHand, setRemoteHand] = useState(false);
  const [remoteShare, setRemoteShare] = useState(false);

  // Join room + listen for the other side's state
  useEffect(() => {
    if (!socket || !meetingId) return;

    socket.emit('meeting:join', meetingId);

    const onState = (payload: {
      userId: string;
      type: 'media' | 'hand' | 'share' | string;
      value: any;
    }) => {
      if (payload.userId === user?._id) return; // ignore our own broadcasts

      switch (payload.type) {
        case 'media':
          setRemoteMuted(!!payload.value?.muted);
          setRemoteCamera(!!payload.value?.camera);
          break;
        case 'hand':
          setRemoteHand(!!payload.value);
          break;
        case 'share':
          setRemoteShare(!!payload.value);
          break;
      }
    };

    socket.on('meeting:state', onState);

    return () => {
      socket.off('meeting:state', onState);
      socket.emit('meeting:leave', meetingId);
    };
  }, [socket, meetingId, user?._id]);

  // Request camera permission when user turns camera on
  useEffect(() => {
    if (!cameraOn) return;
    if (!permission?.granted) {
      requestPermission().then((res) => {
        if (!res.granted) {
          Alert.alert('MitMe', 'Camera permission is required for video.');
          setCameraOn(false);
        }
      });
    }
  }, [cameraOn, permission, requestPermission]);

  const broadcastState = useCallback(
    (type: string, value: unknown) => {
      if (!socket || !meetingId) return;
      socket.emit('meeting:state', { meetingId, type, value });
    },
    [socket, meetingId]
  );

  const toggleMic = () => {
    const next = !muted;
    setMuted(next);
    broadcastState('media', { muted: next, camera: cameraOn });
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    broadcastState('media', { muted, camera: next });
  };

  const toggleHand = () => {
    const next = !hand;
    setHand(next);
    broadcastState('hand', next);
  };

  const toggleShare = () => {
    const next = !share;
    setShare(next);
    broadcastState('share', next);
  };

  const leave = async () => {
    try {
      if (meetingId) {
        await api.post(`/meetings/${meetingId}/leave`);
      }
    } catch {
      /* ignore */
    }
    socket?.emit('meeting:leave', meetingId);
    router.back();
  };

  const confirmLeave = () => {
    Alert.alert('Leave meeting?', 'You can rejoin with the same code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
  };

  // Build remote state labels as plain text (no emoji, safe for ASCII)
  const remoteLabels: string[] = [];
  if (!remoteMuted) remoteLabels.push('Live');
  else remoteLabels.push('Muted');
  if (remoteCamera) remoteLabels.push('Cam On');
  if (remoteHand) remoteLabels.push('Hand');
  if (remoteShare) remoteLabels.push('Sharing');
  const remoteText = remoteLabels.join(' | ');

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <RNStatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title || 'Meeting'}
          </Text>
          <Text style={s.code}>{code || ''}</Text>
        </View>
        <View style={s.liveDot} />
      </View>

      {/* Video stage */}
      <View style={s.stage}>
        {cameraOn && permission?.granted ? (
          <CameraView style={s.camera} facing={facing} />
        ) : (
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={s.name}>{user.displayName}</Text>
            <Text style={s.stateLabel}>{muted ? 'Muted' : 'Live'}</Text>
          </View>
        )}

        {/* Remote participant indicator (top-right) */}
        <View style={s.remoteIndicator}>
          <View
            style={[
              s.remoteDot,
              { backgroundColor: remoteMuted ? '#888' : colors.green },
            ]}
          />
          <Text style={s.remoteText} numberOfLines={1}>
            Other: {remoteText}
          </Text>
        </View>

        {/* Local overlays (top-left) */}
        <View style={s.overlays}>
          {muted && (
            <View style={s.overlayPill}>
              <MicOff size={14} color="#fff" />
              <Text style={s.overlayText}>Muted</Text>
            </View>
          )}
          {hand && (
            <View style={[s.overlayPill, { backgroundColor: '#f0a04b' }]}>
              <Hand size={14} color="#fff" />
              <Text style={s.overlayText}>Raised</Text>
            </View>
          )}
          {share && (
            <View style={[s.overlayPill, { backgroundColor: colors.blue }]}>
              <MonitorUp size={14} color="#fff" />
              <Text style={s.overlayText}>Sharing</Text>
            </View>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Pressable
          style={({ pressed }) => [
            s.control,
            muted ? s.controlDefault : s.controlActive,
            pressed && { opacity: 0.85 },
          ]}
          onPress={toggleMic}
        >
          {muted ? (
            <MicOff size={22} color="#fff" />
          ) : (
            <Mic size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.control,
            cameraOn ? s.controlActive : s.controlDefault,
            pressed && { opacity: 0.85 },
          ]}
          onPress={toggleCamera}
        >
          {cameraOn ? (
            <VideoIcon size={22} color="#fff" />
          ) : (
            <VideoOff size={22} color="#fff" />
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.control,
            hand ? s.controlWarn : s.controlDefault,
            pressed && { opacity: 0.85 },
          ]}
          onPress={toggleHand}
        >
          <Hand size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.control,
            share ? s.controlActive : s.controlDefault,
            pressed && { opacity: 0.85 },
          ]}
          onPress={toggleShare}
        >
          <MonitorUp size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.control,
            s.controlDefault,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            if (!meetingId) return;
            router.push({
              pathname: '/meeting-whiteboard',
              params: { meetingId },
            });
          }}
        >
          <PenTool size={22} color="#fff" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.leave, pressed && { opacity: 0.85 }]}
          onPress={confirmLeave}
        >
          <PhoneOff size={22} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0e0c18' },
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
  stage: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: '#201c2e',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarWrap: { alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: '#fff', fontSize: 40, fontWeight: '900' },
  name: { color: '#fff', fontSize: font.lg, fontWeight: '700' },
  stateLabel: { color: '#aaa', marginTop: 4, fontSize: font.sm },
  overlays: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  overlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  overlayText: { color: '#fff', fontSize: font.sm, fontWeight: '700' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  controlWarn: { backgroundColor: '#f0a04b' },
  leave: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  remoteIndicator: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    maxWidth: '55%',
  },
  remoteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  remoteText: {
    color: '#fff',
    fontSize: font.sm,
    fontWeight: '700',
  },
});
