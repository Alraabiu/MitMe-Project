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
import { GraduationCap, Plus, Hash } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { listClasses } from '../../src/services/classes';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Class } from '../../src/types';

type IconProps = { color?: string; size?: number };
const IconClasses = GraduationCap as unknown as React.ComponentType<IconProps>;
const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconHash = Hash as unknown as React.ComponentType<IconProps>;

export default function ClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>MitMe</Text>
            <Text style={s.title}>Classes</Text>
            <Text style={s.sub}>
              Create your own class or join one with a code
            </Text>
          </View>
        </View>

        {/* Actions — both always visible */}
        <View style={s.actionsRow}>
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
              <IconPlus color="#fff" size={18} />
              <Text style={s.actionText}>Create Class</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.push('/classes/join')}
            style={({ pressed }) => [
              s.actionBtnSecondary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <IconHash color={colors.purple} size={18} />
            <Text style={s.actionTextSecondary}>Join with Code</Text>
          </Pressable>
        </View>

        {/* Info banner for empty state */}
        {classes.length === 0 && (
          <View style={s.tipCard}>
            <View style={s.tipIcon}>
              <IconClasses color={colors.purple} size={22} />
            </View>
            <Text style={s.tipTitle}>Start an online class</Text>
            <Text style={s.tipText}>
              Create a class for your group, school, or study session.
              Share the code or link with anyone you want to invite.
            </Text>
          </View>
        )}

        {/* Class list */}
        {classes.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>
              {classes.length} {classes.length === 1 ? 'class' : 'classes'}
            </Text>

            {classes.map((cls) => {
              const memberCount = Array.isArray(cls.students)
                ? cls.students.length
                : 0;
              const isLiveClass = 'isLive' in cls && typeof cls.isLive === 'boolean' && cls.isLive;

              return (
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
                    <View style={s.cardTitleRow}>
                      <Text style={s.cardTitle} numberOfLines={1}>
                        {cls.name}
                      </Text>
                      {isLiveClass && (
                        <View style={s.livePill}>
                          <View style={s.liveDot} />
                          <Text style={s.livePillText}>LIVE</Text>
                        </View>
                      )}
                    </View>

                    {cls.subject ? (
                      <Text style={s.cardSubject} numberOfLines={1}>
                        {cls.subject}
                      </Text>
                    ) : null}

                    <View style={s.cardMeta}>
                      <Text style={s.cardMetaText}>
                        Code:{' '}
                        <Text style={s.cardCode}>{cls.code}</Text>
                      </Text>
                      <Text style={s.cardMetaText}>
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </Text>
                    </View>

                    <Text style={s.cardOwner}>
                      Owner: {cls.teacher?.displayName || cls.teacher?.username || 'Unknown'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
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

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.purple,
    backgroundColor: '#fff',
  },
  actionTextSecondary: {
    color: colors.purple,
    fontWeight: '800',
    fontSize: 13,
  },

  /* Tip card */
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  tipIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
    marginLeft: 4,
  },

  /* Cards */
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  cardSubject: { marginTop: 2, fontSize: 12, color: colors.muted },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  cardMetaText: { fontSize: 11, color: colors.muted },
  cardCode: { color: colors.purple, fontWeight: '800' },
  cardOwner: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.muted,
    fontStyle: 'italic',
  },

  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F7EF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#168A55',
  },
  livePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#168A55',
    letterSpacing: 0.5,
  },
});