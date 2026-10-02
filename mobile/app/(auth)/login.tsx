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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Lock, User as UserIcon } from 'lucide-react-native';
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
import type { AuthResponse } from '../../src/types';
import { GoogleButton } from '../../src/components/GoogleSignInButton';
import { useGoogleAuth } from '../../src/hooks/useGoogleAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { user, login } = useAuth();
  const { signInWithGoogle, googleLoading } = useGoogleAuth();

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

      const accessToken = r.data.accessToken;
      if (!accessToken) {
        throw new Error('Missing access token.');
      }

      const user = r.data.user;
      if (!user) {
        throw new Error('Missing user data.');
      }

      await login(accessToken, r.data.refreshToken ?? '', user);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Unable to sign in.'
      );
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

          <Text style={s.h1}>Welcome back</Text>
          <Text style={s.sub}>
            Sign in to continue your meetings, chats and School.
          </Text>

          {/* Identifier */}
          <View style={s.inputWrap}>
            <UserIcon size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Email or username"
              placeholderTextColor={colors.mutedDim}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!disabled}
            />
          </View>

          {/* Password */}
          <View style={s.inputWrap}>
            <Lock size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={colors.mutedDim}
              value={password}
              onChangeText={setPassword}
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
                <Text style={s.btnText}>Sign in</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* ─── Google Sign-In ───────────────────────── */}
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

          {/* Switch to register */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>New to MitMe?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={8} disabled={disabled}>
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
  scroll: {
    padding: spacing.xxl,
    justifyContent: 'center',
    flexGrow: 1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.glow,
  },
  markText: { color: '#fff', fontSize: 26, fontWeight: weights.extrabold },
  brandName: {
    fontSize: font.xxl,
    fontWeight: weights.extrabold,
    color: colors.inkStrong,
    letterSpacing: -0.6,
  },

  h1: {
    fontSize: font.xxxl,
    fontWeight: weights.extrabold,
    color: colors.inkStrong,
    letterSpacing: -0.8,
  },
  sub: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: spacing.xxl,
    fontSize: font.base,
    lineHeight: 20,
    maxWidth: 320,
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

  /* Google / divider */
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
});