import React, { useCallback, useMemo, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Video,
  ChevronRight,
  Clock,
  Users as UsersIcon,
  MessageSquare,
  GraduationCap,
  Zap,
} from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { spacing, radii, font, weights, type ThemePalette } from '../../src/theme';
import type { Meeting } from '../../src/types';

type IconProps = { color?: string; size?: number };
const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconVideo = Video as unknown as React.ComponentType<IconProps>;
const IconChevron = ChevronRight as unknown as React.ComponentType<IconProps>;
const IconClock = Clock as unknown as React.ComponentType<IconProps>;
const IconUsers = UsersIcon as unknown as React.ComponentType<IconProps>;
const IconMessage = MessageSquare as unknown as React.ComponentType<IconProps>;
const IconClasses = GraduationCap as unknown as React.ComponentType<IconProps>;
const IconZap = Zap as unknown as React.ComponentType<IconProps>;

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const makeStatusStyles = (colors: ThemePalette): Record<string, StatusStyle> => ({
  scheduled: {
    bg: colors.purpleSoft,
    text: colors.purpleLight,
    label: 'Scheduled',
  },
  live: {
    bg: colors.successSoft,
    text: colors.success,
    label: 'Live',
  },
  ended: {
    bg: colors.surfaceHover,
    text: colors.muted,
    label: 'Ended',
  },
  cancelled: {
    bg: colors.dangerSoft,
    text: colors.danger,
    label: 'Cancelled',
  },
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export default function HomeTab() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors, gradients } = useTheme();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);
  const STATUS_STYLES = useMemo(() => makeStatusStyles(colors), [colors]);

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
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not join meeting'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  const firstName = user.displayName.split(' ')[0];
  const visible = meetings.slice(0, 5);
  const isOnline = user.presence === 'online' || !user.presence;
  const liveCount = meetings.filter((m) => m.status === 'live').length;

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
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greetingSmall}>{getGreeting()}</Text>
            <Text style={s.greeting} numberOfLines={1}>
              {firstName}
            </Text>
          </View>

          <View style={s.avatarWrap}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.avatarRing}
            >
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {user.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
            {isOnline && <View style={s.onlineDot} />}
          </View>
        </View>

        {/* Hero card */}
        <Pressable
          onPress={createMeeting}
          disabled={busy}
          style={({ pressed }) => [pressed && { opacity: 0.94 }]}
        >
          <View style={s.heroWrap}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.hero}
            >
              <View style={s.heroGlow} />

              <View style={s.heroTop}>
                <View style={s.heroIconWrap}>
                  <IconPlus color="#fff" size={22} />
                </View>
                <IconChevron color="rgba(255,255,255,0.7)" size={20} />
              </View>

              <View style={s.heroBottom}>
                <Text style={s.heroTitle}>Start instant meeting</Text>
                <Text style={s.heroSub}>Jump into a room in one tap</Text>
              </View>
            </LinearGradient>
          </View>
        </Pressable>

        {/* Join meeting */}
        <View style={s.joinCard}>
          <View style={s.joinRow}>
            <View style={s.joinIcon}>
              <IconVideo color={colors.blueLight} size={18} />
            </View>
            <TextInput
              style={s.joinInput}
              placeholder="Enter meeting code"
              placeholderTextColor={colors.mutedDim}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={joinMeeting}
            />
            <Pressable
              onPress={joinMeeting}
              disabled={busy || !code.trim()}
              style={({ pressed }) => [
                s.joinBtnWrap,
                (!code.trim() || busy) && { opacity: 0.35 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <LinearGradient
                colors={gradients.blueOnly}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.joinBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.joinBtnText}>Join</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <IconVideo color={colors.purpleLight} size={14} />
            <Text style={s.statChipValue}>{meetings.length}</Text>
            <Text style={s.statChipLabel}>Meetings</Text>
          </View>
          <View style={s.statChip}>
            <IconZap color={colors.blueLight} size={14} />
            <Text style={s.statChipValue}>{liveCount}</Text>
            <Text style={s.statChipLabel}>Live</Text>
          </View>
          <View style={s.statChip}>
            <IconUsers
              color={isOnline ? colors.success : colors.mutedDim}
              size={14}
            />
            <Text
              style={[
                s.statChipValue,
                { color: isOnline ? colors.success : colors.muted },
              ]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            <Text style={s.statChipLabel}>Status</Text>
          </View>
        </View>

        {/* Recent meetings */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent meetings</Text>
          {meetings.length > 5 && (
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
            <LinearGradient
              colors={gradients.brandSoft}
              style={s.emptyIconWrap}
            >
              <IconVideo color={colors.purpleLight} size={26} />
            </LinearGradient>
            <Text style={s.emptyTitle}>No meetings yet</Text>
            <Text style={s.emptyText}>
              Your meetings will appear here. Start your first room.
            </Text>
            <Pressable
              onPress={createMeeting}
              style={({ pressed }) => [
                s.emptyBtnWrap,
                pressed && { opacity: 0.92 },
              ]}
            >
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.emptyBtn}
              >
                <IconPlus color="#fff" size={16} />
                <Text style={s.emptyBtnText}>Start a meeting</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <View style={s.listWrap}>
            {visible.map((m, idx) => {
              const status =
                STATUS_STYLES[m.status] ?? STATUS_STYLES.scheduled;
              const isLast = idx === visible.length - 1;
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
                    !isLast && s.meetingRowDivider,
                    pressed && { backgroundColor: colors.surfaceHover },
                  ]}
                >
                  <LinearGradient
                    colors={gradients.brandSoft}
                    style={s.meetingIcon}
                  >
                    <IconVideo color={colors.purpleLight} size={18} />
                  </LinearGradient>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.meetingTitle} numberOfLines={1}>
                      {m.title}
                    </Text>
                    <View style={s.meetingMetaRow}>
                      <IconClock color={colors.mutedDim} size={11} />
                      <Text style={s.meetingMeta} numberOfLines={1}>
                        {m.code}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[s.badge, { backgroundColor: status.bg }]}
                  >
                    <Text style={[s.badgeText, { color: status.text }]}>
                      {status.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Quick actions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Quick actions</Text>
        </View>

        <View style={s.shortcutRow}>
          <Pressable
            style={({ pressed }) => [
              s.shortcut,
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <View
              style={[s.shortcutIcon, { backgroundColor: colors.purpleSoft }]}
            >
              <IconMessage color={colors.purpleLight} size={18} />
            </View>
            <Text style={s.shortcutLabel}>Messages</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.shortcut,
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
            onPress={() => router.push('/(tabs)/contacts')}
          >
            <View
              style={[s.shortcutIcon, { backgroundColor: colors.blueSoft }]}
            >
              <IconUsers color={colors.blueLight} size={18} />
            </View>
            <Text style={s.shortcutLabel}>Contacts</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.shortcut,
              pressed && { backgroundColor: colors.surfaceHover },
            ]}
            onPress={() => router.push('/(tabs)/classes')}
          >
            <View
              style={[s.shortcutIcon, { backgroundColor: colors.successSoft }]}
            >
              <IconClasses color={colors.success} size={18} />
            </View>
            <Text style={s.shortcutLabel}>Classes</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES — built from the active theme palette
   ═══════════════════════════════════════════════════ */

const makeStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    content: {
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xxl,
    },
    greetingSmall: {
      color: colors.muted,
      fontSize: font.sm,
      fontWeight: weights.semibold,
      letterSpacing: 0.2,
    },
    greeting: {
      fontSize: font.huge,
      fontWeight: weights.extrabold,
      color: colors.inkStrong,
      letterSpacing: -1,
      marginTop: 2,
    },
    avatarWrap: { position: 'relative' },
    avatarRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      padding: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
      backgroundColor: colors.bgElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.inkStrong,
      fontWeight: weights.extrabold,
      fontSize: font.xl,
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.success,
      borderWidth: 3,
      borderColor: colors.bg,
    },

    /* Hero card */
    heroWrap: {
      borderRadius: radii.xxl,
      marginBottom: spacing.md,
    },
    hero: {
      borderRadius: radii.xxl,
      padding: spacing.xl,
      minHeight: 165,
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'relative',
    },
    heroGlow: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: 'rgba(255,255,255,0.10)',
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 2,
    },
    heroIconWrap: {
      width: 46,
      height: 46,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    heroBottom: { zIndex: 2 },
    heroTitle: {
      color: '#fff',
      fontSize: font.xl,
      fontWeight: weights.extrabold,
      letterSpacing: -0.4,
    },
    heroSub: {
      color: 'rgba(255,255,255,0.78)',
      fontSize: font.sm,
      marginTop: 4,
      fontWeight: weights.medium,
    },

    /* Join meeting */
    joinCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: radii.xl,
      padding: spacing.sm,
      marginBottom: spacing.lg,
    },
    joinRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    joinIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.blueSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    joinInput: {
      flex: 1,
      paddingVertical: spacing.md,
      color: colors.inkStrong,
      fontSize: font.md,
      fontWeight: weights.semibold,
      letterSpacing: 0.5,
    },
    joinBtnWrap: {
      borderRadius: radii.md,
      overflow: 'hidden',
    },
    joinBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 70,
    },
    joinBtnText: {
      color: '#fff',
      fontWeight: weights.extrabold,
      fontSize: font.sm,
      letterSpacing: 0.4,
    },

    /* Quick stats */
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    statChip: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: 4,
    },
    statChipValue: {
      color: colors.inkStrong,
      fontSize: font.lg,
      fontWeight: weights.extrabold,
      textTransform: 'capitalize',
      letterSpacing: -0.3,
      marginTop: 6,
    },
    statChipLabel: {
      color: colors.mutedDim,
      fontSize: 10,
      fontWeight: weights.semibold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    /* Section headers */
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      fontSize: font.lg,
      fontWeight: weights.extrabold,
      color: colors.inkStrong,
      letterSpacing: -0.3,
    },
    sectionLink: {
      color: colors.purpleLight,
      fontWeight: weights.bold,
      fontSize: font.sm,
    },

    /* Meeting list */
    listWrap: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    meetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    meetingRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    meetingIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    meetingTitle: {
      fontSize: font.md,
      fontWeight: weights.bold,
      color: colors.inkStrong,
      letterSpacing: -0.2,
    },
    meetingMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    meetingMeta: {
      color: colors.mutedDim,
      fontSize: font.xs,
      fontWeight: weights.semibold,
      letterSpacing: 0.4,
    },
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radii.pill,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: weights.bold,
      letterSpacing: 0.3,
      textTransform: 'capitalize',
    },

    /* Empty state */
    emptyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: radii.xl,
      padding: spacing.xxl,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    emptyIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    emptyTitle: {
      fontSize: font.lg,
      fontWeight: weights.extrabold,
      color: colors.inkStrong,
    },
    emptyText: {
      color: colors.muted,
      fontSize: font.base,
      textAlign: 'center',
      marginTop: 8,
      maxWidth: 260,
      lineHeight: 20,
    },
    emptyBtnWrap: {
      borderRadius: radii.md,
      overflow: 'hidden',
      marginTop: spacing.lg,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    emptyBtnText: {
      color: '#fff',
      fontWeight: weights.extrabold,
      fontSize: font.sm,
    },

    /* Shortcuts */
    shortcutRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    shortcut: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: radii.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    shortcutIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shortcutLabel: {
      color: colors.ink,
      fontSize: font.sm,
      fontWeight: weights.bold,
      letterSpacing: 0.2,
    },
  });