import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GraduationCap,
  Plus,
  Users,
  UserPlus,
  Check,
  X as XIcon,
  Hash,
  School as SchoolIcon,
  ChevronRight,
  UserCheck,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useSocket } from '../../src/hooks/useSocket';
import {
  getSchool,
  listSchoolRequests,
  approveSchoolRequest,
  rejectSchoolRequest,
  createStudent,
} from '../../src/services/schools';
import { spacing, radii, font, weights, type ThemePalette } from '../../src/theme';
import type { School, Class, SchoolJoinRequest } from '../../src/types';

type IconProps = { color?: string; size?: number };
const IconSchool = SchoolIcon as unknown as React.ComponentType<IconProps>;
const IconPlus = Plus as unknown as React.ComponentType<IconProps>;
const IconUsers = Users as unknown as React.ComponentType<IconProps>;
const IconUserPlus = UserPlus as unknown as React.ComponentType<IconProps>;
const IconCheck = Check as unknown as React.ComponentType<IconProps>;
const IconX = XIcon as unknown as React.ComponentType<IconProps>;
const IconHash = Hash as unknown as React.ComponentType<IconProps>;
const IconChevron = ChevronRight as unknown as React.ComponentType<IconProps>;
const IconUserCheck = UserCheck as unknown as React.ComponentType<IconProps>;
const IconGraduation = GraduationCap as unknown as React.ComponentType<IconProps>;

