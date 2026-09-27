import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Video, CalendarDays } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Meeting } from '../../src/types';

export default function MeetingsTab() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ meetings: Meeting[] }>('/meetings');
      setMeetings(r.data.meetings);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
    if (!code.trim()) {
      return Alert.alert('MitMe', 'Enter a meeting code.');
    }
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

  const open = async (m: Meeting) => {
    try {
      await api.post(`/meetings/${m._id}/join`);
      router.push({
        pathname: '/meeting',
        params: { meetingId: m._id, title: m.title, code: m.code },
      });
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Could not open meeting');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.h1}>Meetings</Text>
      </View>

      {/* Create action */}
      <Pressable
        style={({ pressed }) => [s.action, pressed && { opacity: 0.9 }]}
        onPress={createMeeting}
        disabled={busy}
      >
        <View style={s.actionIcon}>
          <Plus size={22} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.actionTitle}>New meeting</Text>
          <Text style={s.actionSub}>Start an instant room</Text>
        </View>
      </Pressable>

      {/* Join by code */}
      <View style={s.joinCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.joinLabel}>Join with code</Text>
          <TextInput
            style={s.joinInput}
            placeholder="Meeting ID"
            placeholderTextColor={colors.muted}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>
        <Pressable
          style={({ pressed }) => [s.joinBtn, pressed && { opacity: 0.85 }]}
          onPress={joinMeeting}
          disabled={busy}
        >
          <Text style={s.joinBtnText}>Join</Text>
        </Pressable>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.purple} />
        </View>
      ) : meetings.length === 0 ? (
        <View style={s.center}>
          <CalendarDays size={48} color={colors.muted} opacity={0.4} />
          <Text style={s.emptyTitle}>No meetings yet</Text>
          <Text style={s.emptyText}>
            Create one to start collaborating.
          </Text>
        </View>
      ) : (
        <FlatList
          data={meetings}
          keyExtractor={(m) => m._id}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <Text style={s.section}>Recent & upcoming</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
              onPress={() => open(item)}
            >
              <View style={s.rowIcon}>
                <Video size={18} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={s.rowSub} numberOfLines={1}>
                  {item.code} ? {item.status}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  h1: { fontSize: font.xxl, fontWeight: '800', color: colors.ink },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.purple,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { color: '#fff', fontWeight: '800', fontSize: font.lg },
  actionSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.sm, marginTop: 2 },
  joinCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  joinLabel: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  joinInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: font.md,
    color: colors.ink,
  },
  joinBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  joinBtnText: { color: '#fff', fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptyText: { color: colors.muted, marginTop: 4, textAlign: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 100 },
  section: {
    fontSize: font.sm,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0ebff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontWeight: '800', color: colors.ink, fontSize: font.md },
  rowSub: { color: colors.muted, fontSize: font.sm, marginTop: 2 },
});
