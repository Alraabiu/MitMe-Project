import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
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
import {
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  AtSign,
  Lock,
} from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  colors,
  gradients,
  spacing,
  radii,
  font,
  weights,
  shadows,
} from '../../src/theme';
import type { AuthResponse, User as UserType } from '../../src/types';
import { GoogleButton } from '../../src/components/GoogleSignInButton';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { signInWithGoogle, googleLoading } = useGoogleAuth();

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  /**
   * Tolerant parser — accepts both common backend response shapes:
   *   A) { accessToken, refreshToken, user }
   *   B) { success: true, data: { accessToken, refreshToken, user } }
   * Returns { access, refresh, user } or null.
   */
  const extractAuth = (
    payload: any
  ): { access: string; refresh: string | null; user: UserType } | null => {
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

    const user: UserType | undefined = root?.user || payload?.user;

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

    setBusy(true);
    try {
      const body: Record<string, string> = {
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        password: form.password,
        // No role sent — backend defaults to 'student'
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
      router.replace('/(tabs)');
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
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={s.brandRow}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.mark}
            >
              <Text style={s.markText}>M</Text>
            </LinearGradient>
            <Text style={s.brandName}>MitMe</Text>
          </View>

          <Text style={s.h1}>Create your account</Text>
          <Text style={s.sub}>A few details and you're in.</Text>

          {/* Full name */}
          <View style={s.inputWrap}>
            <User size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Full name"
              placeholderTextColor={colors.mutedDim}
              value={form.displayName}
              onChangeText={set('displayName')}
              autoCapitalize="words"
              editable={!disabled}
            />
          </View>

          {/* Username */}
          <View style={s.inputWrap}>
            <AtSign size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Username"
              placeholderTextColor={colors.mutedDim}
              value={form.username}
              onChangeText={set('username')}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
            />
          </View>

          {/* Email */}
          <View style={s.inputWrap}>
            <Mail size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.mutedDim}
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
            />
          </View>

          {/* Phone */}
          <View style={s.inputWrap}>
            <Phone size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.mutedDim}
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
              editable={!disabled}
            />
          </View>

          {/* Password with eye toggle */}
          <View style={s.inputWrap}>
            <Lock size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Password (8+ characters)"
              placeholderTextColor={colors.mutedDim}
              value={form.password}
              onChangeText={set('password')}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
            />
            <Pressable
              style={s.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              disabled={disabled}
            >
              {showPassword ? (
                <Eye size={20} color={colors.purpleLight} />
              ) : (
                <EyeOff size={20} color={colors.mutedLight} />
              )}
            </Pressable>
          </View>

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [
              s.btnWrap,
              pressed && { opacity: 0.92 },
              disabled && { opacity: 0.7 },
            ]}
            onPress={submit}
            disabled={disabled}
          >
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btn}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Create account</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Google Sign-In — parity with login */}
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

          {/* Switch */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8} disabled={disabled}>
                <Text style={s.switchLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>

          {/* Footnote */}
          <Text style={s.footnote}>
            You'll be able to create and join classes from your dashboard.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  markText: { color: '#fff', fontSize: 22, fontWeight: weights.extrabold },
  brandName: {
    fontSize: font.xl,
    fontWeight: weights.extrabold,
    color: colors.inkStrong,
    letterSpacing: -0.4,
  },

  h1: {
    fontSize: font.xxxl,
    fontWeight: weights.extrabold,
    color: colors.inkStrong,
    letterSpacing: -0.8,
  },
  sub: {
    color: colors.muted,
    marginTop: 6,
    marginBottom: spacing.xl,
    fontSize: font.md,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 56,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    color: colors.inkStrong,
  },
  eyeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },

  btnWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.glow,
  },
  btn: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: weights.extrabold,
    fontSize: font.md,
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceBorder,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.muted,
    fontSize: font.sm,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xl,
  },
  switchText: { color: colors.muted, fontSize: font.base },
  switchLink: {
    color: colors.purpleLight,
    fontWeight: weights.extrabold,
    fontSize: font.base,
  },

  footnote: {
    color: colors.mutedDim,
    fontSize: font.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
});