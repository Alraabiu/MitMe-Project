import { useEffect, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import {
  colors,
  spacing,
  radii,
  font,
  weights,
  shadows,
} from '../../src/theme';
import type { AuthResponse } from '../../src/types';

export default function LoginScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace('/(tabs)');
  }, [user, router]);

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
      if (!r.data.accessToken) {
        throw new Error('Login response did not include an access token.');
      }
      if (!r.data.user) {
        throw new Error('Login response did not include a user.');
      }
      await login(r.data.accessToken, r.data.refreshToken ?? '', r.data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('MitMe', e?.response?.data?.message || 'Unable to sign in.');
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
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <LinearGradient
              colors={[colors.purpleLight, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.mark}
            >
              <Text style={s.markText}>M</Text>
            </LinearGradient>
            <Text style={s.h1}>Welcome back</Text>
            <Text style={s.sub}>
              Meet people, collaborate and share from one place.
            </Text>
          </View>

          {/* Identifier */}
          <View style={s.inputWrap}>
            <UserIcon size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Email or username"
              placeholderTextColor={colors.mutedLight}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password with eye toggle */}
          <View style={s.inputWrap}>
            <Lock size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={[s.input, s.inputWithEye]}
              placeholder="Password"
              placeholderTextColor={colors.mutedLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={s.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
            >
              {showPassword ? (
                <Eye size={20} color={colors.purple} />
              ) : (
                <EyeOff size={20} color={colors.mutedLight} />
              )}
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              s.btn,
              pressed && { opacity: 0.92 },
              busy && { opacity: 0.6 },
            ]}
            onPress={submit}
            disabled={busy}
          >
            <LinearGradient
              colors={[colors.purple, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.btnInner}
            >
              <Text style={s.btnText}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={s.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.9 }]}
            onPress={() =>
              Alert.alert('Coming soon', 'Google sign-in will be available shortly.')
            }
          >
            <Text style={s.googleG}>G</Text>
            <Text style={s.googleText}>Continue with Google</Text>
          </Pressable>

          <View style={s.switchRow}>
            <Text style={s.switchText}>New to MitMe?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={8}>
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
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: spacing.xxl,
    justifyContent: 'center',
    flexGrow: 1,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxxl,
  },

  header: { marginBottom: spacing.xxxl },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  markText: { color: '#fff', fontSize: 32, fontWeight: weights.extrabold },
  h1: {
    fontSize: font.xxxl,
    fontWeight: weights.extrabold,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.muted,
    marginTop: 6,
    fontSize: font.md,
    maxWidth: 320,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 54,
  },
  inputIcon: { marginRight: spacing.md },
  input: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    color: colors.ink,
  },
  inputWithEye: { paddingRight: spacing.xs },
  eyeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },

  btn: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
    ...shadows.card,
  },
  btnInner: {
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

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: font.sm },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xl,
  },
  googleG: {
    fontSize: 20,
    fontWeight: weights.extrabold,
    color: '#4285F4',
  },
  googleText: {
    fontSize: font.md,
    fontWeight: weights.bold,
    color: colors.ink,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  switchText: { color: colors.muted, fontSize: font.base },
  switchLink: {
    color: colors.purple,
    fontWeight: weights.extrabold,
    fontSize: font.base,
  },
});