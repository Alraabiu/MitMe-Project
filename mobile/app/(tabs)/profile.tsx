import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  LogOut,
  Save,
  Mail,
  Phone,
  AtSign,
  Circle,
  UserCheck,
  User as UserIcon,
} from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { User } from '../../src/types';

const MAX_BYTES = 2 * 1024 * 1024;

export default function ProfileTab() {
  const { user, logout, updateUser } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  /* ─── Pick avatar ─────────────────────────────────── */

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert('MitMe', 'We need access to your photos to set an avatar.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      return Alert.alert('MitMe', 'Could not read that image.');
    }

    const approxBytes = (asset.base64.length * 3) / 4;
    if (approxBytes > MAX_BYTES) {
      return Alert.alert('MitMe', 'Image must be under 2 MB.');
    }

    const mime = asset.mimeType || 'image/jpeg';
    setAvatar(`data:${mime};base64,${asset.base64}`);
  };

  const removeAvatar = () => setAvatar('');

  /* ─── Save profile ────────────────────────────────── */

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (name.trim() && name.trim() !== user.displayName) {
        payload.displayName = name.trim();
      }
      if (bio.trim() !== (user.bio || '')) {
        payload.bio = bio.trim();
      }
      if (avatar !== (user.avatarUrl || '')) {
        payload.avatarUrl = avatar;
      }

      if (Object.keys(payload).length === 0) {
        Alert.alert('MitMe', 'Nothing to update.');
        return;
      }

      const r = await api.patch<{ user: User }>('/users/me', payload);
      updateUser(r.data.user);
      Alert.alert('MitMe', 'Profile saved.');
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Logout ──────────────────────────────────────── */

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const initial = user.displayName.charAt(0).toUpperCase();
  const presence = user.presence || 'offline';
  const presenceColor =
    presence === 'online' ? '#168A55' : presence === 'away' ? '#F5A623' : '#999';
  const accountStatus = (user.status || 'active').toLowerCase();
  const isActive = accountStatus === 'active';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Gradient Hero ═══════════════════════════ */}
          <View style={s.hero}>
            <LinearGradient
              colors={[colors.purple, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.heroBg}
            />

            <View style={s.avatarContainer}>
              <View style={s.avatarRing}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={s.avatarImg} />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarFallbackText}>{initial}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={pickAvatar} style={s.cameraFab}>
                <Camera size={14} color="#fff" />
              </Pressable>
            </View>

            <Text style={s.heroName} numberOfLines={1}>
              {user.displayName}
            </Text>
            <Text style={s.heroHandle}>@{user.username}</Text>

            {/* Presence badge only — no role */}
            <View style={s.heroBadges}>
              <View style={s.heroBadge}>
                <Circle size={10} color={presenceColor} fill={presenceColor} />
                <Text style={s.heroBadgeText}>
                  {presence.charAt(0).toUpperCase() + presence.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* ═══ Stats Row ══════════════════════════════ */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>
                {isActive ? 'Active' : 'Suspended'}
              </Text>
              <Text style={s.statLabel}>Account</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>
                {user.presence ? user.presence[0].toUpperCase() : 'O'}
              </Text>
              <Text style={s.statLabel}>Status</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{avatar ? 'Yes' : 'No'}</Text>
              <Text style={s.statLabel}>Photo</Text>
            </View>
          </View>

          {/* ═══ Edit Profile Card ══════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIconWrap}>
                <UserIcon size={16} color={colors.purple} />
              </View>
              <Text style={s.cardTitle}>Edit Profile</Text>
            </View>

            <Text style={s.label}>Display name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              placeholderTextColor={colors.muted}
              maxLength={80}
            />

            <Text style={[s.label, { marginTop: spacing.lg }]}>Bio</Text>
            <TextInput
              style={[s.input, s.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              placeholderTextColor={colors.muted}
              maxLength={240}
              multiline
            />

            <View style={s.bioCounter}>
              <Text style={s.bioCounterText}>{bio.length}/240</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                s.saveBtn,
                pressed && { opacity: 0.85 },
                saving && { opacity: 0.6 },
              ]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={16} color="#fff" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>

            {avatar ? (
              <Pressable
                style={({ pressed }) => [
                  s.removeAvatarBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={removeAvatar}
              >
                <Text style={s.removeAvatarText}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>

          {/* ═══ Account Card ══════════════════════════ */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.cardIconWrap}>
                <AtSign size={16} color={colors.purple} />
              </View>
              <Text style={s.cardTitle}>Account Information</Text>
            </View>

            <InfoRow
              icon={<AtSign size={16} color={colors.muted} />}
              label="Username"
              value={`@${user.username}`}
            />
            {user.email ? (
              <InfoRow
                icon={<Mail size={16} color={colors.muted} />}
                label="Email"
                value={user.email}
              />
            ) : null}
            {user.phone ? (
              <InfoRow
                icon={<Phone size={16} color={colors.muted} />}
                label="Phone"
                value={user.phone}
              />
            ) : null}
            <InfoRow
              icon={<UserCheck size={16} color={colors.muted} />}
              label="Account"
              value={isActive ? 'Active' : 'Suspended'}
            />
            <InfoRow
              icon={
                <Circle size={16} color={presenceColor} fill={presenceColor} />
              }
              label="Presence"
              value={presence.charAt(0).toUpperCase() + presence.slice(1)}
            />
          </View>

          {/* ═══ Danger Zone ═══════════════════════════ */}
          <Pressable
            style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogout}
          >
            <LogOut size={16} color={colors.danger} />
            <Text style={s.logoutBtnText}>Sign Out</Text>
          </Pressable>

          <Text style={s.version}>MitMe v1.0.2</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─── Info Row subcomponent ─────────────────────── */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoRowLeft}>
        {icon}
        <Text style={s.infoRowLabel}>{label}</Text>
      </View>
      <Text style={s.infoRowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 120 },

  /* Hero */
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  avatarContainer: {
    marginTop: spacing.lg,
    position: 'relative',
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    ...shadows.card,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  avatarFallbackText: { color: '#fff', fontSize: 48, fontWeight: '900' },
  cameraFab: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  heroName: {
    marginTop: spacing.lg,
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  heroHandle: {
    marginTop: 2,
    fontSize: 13,
    color: '#EDE7FF',
    fontWeight: '600',
  },
  heroBadges: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: spacing.xl,
    marginTop: -30,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '900', color: colors.ink },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },

  /* Card */
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0EBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },

  /* Form */
  label: {
    fontSize: font.sm,
    fontWeight: '700',
    color: colors.ink,
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
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  bioCounter: { alignItems: 'flex-end', marginTop: 4 },
  bioCounterText: { fontSize: 10, color: colors.muted },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.purple,
    paddingVertical: spacing.md + 2,
    borderRadius: radii.md,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: font.md },

  removeAvatarBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  removeAvatarText: { color: colors.danger, fontWeight: '700', fontSize: 13 },

  /* Info Rows */
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeaf5',
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoRowLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  infoRowValue: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 13,
    maxWidth: '55%',
    textAlign: 'right',
  },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  logoutBtnText: { color: colors.danger, fontWeight: '800', fontSize: font.md },

  version: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});