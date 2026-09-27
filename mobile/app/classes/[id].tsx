import { useCallback, useState } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  getClass,
  leaveClass,
  archiveClass,
  removeStudent,
  buildClassShareLink,
  buildClassShareMessage,
} from '../../src/services/classes';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Class, ClassStudent } from '../../src/types';

interface ActiveMeeting {
  _id: string;
  code: string;
  title: string;
  host?: { displayName?: string; username?: string };
}

export default function ClassDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [cls, setCls] = useState<Class | null>(null);
  const [meeting, setMeeting] = useState<ActiveMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);

  const role = String(user?.role || 'student').toLowerCase();
  const isStudent = role === 'student';
  const isOwner = cls && user && String(cls.teacher?._id) === String(user._id);

  const load = useCallback(async () => {
    try {
      if (!id) throw new Error('Missing class ID');
      const [data, meetingRes] = await Promise.all([
        getClass(String(id)),
        api.get(`/classes/${id}/meeting`).catch(() => null),
      ]);
      setCls(data);
      const m = (meetingRes?.data as any)?.data?.meeting ?? null;
      setMeeting(m);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to load this class.';
      Alert.alert('Class', msg, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 8000);
      return () => clearInterval(interval);
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* =========================================================
     SHARE / COPY
     ========================================================= */

  const copyCode = async () => {
    if (!cls) return;
    await Clipboard.setStringAsync(cls.code);
    Alert.alert('Copied', 'Class code copied to clipboard.');
  };

  const copyLink = async () => {
    if (!cls) return;
    await Clipboard.setStringAsync(buildClassShareLink(cls.code));
    Alert.alert('Copied', 'Share link copied to clipboard.');
  };

  const shareClass = async () => {
    if (!cls) return;
    try {
      await Share.share({
        message: buildClassShareMessage(cls.name, cls.code),
        title: cls.name,
      });
    } catch {
      /* user dismissed */
    }
  };

  /* =========================================================
     LIVE CLASS
     ========================================================= */

  const startLiveClass = async () => {
    try {
      setStarting(true);
      const r = await api.post(`/classes/${id}/meeting`);
      const m = (r.data as any)?.data?.meeting;
      if (!m) throw new Error('Meeting was not created.');

      router.push({
        pathname: '/meeting',
        params: {
          meetingId: m._id,
          title: m.title,
          code: m.code,
        },
      });
    } catch (e: any) {
      Alert.alert(
        'Live Class',
        e?.response?.data?.message || e?.message || 'Unable to start session.'
      );
    } finally {
      setStarting(false);
    }
  };

  const joinLiveClass = async () => {
    if (!meeting) return;
    try {
      await api.post(`/meetings/${meeting._id}/join`);
      router.push({
        pathname: '/meeting',
        params: {
          meetingId: meeting._id,
          title: meeting.title,
          code: meeting.code,
        },
      });
    } catch (e: any) {
      Alert.alert(
        'Live Class',
        e?.response?.data?.message || e?.message || 'Unable to join session.'
      );
    }
  };

  const endLiveClass = () => {
    Alert.alert('End live session?', 'Students will be disconnected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post(`/classes/${id}/meeting/end`);
            setMeeting(null);
          } catch (e: any) {
            Alert.alert(
              'Error',
              e?.response?.data?.message || 'Unable to end session.'
            );
          }
        },
      },
    ]);
  };

  /* =========================================================
     MEMBERSHIP ACTIONS
     ========================================================= */

  const handleLeave = () => {
    Alert.alert('Leave class?', 'You will need the class code to rejoin.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusy(true);
            await leaveClass(String(id));
            Alert.alert('Done', 'You left the class.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (e: any) {
            Alert.alert(
              'Error',
              e?.response?.data?.message || 'Unable to leave class.'
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive class?',
      'Students will no longer see this class.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await archiveClass(String(id));
              Alert.alert('Archived', 'Class archived.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Unable to archive class.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveStudent = (student: ClassStudent | string) => {
    const sid = typeof student === 'string' ? student : student._id;
    const name =
      typeof student === 'string'
        ? sid
        : student.displayName || student.username;

    Alert.alert('Remove student?', 'Remove ' + name + ' from this class?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeStudent(String(id), sid);
            await load();
          } catch (e: any) {
            Alert.alert(
              'Error',
              e?.response?.data?.message || 'Unable to remove student.'
            );
          }
        },
      },
    ]);
  };

  /* =========================================================
     LOADING
     ========================================================= */

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  if (!cls) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loading}>
          <Text style={s.loadingText}>Class not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.purple, fontWeight: '700' }}>
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const students: (ClassStudent | string)[] = Array.isArray(cls.students)
    ? cls.students
    : [];

  const studentCount = students.length;
  const isLive = Boolean(meeting);
  const shareLink = buildClassShareLink(cls.code);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={s.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <Text style={s.topTitle} numberOfLines={1}>
            Class Details
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero */}
        <View
          style={[
            s.heroCard,
            { backgroundColor: cls.coverColor || colors.purple },
          ]}
        >
          {isLive && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE NOW</Text>
            </View>
          )}
          <Text style={s.heroName} numberOfLines={2}>
            {cls.name}
          </Text>
          {cls.subject ? (
            <Text style={s.heroSubject}>{cls.subject}</Text>
          ) : null}

          {/* Share card: Code + Link + Share button */}
          <View style={s.shareCard}>
            <View style={s.shareRow}>
              <Text style={s.shareLabel}>Code</Text>
              <Text style={s.shareValue}>{cls.code}</Text>
              <Pressable
                onPress={copyCode}
                style={({ pressed }) => [
                  s.copyBtn,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={6}
              >
                <Ionicons name="copy-outline" size={14} color="#fff" />
                <Text style={s.copyBtnText}>Copy</Text>
              </Pressable>
            </View>

            <View style={s.shareRow}>
              <Text style={s.shareLabel}>Link</Text>
              <Text style={s.shareLink} numberOfLines={1}>
                {shareLink}
              </Text>
              <Pressable
                onPress={copyLink}
                style={({ pressed }) => [
                  s.copyBtn,
                  pressed && { opacity: 0.7 },
                ]}
                hitSlop={6}
              >
                <Ionicons name="link-outline" size={14} color="#fff" />
                <Text style={s.copyBtnText}>Copy</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={shareClass}
              style={({ pressed }) => [
                s.shareBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="share-social" size={18} color={colors.purple} />
              <Text style={s.shareBtnText}>Share with class</Text>
            </Pressable>
          </View>
        </View>

        {/* Live class section (teacher) */}
        {isOwner && (
          <View style={s.liveSection}>
            <Text style={s.liveSectionTitle}>Live Teaching</Text>

            {isLive ? (
              <>
                <Pressable
                  onPress={joinLiveClass}
                  style={({ pressed }) => [
                    s.primaryBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="videocam" size={20} color="#fff" />
                  <Text style={s.primaryBtnText}>Rejoin Live Class</Text>
                </Pressable>

                <Pressable
                  onPress={endLiveClass}
                  style={({ pressed }) => [
                    s.secondaryBtn,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Ionicons name="stop-circle" size={18} color={colors.danger} />
                  <Text style={s.secondaryBtnText}>End Session</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={startLiveClass}
                disabled={starting}
                style={({ pressed }) => [
                  s.primaryBtn,
                  pressed && { opacity: 0.9 },
                  starting && { opacity: 0.6 },
                ]}
              >
                {starting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="videocam" size={20} color="#fff" />
                    <Text style={s.primaryBtnText}>Start Live Class</Text>
                  </>
                )}
              </Pressable>
            )}

            <View style={s.toolsHint}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={s.toolsHintText}>
                Whiteboard, screen share and mic controls are inside the live
                session.
              </Text>
            </View>
          </View>
        )}

        {/* Live class section (student) */}
        {isStudent && isLive && (
          <Pressable
            onPress={joinLiveClass}
            style={({ pressed }) => [
              s.primaryBtn,
              { marginBottom: spacing.md },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={s.liveDot} />
            <Text style={s.primaryBtnText}>
              Join Live Class with {meeting?.host?.displayName || 'Teacher'}
            </Text>
          </Pressable>
        )}

        {/* About */}
        {cls.description ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>About</Text>
            <Text style={s.cardText}>{cls.description}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.cardTitle}>Teacher</Text>
          <Text style={s.cardText}>
            {cls.teacher?.displayName || cls.teacher?.username || 'Teacher'}
          </Text>
        </View>

        {/* Students */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Students</Text>
            <Text style={s.cardCount}>{studentCount}</Text>
          </View>

          {studentCount === 0 ? (
            <Text style={s.emptyText}>
              No students have joined yet. Share the code or link above.
            </Text>
          ) : (
            students.map((stu, idx) => {
              const sid = typeof stu === 'string' ? stu : stu._id;
              const name =
                typeof stu === 'string'
                  ? 'Student ' + (idx + 1)
                  : stu.displayName || stu.username;
              const email = typeof stu === 'string' ? '' : stu.email || '';

              return (
                <View key={sid} style={s.studentRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {String(name).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.studentName} numberOfLines={1}>
                      {name}
                    </Text>
                    {email ? (
                      <Text style={s.studentMeta} numberOfLines={1}>
                        {email}
                      </Text>
                    ) : null}
                  </View>
                  {isOwner && (
                    <Pressable
                      onPress={() => handleRemoveStudent(stu)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="close-circle"
                        size={22}
                        color={colors.danger}
                      />
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </View>

        {isOwner && (
          <Pressable
            onPress={handleArchive}
            disabled={busy}
            style={({ pressed }) => [
              s.dangerBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={s.dangerBtnText}>Archive Class</Text>
          </Pressable>
        )}

        {isStudent && (
          <Pressable
            onPress={handleLeave}
            disabled={busy}
            style={({ pressed }) => [
              s.dangerBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={s.dangerBtnText}>Leave Class</Text>
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 30 },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: colors.muted, fontSize: 14 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  topTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
    flex: 1,
    textAlign: 'center',
  },

  heroCard: {
    borderRadius: radii.md,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.card,
    position: 'relative',
  },
  heroName: { fontSize: 24, fontWeight: '900', color: '#fff' },
  heroSubject: {
    marginTop: 4,
    fontSize: 13,
    color: '#EDE7FF',
    fontWeight: '600',
  },

  /* Share card */
  shareCard: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareLabel: {
    color: '#EDE7FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    width: 40,
  },
  shareValue: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
  },
  shareLink: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  shareBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
  },
  shareBtnText: {
    color: colors.purple,
    fontWeight: '900',
    fontSize: 13,
  },

  /* Live badge */
  liveBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* Live teaching */
  liveSection: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  liveSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    backgroundColor: colors.purple,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: font.md,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5C6C6',
  },
  secondaryBtnText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: font.md - 1,
  },
  toolsHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.sm,
  },
  toolsHintText: {
    flex: 1,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },

  /* Cards */
  card: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  cardCount: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.purple,
    backgroundColor: '#F0EBFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  cardText: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },

  emptyText: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { color: colors.purple, fontWeight: '900' },
  studentName: { fontSize: 13, fontWeight: '700', color: colors.ink },
  studentMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },

  dangerBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5C6C6',
    alignItems: 'center',
  },
  dangerBtnText: { color: '#C62828', fontWeight: '800', fontSize: font.md },
});