export default function SchoolDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, gradients } = useTheme();
  const socket = useSocket();

  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [requests, setRequests] = useState<SchoolJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Add Student modal
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newClassId, setNewClassId] = useState<string | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);

  /* ─── Load ────────────────────────────────────────── */

  const load = useCallback(async () => {
    try {
      if (!id) throw new Error('Missing school ID');
      const [detail, reqs] = await Promise.all([
        getSchool(String(id)),
        listSchoolRequests(String(id)).catch(() => []),
      ]);
      setSchool(detail.school);
      setClasses(detail.classes);
      setRequests(reqs);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to load this school.';
      Alert.alert('School', msg, [
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
    }, [load])
  );

  /* ─── Live socket updates ─────────────────────────── */

  useEffect(() => {
    if (!socket || !id) return;

    const onNewRequest = (payload: any) => {
      if (String(payload?.schoolId) !== String(id)) return;
      listSchoolRequests(String(id)).then(setRequests).catch(() => {});
    };

    const onClassCreated = () => {
      load();
    };

    socket.on('class:join-request', onNewRequest);
    socket.on('class:approved', onClassCreated);
    socket.on('class:rejected', onClassCreated);

    return () => {
      socket.off('class:join-request', onNewRequest);
      socket.off('class:approved', onClassCreated);
      socket.off('class:rejected', onClassCreated);
    };
  }, [socket, id, load]);

  /* ─── Pull to refresh ─────────────────────────────── */

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* ─── Approve / Reject ────────────────────────────── */

  const handleApprove = async (req: SchoolJoinRequest) => {
    if (!id) return;
    try {
      setBusy(true);
      await approveSchoolRequest(String(id), req.classId, req.requestId);
      setRequests((prev) =>
        prev.filter((r) => r.requestId !== req.requestId)
      );
      const detail = await getSchool(String(id));
      setClasses(detail.classes);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Unable to approve request.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (req: SchoolJoinRequest) => {
    if (!id) return;
    Alert.alert(
      'Reject request?',
      `Reject ${req.user.displayName}'s request to join ${req.className}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await rejectSchoolRequest(
                String(id),
                req.classId,
                req.requestId
              );
              setRequests((prev) =>
                prev.filter((r) => r.requestId !== req.requestId)
              );
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Unable to reject request.'
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  /* ─── Add Student ─────────────────────────────────── */

  const openAddStudent = () => {
    setNewName('');
    setNewUsername('');
    setNewPassword('');
    setNewClassId(null);
    setShowAddStudent(true);
  };

  const submitAddStudent = async () => {
    if (!id) return;
    if (!newName.trim()) {
      return Alert.alert('MitMe', 'Student name is required.');
    }
    if (newPassword.length < 8) {
      return Alert.alert('MitMe', 'Password must be at least 8 characters.');
    }

    setAddingStudent(true);
    try {
      const res = await createStudent(String(id), {
        displayName: newName.trim(),
        username: newUsername.trim() || undefined,
        password: newPassword,
        classId: newClassId || undefined,
      });

      setShowAddStudent(false);
      Alert.alert(
        'Student Created',
        res.message ||
          `"${newName}" can now log in with username "${newUsername || 'the auto-assigned one'}".`
      );

      const detail = await getSchool(String(id));
      setClasses(detail.classes);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Unable to create student.'
      );
    } finally {
      setAddingStudent(false);
    }
  };

  /* ─── Render ──────────────────────────────────────── */

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  if (!school) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loading}>
          <Text style={s.loadingText}>School not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.purple, fontWeight: '700' }}>
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const owner =
    typeof school.owner === 'object' ? school.owner : null;

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
        {/* Top bar */}
        <View style={s.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>
        </View>

        {/* School hero */}
        <View
          style={[
            s.hero,
            { backgroundColor: school.coverColor || colors.purple },
          ]}
        >
          <View style={s.heroIconWrap}>
            <IconSchool color="#fff" size={26} />
          </View>
          <Text style={s.heroName} numberOfLines={2}>
            {school.name}
          </Text>
          {school.description ? (
            <Text style={s.heroDesc} numberOfLines={2}>
              {school.description}
            </Text>
          ) : null}
          <View style={s.heroBadges}>
            <View style={s.codeBadge}>
              <IconHash color="#fff" size={12} />
              <Text style={s.codeBadgeText}>{school.code}</Text>
            </View>
            <Text style={s.ownerText}>
              Owner: {owner?.displayName || owner?.username || 'You'}
            </Text>
          </View>
        </View>

        {/* Pending requests */}
        {requests.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeaderRow}>
              <View style={s.sectionIconWrap}>
                <IconUserCheck color={colors.purple} size={16} />
              </View>
              <Text style={s.sectionTitle}>Pending requests</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{requests.length}</Text>
              </View>
            </View>

            {requests.map((req) => (
              <View key={req.requestId} style={s.requestCard}>
                <View style={s.requestAvatar}>
                  <Text style={s.requestAvatarText}>
                    {String(req.user?.displayName || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={s.requestBody}>
                  <Text style={s.requestName} numberOfLines={1}>
                    {req.user?.displayName || 'Unknown'}
                  </Text>
                  <Text style={s.requestMeta} numberOfLines={1}>
                    wants to join{' '}
                    <Text style={s.requestClass}>{req.className}</Text>
                  </Text>
                  {req.message ? (
                    <Text style={s.requestMessage} numberOfLines={2}>
                      "{req.message}"
                    </Text>
                  ) : null}
                </View>
                <View style={s.requestActions}>
                  <Pressable
                    onPress={() => handleApprove(req)}
                    disabled={busy}
                    style={({ pressed }) => [
                      s.approveBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <IconCheck color="#fff" size={16} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleReject(req)}
                    disabled={busy}
                    style={({ pressed }) => [
                      s.rejectBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <IconX color={colors.danger} size={16} />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={s.actionsRow}>
          <Pressable
            onPress={() =>
              router.push(`/schools/${school._id}/classes/create`)
            }
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
            onPress={openAddStudent}
            style={({ pressed }) => [
              s.actionBtnSecondary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <IconUserPlus color={colors.purple} size={18} />
            <Text style={s.actionTextSecondary}>Add Student</Text>
          </Pressable>
        </View>

        {/* Classes list */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <View style={s.sectionIconWrap}>
              <IconGraduation color={colors.purple} size={16} />
            </View>
            <Text style={s.sectionTitle}>Classes</Text>
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{classes.length}</Text>
            </View>
          </View>

          {classes.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No classes yet</Text>
              <Text style={s.emptyText}>
                Create your first class inside {school.name}.
              </Text>
            </View>
          ) : (
            classes.map((cls) => {
              const msgCount = (cls as any).messageCount ?? 0;
              return (
                <Pressable
                  key={cls._id}
                  onPress={() => router.push(`/classes/${cls._id}`)}
                  style={({ pressed }) => [
                    s.classCard,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <View
                    style={[
                      s.classAccent,
                      { backgroundColor: cls.coverColor || colors.purple },
                    ]}
                  />
                  <View style={s.classBody}>
                    <View style={s.classTitleRow}>
                      <Text style={s.classTitle} numberOfLines={1}>
                        {cls.name}
                      </Text>
                      {(cls.pendingCount ?? 0) > 0 && (
                        <View style={s.pendingPill}>
                          <Text style={s.pendingPillText}>
                            {cls.pendingCount} pending
                          </Text>
                        </View>
                      )}
                    </View>

                    {cls.subject ? (
                      <Text style={s.classSubject} numberOfLines={1}>
                        {cls.subject}
                      </Text>
                    ) : null}

                    <View style={s.classMeta}>
                      <Text style={s.classMetaText}>
                        Code:{' '}
                        <Text style={s.classCode}>
                          {cls.joinCode || cls.code}
                        </Text>
                      </Text>
                      <View style={s.classMetaRight}>
                        <IconUsers color={colors.muted} size={11} />
                        <Text style={s.classMetaText}>
                          {cls.memberCount ?? 0}{' '}
                          {(cls.memberCount ?? 0) === 1
                            ? 'member'
                            : 'members'}
                        </Text>
                      </View>
                    </View>

                    <View style={s.classFooter}>
                      <Text style={s.classMsg}>
                        {msgCount} messages
                      </Text>
                      <IconChevron color={colors.muted} size={16} />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ Add Student Modal ═══ */}
      <Modal
        visible={showAddStudent}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddStudent(false)}
      >
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <View style={s.modal}>
              <Text style={s.modalTitle}>Add Student</Text>
              <Text style={s.modalSub}>
                Create a login for a new student. They can sign in with the
                username and password you set.
              </Text>

              <Text style={s.label}>Full name *</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. Rabiu Musa"
                placeholderTextColor={colors.muted}
                value={newName}
                onChangeText={setNewName}
                editable={!addingStudent}
                autoFocus
              />

              <Text style={s.label}>Username (optional)</Text>
              <TextInput
                style={s.input}
                placeholder="auto-generated if empty"
                placeholderTextColor={colors.muted}
                value={newUsername}
                onChangeText={setNewUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!addingStudent}
              />

              <Text style={s.label}>Password *</Text>
              <TextInput
                style={s.input}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                editable={!addingStudent}
              />

              <Text style={s.label}>Enroll in class (optional)</Text>
              <View style={s.classList}>
                {classes.map((c) => {
                  const selected = newClassId === c._id;
                  return (
                    <Pressable
                      key={c._id}
                      onPress={() =>
                        setNewClassId(selected ? null : c._id)
                      }
                      disabled={addingStudent}
                      style={[
                        s.classChip,
                        selected && s.classChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          s.classChipText,
                          selected && s.classChipTextSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={submitAddStudent}
                disabled={addingStudent}
                style={({ pressed }) => [
                  s.modalPrimary,
                  pressed && { opacity: 0.9 },
                  addingStudent && { opacity: 0.7 },
                ]}
              >
                {addingStudent ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.modalPrimaryText}>Create Student</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setShowAddStudent(false)}
                disabled={addingStudent}
                style={s.modalCancel}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
    loadingText: { color: colors.muted, fontSize: 14 },

    topRow: { marginBottom: spacing.md },
    backText: {
      color: colors.purple,
      fontWeight: '800',
      fontSize: 14,
    },

    /* Hero */
    hero: {
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },
    heroIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.20)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    heroName: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '900',
      letterSpacing: -0.4,
    },
    heroDesc: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 13,
      marginTop: 6,
      lineHeight: 19,
    },
    heroBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      flexWrap: 'wrap',
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(255,255,255,0.20)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    codeBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    ownerText: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '600',
    },

    /* Sections */
    section: { marginBottom: spacing.lg },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: spacing.md,
    },
    sectionIconWrap: {
      width: 30,
      height: 30,
      borderRadius: 10,
      backgroundColor: colors.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '900',
      color: colors.ink,
    },
    countBadge: {
      backgroundColor: colors.purpleSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    countBadgeText: {
      color: colors.purple,
      fontSize: 11,
      fontWeight: '900',
    },

    /* Pending request cards */
    requestCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    requestAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestAvatarText: {
      color: colors.purple,
      fontWeight: '900',
      fontSize: 16,
    },
    requestBody: { flex: 1, minWidth: 0 },
    requestName: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
    },
    requestMeta: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
    },
    requestClass: {
      color: colors.purple,
      fontWeight: '800',
    },
    requestMessage: {
      marginTop: 4,
      fontSize: 11,
      color: colors.muted,
      fontStyle: 'italic',
    },
    requestActions: {
      flexDirection: 'row',
      gap: 6,
    },
    approveBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rejectBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.dangerSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

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

    /* Class cards */
    classCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    classAccent: { width: 5 },
    classBody: { flex: 1, padding: spacing.lg },
    classTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    classTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: colors.ink,
    },
    pendingPill: {
      backgroundColor: colors.warningSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    pendingPillText: {
      color: colors.warning,
      fontSize: 10,
      fontWeight: '900',
    },
    classSubject: {
      marginTop: 3,
      fontSize: 12,
      color: colors.muted,
    },
    classMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    classMetaRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    classMetaText: { fontSize: 11, color: colors.muted },
    classCode: { color: colors.purple, fontWeight: '800' },
    classFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    classMsg: {
      fontSize: 11,
      color: colors.muted,
      fontStyle: 'italic',
    },

    /* Empty */
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.ink,
    },
    emptyText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },

    /* Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    modalTitle: {
      color: colors.ink,
      fontSize: 20,
      fontWeight: '900',
    },
    modalSub: {
      marginTop: 6,
      marginBottom: spacing.md,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    label: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.ink,
      marginTop: spacing.md,
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: font.md,
      color: colors.ink,
    },
    classList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: 4,
    },
    classChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    },
    classChipSelected: {
      borderColor: colors.purple,
      backgroundColor: colors.purpleSoft,
    },
    classChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.muted,
    },
    classChipTextSelected: {
      color: colors.purple,
    },
    modalPrimary: {
      height: 52,
      borderRadius: radii.md,
      backgroundColor: colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xl,
    },
    modalPrimaryText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '800',
    },
    modalCancel: {
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.sm,
    },
    modalCancelText: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '700',
    },
  });