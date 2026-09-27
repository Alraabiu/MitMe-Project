import { useState } from 'react';
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { createClass } from '../../src/services/classes';
import { colors, spacing, radii, font, shadows } from '../../src/theme';

export default function CreateClassScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      return Alert.alert('MitMe', 'Class name must be at least 2 characters.');
    }

    setBusy(true);
    try {
      const cls = await createClass({
        name: name.trim(),
        subject: subject.trim() || undefined,
        description: description.trim() || undefined,
      });

      Alert.alert(
        'Class Created',
        `Your class code is:\n\n${cls.code}\n\nShare this code with your students.`,
        [{ text: 'OK', onPress: () => router.replace(`/classes/${cls._id}`) }]
      );
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Unable to create class.';
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
          <Text style={s.title}>Create Class</Text>
          <Text style={s.sub}>
            Students will join using the code we generate for you.
          </Text>

          <Text style={s.label}>Class name *</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Mathematics 101"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
            editable={!busy}
          />

          <Text style={s.label}>Subject (optional)</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Math"
            placeholderTextColor={colors.muted}
            value={subject}
            onChangeText={setSubject}
            editable={!busy}
          />

          <Text style={s.label}>Description (optional)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="What will students learn?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            editable={!busy}
          />

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              s.btn,
              pressed && { opacity: 0.9 },
              busy && { opacity: 0.7 },
            ]}
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
                <Text style={s.btnText}>Create Class</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            disabled={busy}
            style={s.cancel}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.ink,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: font.md,
    color: colors.ink,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  btn: {
    borderRadius: radii.md,
    overflow: 'hidden',
    marginTop: spacing.xl,
    ...shadows.card,
  },
  btnInner: {
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: font.md },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  cancelText: { color: colors.muted, fontWeight: '700' },
});
