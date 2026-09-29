import React, { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Video,
  CalendarDays,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  colors,
  spacing,
  radii,
  font,
  weights,
  shadows,
} from '../../src/theme';
import type { Meeting } from '../../src/types';

type IconProps = { color: string; size: number };
const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconVideo = Video as unknown as React.ComponentType<IconProps>;
const IconCalendar = CalendarDays as unknown as React.ComponentType<IconProps>;
const IconChevron = ChevronRight as unknown as React.ComponentType<IconProps>;
const IconClock = Clock as unknown as React.ComponentType<IconProps>;
const IconSparkles = Sparkles as unknown as React.ComponentType<IconProps>;

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  scheduled: { bg: colors.purpleSoft, text: colors.purple, label: 'Scheduled' },
  live: { bg: colors.successSoft, text: colors.success, label: 'Live' },
  ended: { bg: colors.surfaceAlt, text: colors.muted, label: 'Ended' },
  cancelled: { bg: colors.dangerSoft, text: colors.danger, label: 'Cancelled' },
};

export default function HomeTab() {
  const { user } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ meetings: Meeting[] }>('/meetings');
      setMeetings(r.data.meetings);
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

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
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not create meeting'
      );
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

  const firstName = user.displayName.split(' ')[0];
  const visible = meetings.slice(0, 6);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetingSmall}>Welcome back</Text>
            <Text style={s.greeting} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {user.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Action cards */}
        <Pressable
          onPress={createMeeting}
          disabled={busy}
          style={({ pressed }) => [pressed && { opacity: 0.9 }]}
        >
          <LinearGradient
            colors={['#7040da', '#4e69ed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.actionPrimary}
          >
            <View style={s.actionIconWrap}>
              <IconPlus color="#fff" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>New meeting</Text>
              <Text style={s.actionSub}>Start an instant room</Text>
            </View>
            <IconChevron color="rgba(255,255,255,0.7)" size={20} />
          </LinearGradient>
        </Pressable>

        <LinearGradient
          colors={['#2469d9', '#37a0ef']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.action}
        >
          <View style={s.actionIconWrap}>
            <IconVideo color="#fff" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.actionTitle}>Join meeting</Text>
            <TextInput
              style={s.codeInput}
              placeholder="Enter meeting code"
              placeholderTextColor="rgba(255,255,255,0.65)"
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <Pressable
            onPress={joinMeeting}
            disabled={busy || !code.trim()}
            style={({ pressed }) => [
              s.joinBtn,
              (!code.trim() || busy) && { opacity: 0.4 },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={s.joinBtnText}>Join</Text>
          </Pressable>
        </LinearGradient>

        {/* Recent meetings */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent meetings</Text>
          {meetings.length > 6 && (
            <Pressable
              onPress={() => router.push('/(tabs)/meetings')}
              hitSlop={8}
            >
              <Text style={s.sectionLink}>See all</Text>
            </Pressable>
          )}
        </View>

        {visible.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIconWrap}>
              <IconCalendar color={colors.purple} size={26} />
            </View>
            <Text style={s.emptyTitle}>No meetings yet</Text>
            <Text style={s.emptyText}>
              Start your first MitMe room and it will show up here.
            </Text>
            <Pressable
              style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.9 }]}
              onPress={createMeeting}
            >
              <IconPlus color="#fff" size={16} />
              <Text style={s.emptyBtnText}>Start a meeting</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.listWrap}>
            {visible.map((m) => {
              const status =
                STATUS_STYLES[m.status] ?? STATUS_STYLES.scheduled;
              return (
                <Pressable
                  key={m._id}
                  onPress={() =>
                    router.push({
                      pathname: '/meeting',
                      params: {
                        meetingId: m._id,
                        title: m.title,
                        code: m.code,
                      },
                    })
                  }
                  style={({ pressed }) => [
                    s.meetingRow,
                    pressed && { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <View style={s.meetingIcon}>
                    <IconVideo color={colors.purple} size={18} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.meetingTitle} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <View style={s.meetingMetaRow}>
                      <IconClock color={colors.mutedLight} size={11} />
                      <Text style={s.meetingMeta} numberOfLines={1}>
                        {m.code}
                      </Text>
                    </View>
                  </View>
                  <View style={[s.badge, { backgroundColor: status.bg }]}>
                    <Text style={[s.badgeText, { color: status.text }]}>
                      {status.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Workspace card */}
        <View style={s.workspace}>
          <View style={s.workspaceHeader}>
            <View style={s.workspaceIconWrap}>
              <IconSparkles color={colors.purple} size={18} />
            </View>
            <Text style={s.workspaceTitle}>Your workspace</Text>
          </View>
          <Text style={s.workspaceText}>
            Chat, voice calls, collaborative whiteboards, and file sharing —
            all in one place, available across web and mobile.
          </Text>

          <View style={s.workspaceStats}>
            <View style={s.statCell}>
              <Text style={s.statNumber}>{meetings.length}</Text>
              <Text style={s.statLabel}>Meetings</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statNumber}>{user.presence ?? 'online'}</Text>
              <Text style={s.statLabel}>Presence</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCell}>
              <Text style={s.statNumber}>{user.role ?? 'student'}</Text>
              <Text style={s.statLabel}>Role</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  greetingSmall: {
    color: colors.muted,
    fontSize: font.sm,
    fontWeight: weights.medium,
  },
  greeting: {
    fontSize: font.xxl,
    fontWeight: weights.extrabold,
    color: colors.ink,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  avatarText: { color: '#fff', fontWeight: weights.extrabold, fontSize: font.lg },

  action: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  actionPrimary: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.card,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    color: '#fff',
    fontSize: font.lg,
    fontWeight: weights.extrabold,
  },
  actionSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: font.sm,
    marginTop: 2,
  },
  codeInput: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#fff',
    fontSize: font.md,
    fontWeight: weights.semibold,
  },
  joinBtn: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  joinBtnText: {
    color: '#fff',
    fontWeight: weights.extrabold,
    fontSize: font.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  sectionLink: {
    color: colors.purple,
    fontWeight: weights.bold,
    fontSize: font.sm,
  },

  listWrap: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  meetingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingTitle: {
    fontSize: font.md,
    fontWeight: weights.bold,
    color: colors.ink,
  },
  meetingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  meetingMeta: {
    color: colors.muted,
    fontSize: font.sm,
    fontWeight: weights.medium,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: weights.bold,
    letterSpacing: 0.2,
    textTransform: 'capitalize',
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.sm,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
  },
  emptyText: {
    color: colors.muted,
    fontSize: font.base,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 260,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.purple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: weights.extrabold,
    fontSize: font.sm,
  },

  workspace: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  workspaceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  workspaceIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspaceTitle: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
  },
  workspaceText: {
    color: colors.muted,
    fontSize: font.base,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  workspaceStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
    textTransform: 'capitalize',
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontWeight: weights.semibold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
});