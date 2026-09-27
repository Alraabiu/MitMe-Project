import { useState } from 'react';
import { Link, router } from 'expo-router';
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

export default function LoginScreen() {
  const { login } = useAuth();
  const { signInWithGoogle, googleLoading } = useGoogleAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Tolerant parser — accepts both common backend response shapes:
   *   A) { accessToken, refreshToken, user }
   *   B) { success: true, data: { token, refreshToken, user } }
   *   C) { success: true, data: { accessToken, refreshToken, user } }
   * Returns { access, refresh, user } or null.
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
    if (!identifier.trim() || !password) {
      return Alert.alert('MitMe', 'Enter your email/username and password.');
    }

    setBusy(true);
    try {
      const r = await api.post<AuthResponse>('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      const auth = extractAuth(r?.data);

      if (!auth) {
        console.log('[LOGIN] Unexpected response shape:', r?.data);
        throw new Error(
          'Unexpected response from server. Check API response shape.'
        );
      }

      await login(auth.access, auth.refresh ?? '', auth.user);
      // The (auth) layout's guard redirects automatically once `user` is set.
    } catch (e: any) {
      console.log('[LOGIN ERROR]', {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });

      let msg = 'Unable to sign in.';

      if (e?.response?.data?.message) {
        msg = e.response.data.message;
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

          <Text style={s.h1}>Welcome back</Text>
          <Text style={s.sub}>
            Meet people, collaborate and share from one place.
          </Text>

          <TextInput
            style={s.input}
            placeholder="Email or username"
            placeholderTextColor={colors.muted}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && !googleLoading}
            keyboardType="email-address"
          />

          <View style={s.passwordWrap}>
            <TextInput
              style={s.passwordInput}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!busy && !googleLoading}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              disabled={busy || googleLoading}
              hitSlop={8}
              style={s.eyeBtn}
            >
              <Text style={s.eyeText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              s.btn,
              pressed && { opacity: 0.9 },
              (busy || googleLoading) && { opacity: 0.7 },
            ]}
            onPress={submit}
            disabled={busy || googleLoading}
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
                <Text style={s.btnText}>Sign in</Text>
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
            <Text style={s.switchText}>New to MitMe?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable disabled={busy || googleLoading}>
                <Text style={s.switchLink}>Create account</Text>
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
  logoWrap: { alignItems: 'center', marginBottom: spacing.xxxl },
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
  h1: {
    fontSize: font.xxl,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 4,
  },
  sub: {
    color: colors.muted,
    marginBottom: spacing.xl,
    fontSize: font.base,
  },
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    paddingRight: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    color: colors.ink,
  },
  eyeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  eyeText: {
    color: colors.purple,
    fontWeight: '700',
    fontSize: font.sm ?? 12,
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