import { useState } from 'react';
import { Link } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { AuthResponse, User } from '../../src/types';
import { GoogleButton } from '../../src/components/GoogleSignInButton';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';

type Role = 'student' | 'teacher';

export default function RegisterScreen() {
  const { login } = useAuth();
  const { signInWithGoogle, googleLoading } = useGoogleAuth();

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [role, setRole] = useState<Role>('student');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  /**
   * Tolerant parser — accepts both common backend response shapes:
   *   A) { accessToken, refreshToken, user }
   *   B) { success: true, data: { token, refreshToken, user } }
   *   C) { success: true, data: { accessToken, refreshToken, user } }
   */
  const extractAuth = (
    payload: any
  ): { access: string; refresh: string | null; user: User } | null => {
    if (!payload) return null;

    const root = payload?.data ?? payload;

    const access =
      root?.accessToken ||
      root?.token ||
      root?.access_token ||
      null;

    const refresh =
      root?.refreshToken ||
      root?.refresh_token ||
      null;

    const user: User | undefined =
      root?.user || payload?.user;

    if (!access || !user) return null;

    return { access, refresh, user };
  };

  const submit = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.password) {
      return Alert.alert(
        'MitMe',
        'Full name, username and password are required.'
      );
    }
    if (form.password.length < 8) {
      return Alert.alert('MitMe', 'Password must be at least 8 characters.');
    }
    if (!form.email.trim() && !form.phone.trim()) {
      return Alert.alert(
        'MitMe',
        'Enter either an email or a phone number.'
      );
    }

    setBusy(true);
    try {
      const body: Record<string, string> = {
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        password: form.password,
        role,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();

      const r = await api.post<AuthResponse>('/auth/register', body);

      const auth = extractAuth(r?.data);

      if (!auth) {
        console.log('[REGISTER] Unexpected response shape:', r?.data);
        throw new Error(
          'Unexpected response from server. Check API response shape.'
        );
      }

      await login(auth.access, auth.refresh ?? '', auth.user);
      // The (auth) layout's guard redirects automatically once `user` is set.
    } catch (e: any) {
      console.log('[REGISTER ERROR]', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });

      const issues = e?.response?.data?.issues;
      const detail = issues?.length
        ? ' — ' + issues.map((i: any) => i.message).join(', ')
        : '';

      let msg = 'Unable to register.';

      if (e?.response?.data?.message) {
        msg = e.response.data.message + detail;
      } else if (e?.response?.status) {
        msg = `Server error (${e.response.status}). Please try again.`;
      } else if (e?.request) {
        msg = 'Cannot reach server. Check your internet connection.';
      } else if (e?.message) {
        msg = e.message;
      }

      Alert.alert('MitMe', msg);
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || googleLoading;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.logoWrap}>
            <LinearGradient
              colors={[colors.purpleLight, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.mark}
            >
              <Text style={s.markText}>M</Text>
            </LinearGradient>
            <Text style={s.brand}>MitMe</Text>
            <Text style={s.tag}>Connect. Meet. Share.</Text>
          </View>

          <Text style={s.h1}>Create your account</Text>
          <Text style={s.sub}>A few details and you're in.</Text>

          {/* ─── Role picker ────────────────────────────────── */}
          <Text style={s.roleLabel}>I am joining as:</Text>
          <View style={s.roleRow}>
            <Pressable
              onPress={() => setRole('student')}
              disabled={disabled}
              style={[
                s.roleBtn,
                role === 'student' && s.roleBtnActive,
              ]}
            >
              <Text
                style={[
                  s.roleBtnText,
                  role === 'student' && s.roleBtnTextActive,
                ]}
              >
                Student
              </Text>
              <Text style={s.roleHint}>Join classes</Text>
            </Pressable>

            <Pressable
              onPress={() => setRole('teacher')}
              disabled={disabled}
              style={[
                s.roleBtn,
                role === 'teacher' && s.roleBtnActive,
              ]}
            >
              <Text
                style={[
                  s.roleBtnText,
                  role === 'teacher' && s.roleBtnTextActive,
                ]}
              >
                Teacher
              </Text>
              <Text style={s.roleHint}>Create classes</Text>
            </Pressable>
          </View>

          {/* ─── Form ──────────────────────────────────────── */}
          <TextInput
            style={s.input}
            placeholder="Full name"
            placeholderTextColor={colors.muted}
            value={form.displayName}
            onChangeText={set('displayName')}
            editable={!disabled}
          />
          <TextInput
            style={s.input}
            placeholder="Username"
            placeholderTextColor={colors.muted}
            value={form.username}
            onChangeText={set('username')}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
          />
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.muted}
            value={form.email}
            onChangeText={set('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
          />
          <TextInput
            style={s.input}
            placeholder="Phone (optional if email is filled)"
            placeholderTextColor={colors.muted}
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            editable={!disabled}
          />
          <TextInput
            style={s.input}
            placeholder="Password (8+ characters)"
            placeholderTextColor={colors.muted}
            value={form.password}
            onChangeText={set('password')}
            secureTextEntry
            editable={!disabled}
          />

          <Pressable
            style={({ pressed }) => [
              s.btn,
              pressed && { opacity: 0.9 },
              disabled && { opacity: 0.7 },
            ]}
            onPress={submit}
            disabled={disabled}
          >
            <LinearGradient
              colors={[colors.purple, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btnInner}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Create account</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* ─── Google Sign-In ─────────────────────────────── */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={s.dividerLine} />
          </View>

          <GoogleButton
            onPress={signInWithGoogle}
            loading={googleLoading}
            disabled={busy}
          />

          <View style={s.switchRow}>
            <Text style={s.switchText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable disabled={disabled}>
                <Text style={s.switchLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xxl, justifyContent: 'center', flexGrow: 1 },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  markText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  brand: { fontSize: font.xxxl, fontWeight: '900', color: colors.ink },
  tag: { color: colors.muted, marginTop: 4 },
  h1: { fontSize: font.xxl, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  sub: { color: colors.muted, marginBottom: spacing.lg, fontSize: font.base },

  /* ─── Role picker ──────────────────────────────── */
  roleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: colors.purple,
    backgroundColor: '#F0EBFF',
  },
  roleBtnText: {
    fontWeight: '800',
    color: colors.muted,
    fontSize: font.md,
  },
  roleBtnTextActive: {
    color: colors.purple,
  },
  roleHint: {
    marginTop: 4,
    fontSize: 11,
    color: colors.muted,
  },

  /* ─── Form ─────────────────────────────────────── */
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    marginBottom: spacing.md,
    fontSize: font.md,
    color: colors.ink,
  },
  btn: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.card,
  },
  btnInner: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: font.md },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.muted,
    fontSize: font.sm ?? 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  switchText: { color: colors.muted },
  switchLink: { color: colors.purple, fontWeight: '800' },
});