import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { joinClass } from '../../src/services/classes';
import { colors, spacing, radii, font } from '../../src/theme';

export default function JoinByCodeScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();

  const [status, setStatus] = useState<'idle' | 'joining' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!code) return;

    const role = String(user?.role || '').toLowerCase();

    // Not logged in — send to register with a hint
    if (!user) {
      setStatus('error');
      setMessage(
        'Please sign up or log in as a student to join this class. ' +
          'Your code will be kept: ' +
          code
      );
      return;
    }

    // Teacher tries to join — redirect
    if (role === 'teacher' || role === 'admin') {
      setStatus('error');
      setMessage('Only students can join classes. You are signed in as a teacher.');
      return;
    }

    // Auto-join
    let cancelled = false;
    (async () => {
      try {
        setStatus('joining');
        const cls = await joinClass(String(code));
        if (cancelled) return;
        setStatus('success');
        setMessage(`Joined "${cls.name}" successfully!`);
        setTimeout(() => {
          router.replace(`/classes/${cls._id}`);
        }, 900);
      } catch (e: any) {
        if (cancelled) return;
        setStatus('error');
        setMessage(
          e?.response?.data?.message ||
            e?.message ||
            'Unable to join this class.'
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, user, router]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <LinearGradient
          colors={[colors.purpleLight, colors.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.mark}
        >
          <Text style={s.markText}>M</Text>
        </LinearGradient>

        <Text style={s.title}>Joining class</Text>
        <Text style={s.code}>{code}</Text>

        {status === 'joining' && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.purple} />
            <Text style={s.hint}>Adding you to the class...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={s.center}>
            <Ionicons name="checkmark-circle" size={40} color="#168A55" />
            <Text style={[s.hint, { color: '#168A55' }]}>{message}</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={s.center}>
            <Ionicons name="alert-circle" size={40} color={colors.danger} />
            <Text style={s.errorText}>{message}</Text>

            {!user && (
              <Pressable
                style={s.primaryBtn}
                onPress={() => router.replace('/(auth)/register')}
              >
                <Text style={s.primaryBtnText}>Sign up as a student</Text>
              </Pressable>
            )}

            <Pressable style={s.ghostBtn} onPress={() => router.replace('/')}>
              <Text style={s.ghostBtnText}>Go to app</Text>
            </Pressable>
          </View>
        )}

        {status === 'idle' && (
          <ActivityIndicator size="small" color={colors.purple} />
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  markText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  title: {
    fontSize: font.xxl,
    fontWeight: '800',
    color: colors.ink,
    marginTop: spacing.md,
  },
  code: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.purple,
  },
  center: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  hint: {
    fontSize: font.sm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: font.sm,
    color: colors.ink,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.purple,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  ghostBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
  },
  ghostBtnText: { color: colors.muted, fontWeight: '700' },
});
