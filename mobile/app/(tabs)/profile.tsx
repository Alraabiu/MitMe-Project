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
import * as ImagePicker from 'expo-image-picker';
import { Camera, LogOut, Save } from 'lucide-react-native';
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

  // ??? Pick avatar ????????????????????????????????????????
  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert(
        'MitMe',
        'We need access to your photos to set an avatar.'
      );
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

    // Rough size check (base64 is ~4/3 of the raw bytes)
    const approxBytes = (asset.base64.length * 3) / 4;
    if (approxBytes > MAX_BYTES) {
      return Alert.alert('MitMe', 'Image must be under 2 MB.');
    }

    const mime = asset.mimeType || 'image/jpeg';
    setAvatar(`data:${mime};base64,${asset.base64}`);
  };

  const removeAvatar = () => setAvatar('');

  // ??? Save profile ???????????????????????????????????????
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
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not save profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ??? Logout ?????????????????????????????????????????????
  const handleLogout = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const initial = user.displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.h1}>Profile</Text>

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <View style={s.avatarRing}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarFallbackText}>{initial}</Text>
                </View>
              )}
            </View>

            <View style={s.avatarActions}>
              <Pressable
                style={({ pressed }) => [
                  s.outlineBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={pickAvatar}
              >
                <Camera size={16} color={colors.ink} />
                <Text style={s.outlineBtnText}>
                  {avatar ? 'Change photo' : 'Upload photo'}
                </Text>
              </Pressable>

              {avatar ? (
                <Pressable
                  style={({ pressed }) => [
                    s.dangerBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={removeAvatar}
                >
                  <Text style={s.dangerBtnText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Form */}
          <View style={s.card}>
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
                  <Text style={s.saveBtnText}>Save changes</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Account info */}
          <View style={s.card}>
            <Text style={s.section}>Account</Text>
            <View style={s.row}>
              <Text style={s.rowLabel}>Username</Text>
              <Text style={s.rowValue}>@{user.username}</Text>
            </View>
            {user.email ? (
              <View style={s.row}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{user.email}</Text>
              </View>
            ) : null}
            {user.phone ? (
              <View style={s.row}>
                <Text style={s.rowLabel}>Phone</Text>
                <Text style={s.rowValue}>{user.phone}</Text>
              </View>
            ) : null}
            <View style={s.row}>
              <Text style={s.rowLabel}>Presence</Text>
              <Text style={s.rowValue}>{user.presence || 'offline'}</Text>
            </View>
          </View>

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.85 }]}
            onPress={handleLogout}
          >
            <LogOut size={16} color={colors.danger} />
            <Text style={s.logoutBtnText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 120 },
  h1: {
    fontSize: font.xxl,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.xl,
  },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.xl },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    overflow: 'hidden',
    backgroundColor: colors.purple,
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
  },
  avatarFallbackText: { color: '#fff', fontSize: 42, fontWeight: '900' },
  avatarActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  outlineBtnText: { color: colors.ink, fontWeight: '700', fontSize: font.sm },
  dangerBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerBtnText: { color: colors.danger, fontWeight: '700', fontSize: font.sm },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.purple,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: font.md },
  section: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeaf5',
  },
  rowLabel: { color: colors.muted, fontSize: font.base },
  rowValue: { color: colors.ink, fontWeight: '700', fontSize: font.base },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
  },
  logoutBtnText: { color: colors.danger, fontWeight: '800', fontSize: font.md },
});
