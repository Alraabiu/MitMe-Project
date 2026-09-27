import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Video } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Meeting } from '../../src/types';

import type { ColorValue } from 'react-native';
// ... (add near top with other imports)

type IconProps = { color: ColorValue; size: number };const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconVideo = Video as unknown as React.ComponentType<IconProps>;

export default function HomeTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await api.get<{ meetings: Meeting[] }>('/meetings');
      setMeetings(r.data.meetings);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createMeeting = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ meeting: Meeting }>('/meetings', {
        title: 'Quick meeting',
      });
      router.push({
        pathname: '/meeting',
        params: {
          meetingId: r.data.meeting._id,
          title: r.data.meeting.title,
          code: r.data.meeting.code,
        },
      });
      load();
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Could not create meeting');
    } finally {
      setBusy(false);
    }
  };

  const joinMeeting = async () => {
    if (!code.trim()) return Alert.alert('MitMe', 'Enter a meeting code.');
    setBusy(true);
    try {
      const r = await api.post<{ meeting: Meeting }>(
        `/meetings/${code.trim()}/join`
      );
      router.push({
        pathname: '/meeting',
        params: {
          meetingId: r.data.meeting._id,
          title: r.data.meeting.title,
          code: r.data.meeting.code,
        },
      });
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Could not join meeting');
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>
              Good day, {user.displayName.split(' ')[0]}
            </Text>
            <Text style={s.tag}>Connect. Meet. Share.</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [s.actionWrap, pressed && { opacity: 0.9 }]}
          onPress={createMeeting}
          disabled={busy}
        >
          <LinearGradient
            colors={['#7040da', '#4e69ed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.action}
          >
            <IconPlus color="#fff" size={24} />
            <Text style={s.actionTitle}>New meeting</Text>
            <Text style={s.actionText}>Start an instant room</Text>
          </LinearGradient>
        </Pressable>

        <LinearGradient
          colors={['#2469d9', '#37a0ef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.action}
        >
          <IconVideo color="#fff" size={24} />
          <Text style={s.actionTitle}>Join meeting</Text>
          <TextInput
            style={s.codeInput}
            placeholder="Enter code"
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
          />
          <Pressable
            style={({ pressed }) => [s.joinBtn, pressed && { opacity: 0.85 }]}
            onPress={joinMeeting}
            disabled={busy}
          >
            <Text style={s.joinBtnText}>Join</Text>
          </Pressable>
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.section}>Upcoming & recent</Text>
          {meetings.length === 0 && (
            <Text style={s.muted}>No meetings yet. Start your first room.</Text>
          )}
          {meetings.slice(0, 6).map((m) => (
            <View key={m._id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{m.title}</Text>
                <Text style={s.muted}>
                  {m.code} ? {m.status}
                </Text>
              </View>
              <View style={s.pill}>
                <Text style={s.pillText}>{m.status}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.section}>Your workspace</Text>
          <Text style={s.muted}>
            Chat, voice calls, collaborative whiteboards, and file sharing are
            all available through MitMe.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greeting: { fontSize: font.xxl, fontWeight: '800', color: colors.ink },
  tag: { color: colors.muted, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: font.lg },
  actionWrap: { marginBottom: spacing.md, ...shadows.card },
  action: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    minHeight: 130,
    gap: 6,
  },
  actionTitle: { color: '#fff', fontSize: font.xl, fontWeight: '800', marginTop: 8 },
  actionText: { color: 'rgba(255,255,255,0.9)', fontSize: font.base },
  codeInput: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: '#fff',
    fontSize: font.md,
  },
  joinBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    marginTop: 6,
  },
  joinBtnText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  section: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  muted: { color: colors.muted, fontSize: font.base },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeaf5',
  },
  rowTitle: { fontWeight: '700', color: colors.ink },
  pill: {
    backgroundColor: '#f0ebff',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillText: { color: colors.purple, fontSize: font.sm, fontWeight: '700' },
});
