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

          {/* Role selector */}
          <Text style={s.sectionLabel}>I am joining as</Text>
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

          {/* Inputs */}
          <View style={s.inputWrap}>
            <User size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Full name"
              placeholderTextColor={colors.mutedDim}
              value={form.displayName}
              onChangeText={set('displayName')}
              autoCapitalize="words"
            />
          </View>

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
            />
          </View>

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
            />
          </View>

          <View style={s.inputWrap}>
            <Phone size={18} color={colors.mutedLight} />
            <TextInput
              style={s.input}
              placeholder="Phone (optional)"
              placeholderTextColor={colors.mutedDim}
              value={form.phone}
              onChangeText={set('phone')}
              keyboardType="phone-pad"
            />
          </View>

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
            />
            <Pressable
              style={s.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
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
            ]}
            onPress={submit}
            disabled={busy}
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

  sectionLabel: {
    fontSize: 11,
    fontWeight: weights.bold,
    color: colors.mutedDim,
    marginBottom: spacing.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  roleCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  roleCardActive: {
    borderColor: colors.purple,
    backgroundColor: colors.purpleSoft,
  },
  roleTitle: {
    fontSize: font.lg,
    fontWeight: weights.extrabold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  roleTitleActive: { color: colors.purpleLight },
  roleSub: {
    fontSize: font.sm,
    color: colors.muted,
    marginTop: 4,
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