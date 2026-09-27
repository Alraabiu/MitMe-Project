import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { listClasses } from '../../src/services/classes';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Class } from '../../src/types';

export default function ClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const role = String(user?.role || 'student').toLowerCase();
  const isTeacher = role === 'teacher' || role === 'admin';
  const isStudent = role === 'student';

  const load = useCallback(async () => {
    try {
      const list = await listClasses();
      setClasses(list);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to load classes.';
      Alert.alert('Classes', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={s.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>MitMe</Text>
            <Text style={s.title}>Classes</Text>
            <Text style={s.sub}>
              {isTeacher
                ? 'Manage your classes'
                : 'Your enrolled classes'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actionsRow}>
          {isTeacher && (
            <Pressable
              onPress={() => router.push('/classes/create')}
              style={({ pressed }) => [
                s.actionBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <LinearGradient
                colors={[colors.purple, colors.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionInner}
              >
                <Text style={s.actionText}>+ Create Class</Text>
              </LinearGradient>
            </Pressable>
          )}

          {isStudent && (
            <Pressable
              onPress={() => router.push('/classes/join')}
              style={({ pressed }) => [
                s.actionBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <LinearGradient
                colors={[colors.purple, colors.blue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.actionInner}
              >
                <Text style={s.actionText}>+ Join Class</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* List */}
        {classes.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No classes yet</Text>
            <Text style={s.emptyText}>
              {isTeacher
                ? 'Create your first class to get started.'
                : 'Join a class using the code from your teacher.'}
            </Text>
          </View>
        ) : (
          classes.map((cls) => (
            <Pressable
              key={cls._id}
              onPress={() => router.push(`/classes/${cls._id}`)}
              style={({ pressed }) => [
                s.card,
                pressed && { opacity: 0.9 },
              ]}
            >
              <View
                style={[
                  s.cardAccent,
                  { backgroundColor: cls.coverColor || colors.purple },
                ]}
              />
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {cls.name}
                </Text>
                {cls.subject ? (
                  <Text style={s.cardSubject} numberOfLines={1}>
                    {cls.subject}
                  </Text>
                ) : null}
                <View style={s.cardMeta}>
                  <Text style={s.cardMetaText}>
                    Code: <Text style={s.cardCode}>{cls.code}</Text>
                  </Text>
                  <Text style={s.cardMetaText}>
                    {Array.isArray(cls.students) ? cls.students.length : 0}{' '}
                    students
                  </Text>
                </View>
                <Text style={s.cardTeacher}>
                  By {cls.teacher?.displayName || cls.teacher?.username || 'Teacher'}
                </Text>
              </View>
            </Pressable>
          ))
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
  loadingText: { marginTop: 12, color: colors.muted, fontSize: 14 },

  header: { marginBottom: spacing.lg },
  eyebrow: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 4,
    fontSize: 28,
    fontWeight: '900',
    color: colors.ink,
  },
  sub: { marginTop: 4, fontSize: 13, color: colors.muted },

  actionsRow: { flexDirection: 'row', marginBottom: spacing.lg },
  actionBtn: { flex: 1, borderRadius: radii.md, overflow: 'hidden' },
  actionInner: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: font.md },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radii.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardAccent: { width: 6 },
  cardBody: { flex: 1, padding: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  cardSubject: { marginTop: 2, fontSize: 12, color: colors.muted },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardMetaText: { fontSize: 11, color: colors.muted },
  cardCode: { color: colors.purple, fontWeight: '800' },
  cardTeacher: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },

  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
