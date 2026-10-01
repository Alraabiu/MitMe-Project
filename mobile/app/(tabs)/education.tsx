import { useCallback, useMemo, useState } from 'react';
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
import {
  GraduationCap,
  Plus,
  Hash,
  School as SchoolIcon,
  ChevronRight,
  Users,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { listSchools } from '../../src/services/schools';
import { spacing, radii, font, weights, type ThemePalette } from '../../src/theme';
import type { School } from '../../src/types';

type IconProps = { color?: string; size?: number };
const IconSchool = SchoolIcon as unknown as React.ComponentType<IconProps>;
const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconHash = Hash as unknown as React.ComponentType<IconProps>;
const IconChevron = ChevronRight as unknown as React.ComponentType<IconProps>;
const IconUsers = Users as unknown as React.ComponentType<IconProps>;
const IconGraduation = GraduationCap as unknown as React.ComponentType<IconProps>;

export default function EducationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, gradients } = useTheme();

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const load = useCallback(async () => {
    try {
      const list = await listSchools();
      setSchools(list);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to load schools.';
      Alert.alert('Education', msg);
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

  if (!user) return null;

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={s.loadingText}>Loading your schools...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.purple}
            colors={[colors.purple]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Education</Text>
            <Text style={s.sub}>
              Create a school or join a class with a code
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actionsRow}>
          <Pressable
            onPress={() => router.push('/schools/create')}
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
              <Text style={s.actionText}>Create School</Text>
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
            <Text style={s.actionTextSecondary}>Join Class</Text>
          </Pressable>
        </View>

        {/* Empty state */}
        {schools.length === 0 && (
          <View style={s.tipCard}>
            <View style={s.tipIcon}>
              <IconGraduation color={colors.purple} size={26} />
            </View>
            <Text style={s.tipTitle}>Start your school</Text>
            <Text style={s.tipText}>
              Create a school for your students. Add classes, invite learners,
              and approve who joins.
            </Text>
          </View>
        )}

        {/* School list */}
        {schools.length > 0 && (
          <View>
            <Text style={s.sectionLabel}>
              {schools.length} {schools.length === 1 ? 'school' : 'schools'}
            </Text>

            {schools.map((sc) => {
              const owner =
                typeof sc.owner === 'object' ? sc.owner : null;
              const classCount = sc.classCount ?? 0;

              return (
                <Pressable
                  key={sc._id}
                  onPress={() => router.push(`/schools/${sc._id}`)}
                  style={({ pressed }) => [
                    s.card,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View
                    style={[
                      s.cardAccent,
                      { backgroundColor: sc.coverColor || colors.purple },
                    ]}
                  />
                  <View style={s.cardBody}>
                    <View style={s.cardTitleRow}>
                      <View style={s.cardIconWrap}>
                        <IconSchool
                          color={colors.purple}
                          size={18}
                        />
                      </View>
                      <Text style={s.cardTitle} numberOfLines={1}>
                        {sc.name}
                      </Text>
                    </View>

                    {sc.description ? (
                      <Text style={s.cardDesc} numberOfLines={2}>
                        {sc.description}
                      </Text>
                    ) : null}

                    <View style={s.cardMeta}>
                      <Text style={s.cardMetaText}>
                        Code: <Text style={s.cardCode}>{sc.code}</Text>
                      </Text>
                      <View style={s.cardMetaRight}>
                        <IconUsers color={colors.muted} size={11} />
                        <Text style={s.cardMetaText}>
                          {classCount} {classCount === 1 ? 'class' : 'classes'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.cardFooter}>
                      <Text style={s.cardOwner}>
                        Owner: {owner?.displayName || owner?.username || 'You'}
                      </Text>
                      <IconChevron color={colors.muted} size={16} />
                    </View>
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

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */

const makeStyles = (colors: ThemePalette) =>
  StyleSheet.create({
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
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: colors.ink,
    },
    sub: { marginTop: 4, fontSize: 13, color: colors.muted },

    /* Actions row */
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
    },
    actionText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    actionBtnSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.purple,
      backgroundColor: colors.surface,
    },
    actionTextSecondary: {
      color: colors.purple,
      fontWeight: '800',
      fontSize: 13,
    },

    /* Tip card */
    tipCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipIcon: {
      width: 60,
      height: 60,
      borderRadius: 20,
      backgroundColor: colors.purpleSoft,
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
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardAccent: { width: 6 },
    cardBody: { flex: 1, padding: spacing.lg },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: colors.ink,
    },
    cardDesc: {
      marginTop: 6,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
    cardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    cardMetaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardMetaText: { fontSize: 11, color: colors.muted },
    cardCode: { color: colors.purple, fontWeight: '800' },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    cardOwner: {
      fontSize: 11,
      color: colors.muted,
      fontStyle: 'italic',
    },
  });