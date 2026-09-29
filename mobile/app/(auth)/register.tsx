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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Mail, Phone, User, AtSign, Lock } from 'lucide-react-native';
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

type Role = 'student' | 'teacher';

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('student');
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

  const submit = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.password) {
      return Alert.alert('MitMe', 'Full name, username and password are required.');
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
        role,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();

      const r = await api.post<AuthResponse>('/auth/register', body);
      if (!r.data.user) {
        throw new Error('Registration response did not include a user.');
      }
      await login(r.data.accessToken!, r.data.refreshToken!, r.data.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      const issues = e?.response?.data?.issues;
      const detail = issues?.length
        ? ' — ' + issues.map((i: any) => i.message).join(', ')
        : '';
      Alert.alert(
        'MitMe',
        (e?.response?.data?.message || 'Unable to register') + detail
      );
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
          {/* Header */}
          <View style={s.header}>
            <LinearGradient
              colors={[colors.purpleLight, colors.blue]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.mark}
            >
              <Text style={s.markText}>M</Text>
            </LinearGradient>
            <Text style={s.h1}>Create your account</Text>
            <Text style={s.sub}>A few details and you're in.</Text>
          </View>

          {/* Role selector */}
          <Text style={s.sectionLabel}>I am joining as:</Text>
          <View style={s.roleRow}>
            <Pressable
              style={[s.roleCard, role === 'student' && s.roleCardActive]}
              onPress={() => setRole('student')}
            >
              <Text
                style={[s.roleTitle, role === 'student' && s.roleTitleActive]}
              >
                Student
              </Text>
              <Text style={s.roleSub}>Join classes</Text>
            </Pressable>

            <Pressable
              style={[s.roleCard, role === 'teacher' && s.roleCardActive]}
              onPress={() => setRole('teacher')}
            >
              <Text
                style={[s.roleTitle, role === 'teacher' && s.roleTitleActive]}
              >
                Teacher
              </Text>
              <Text style={s.roleSub}>Create classes</Text>
            </Pressable>
          </View>

          {/* Full name */}
          <View style={s.inputWrap}>
            <User size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Full name"
              placeholderTextColor={colors.mutedLight}
              value={form.displayName}
              onChangeText={set('displayName')}
              autoCapitalize="words"
            />
          </View>

          {/* Username */}
          <View style={s.inputWrap}>
            <AtSign size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Username"
              placeholderTextColor={colors.mutedLight}
              value={form.username}
              onChangeText={set('username')}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <View style={s.inputWrap}>
            <Mail size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Email"
              placeholderTextColor={colors.mutedLight}
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Phone */}
          <View style={s.inputWrap}>
            <Phone size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Phone (optional if email is filled)"
              placeholderTextColor={colors.mutedLight}
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
            />
          </View>

          {/* Password with eye toggle */}
          <View style={s.inputWrap}>
            <Lock size={18} color={colors.mutedLight} style={s.inputIcon} />
            <TextInput
              style={[s.input, s.inputWithEye]}
              placeholder="Password (8+ characters)"
              placeholderTextColor={colors.mutedLight}
              value={form.password}
              onChangeText={set('password')}
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

          {/* Submit */}
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
                {busy ? 'Creating…' : 'Create account'}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Google placeholder */}
          <Pressable
            style={({ pressed }) => [s.googleBtn, pressed && { opacity: 0.9 }]}
            onPress={() =>
              Alert.alert('Coming soon', 'Google sign-in will be available shortly.')
            }
          >
            <Text style={s.googleG}>G</Text>
            <Text style={s.googleText}>Continue with Google</Text>
          </Pressable>

          {/* Switch to login */}
          <View style={s.switchRow}>
            <Text style={s.switchText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={8}>
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
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },

  header: { marginBottom: spacing.xl },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  markText: { color: '#fff', fontSize: 28, fontWeight: weights.extrabold },
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
  },

  sectionLabel: {
    fontSize: font.sm,
    fontWeight: weights.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  roleCardActive: {
    borderColor: colors.purple,
    backgroundColor: colors.purpleSoft,
  },
  roleTitle: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
  },
  roleTitleActive: { color: colors.purple },
  roleSub: {
    fontSize: font.sm,
    color: colors.muted,
    marginTop: 4,
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
  inputWithEye: {
    paddingRight: spacing.xs,
  },
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