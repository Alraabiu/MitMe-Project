import { useMemo, useState } from 'react';
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
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Video,
  GraduationCap,
} from 'lucide-react-native';
import { api } from '../src/services/api';
import { useTheme } from '../src/context/ThemeContext';
import { spacing, radii, font, weights, type ThemePalette } from '../src/theme';
import type { Meeting } from '../src/types';

type IconProps = { color?: string; size?: number };
const IconBack = ArrowLeft as unknown as React.ComponentType<IconProps>;
const IconCalendar = CalendarIcon as unknown as React.ComponentType<IconProps>;
const IconClock = Clock as unknown as React.ComponentType<IconProps>;
const IconVideo = Video as unknown as React.ComponentType<IconProps>;
const IconClass = GraduationCap as unknown as React.ComponentType<IconProps>;

type EventType = 'meeting' | 'class';

const DURATIONS: { value: number; label: string }[] = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '1h' },
  { value: 90, label: '1.5h' },
  { value: 120, label: '2h' },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const { colors, gradients } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [startsAt, setStartsAt] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [duration, setDuration] = useState(60);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [busy, setBusy] = useState(false);

  const onDateChange = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS !== 'ios') setShowDate(false);
    if (e.type === 'dismissed') return;
    if (d) {
      const next = new Date(startsAt);
      next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      setStartsAt(next);
    }
  };

  const onTimeChange = (e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS !== 'ios') setShowTime(false);
    if (e.type === 'dismissed') return;
    if (d) {
      const next = new Date(startsAt);
      next.setHours(d.getHours(), d.getMinutes(), 0, 0);
      setStartsAt(next);
    }
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed) return Alert.alert('MitMe', 'Please enter a title.');
    if (trimmed.length < 2) {
      return Alert.alert('MitMe', 'Title must be at least 2 characters.');
    }
    if (startsAt.getTime() < Date.now() - 60_000) {
      return Alert.alert('MitMe', 'Please choose a time in the future.');
    }

    setBusy(true);
    try {
      const r = await api.post<{ meeting: Meeting }>('/meetings', {
        title: trimmed,
        type,
        startsAt: startsAt.toISOString(),
        duration,
        status: 'scheduled',
      });

      Alert.alert(
        'Scheduled',
        `"${r.data.meeting.title}" is set for ${fmtDate(startsAt)} at ${fmtTime(startsAt)}.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      Alert.alert(
        'MitMe',
        e?.response?.data?.message || 'Could not schedule. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = !!title.trim() && !busy;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <IconBack color={colors.inkStrong} size={22} />
        </Pressable>
        <Text style={s.headerTitle}>Schedule</Text>
        <View style={s.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Type toggle */}
          <View style={s.toggleWrap}>
            <Pressable
              onPress={() => setType('meeting')}
              style={[s.toggleBtn, type === 'meeting' && s.toggleBtnActive]}
            >
              <IconVideo
                color={type === 'meeting' ? '#fff' : colors.muted}
                size={16}
              />
              <Text
                style={[
                  s.toggleText,
                  type === 'meeting' && s.toggleTextActive,
                ]}
              >
                Meeting
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setType('class')}
              style={[s.toggleBtn, type === 'class' && s.toggleBtnActive]}
            >
              <IconClass
                color={type === 'class' ? '#fff' : colors.muted}
                size={16}
              />
              <Text
                style={[
                  s.toggleText,
                  type === 'class' && s.toggleTextActive,
                ]}
              >
                Class
              </Text>
            </Pressable>
          </View>

          {/* Title */}
          <Text style={s.fieldLabel}>Title</Text>
          <View style={s.inputWrap}>
            <TextInput
              style={s.input}
              placeholder={
                type === 'class'
                  ? 'e.g. Physics 101'
                  : 'e.g. Team standup'
              }
              placeholderTextColor={colors.mutedDim}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              returnKeyType="done"
              editable={!busy}
            />
          </View>

          {/* Date */}
          <Text style={s.fieldLabel}>Date</Text>
          <Pressable
            onPress={() => setShowDate(true)}
            disabled={busy}
            style={({ pressed }) => [s.pickRow, pressed && { opacity: 0.7 }]}
          >
            <View style={[s.pickIcon, { backgroundColor: colors.purpleSoft }]}>
              <IconCalendar color={colors.purpleLight} size={18} />
            </View>
            <Text style={s.pickText}>{fmtDate(startsAt)}</Text>
          </Pressable>

          {/* Time */}
          <Text style={s.fieldLabel}>Time</Text>
          <Pressable
            onPress={() => setShowTime(true)}
            disabled={busy}
            style={({ pressed }) => [s.pickRow, pressed && { opacity: 0.7 }]}
          >
            <View style={[s.pickIcon, { backgroundColor: colors.blueSoft }]}>
              <IconClock color={colors.blueLight} size={18} />
            </View>
            <Text style={s.pickText}>{fmtTime(startsAt)}</Text>
          </Pressable>

          {/* Duration */}
          <Text style={s.fieldLabel}>Duration</Text>
          <View style={s.chipRow}>
            {DURATIONS.map((d) => {
              const active = duration === d.value;
              return (
                <Pressable
                  key={d.value}
                  onPress={() => setDuration(d.value)}
                  disabled={busy}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text
                    style={[s.chipText, active && s.chipTextActive]}
                  >
                    {d.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Summary */}
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Scheduled for</Text>
            <Text style={s.summaryValue}>
              {fmtDate(startsAt)} · {fmtTime(startsAt)} ·{' '}
              {DURATIONS.find((d) => d.value === duration)?.label}
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              s.submitWrap,
              !canSubmit && { opacity: 0.5 },
              pressed && { opacity: 0.92 },
            ]}
          >
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.submitBtn}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitText}>
                  Schedule {type === 'class' ? 'Class' : 'Meeting'}
                </Text>
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

      {showDate && (
        <DateTimePicker
          value={startsAt}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={startsAt}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.inkStrong,
      fontSize: font.lg,
      fontWeight: weights.extrabold,
      letterSpacing: -0.3,
    },
    content: { padding: spacing.xl, paddingBottom: spacing.xxxl },

    toggleWrap: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 4,
      marginBottom: spacing.md,
      gap: 4,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
    },
    toggleBtnActive: { backgroundColor: colors.purple },
    toggleText: {
      color: colors.muted,
      fontWeight: weights.bold,
      fontSize: font.sm,
    },
    toggleTextActive: { color: '#fff' },

    fieldLabel: {
      color: colors.muted,
      fontSize: font.xs,
      fontWeight: weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    inputWrap: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: spacing.lg,
    },
    input: {
      paddingVertical: spacing.md,
      color: colors.inkStrong,
      fontSize: font.md,
      fontWeight: weights.semibold,
    },
    pickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.md,
    },
    pickIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickText: {
      color: colors.inkStrong,
      fontSize: font.md,
      fontWeight: weights.bold,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    chipActive: { backgroundColor: colors.purple, borderColor: colors.purple },
    chipText: {
      color: colors.ink,
      fontWeight: weights.bold,
      fontSize: font.sm,
    },
    chipTextActive: { color: '#fff' },

    summaryCard: {
      marginTop: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: spacing.lg,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: font.xs,
      fontWeight: weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
    },
    summaryValue: {
      color: colors.inkStrong,
      fontSize: font.md,
      fontWeight: weights.bold,
      lineHeight: 22,
    },

    submitWrap: {
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginTop: spacing.xxl,
    },
    submitBtn: {
      paddingVertical: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitText: {
      color: '#fff',
      fontWeight: weights.extrabold,
      fontSize: font.md,
      letterSpacing: 0.3,
    },
    cancel: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    cancelText: {
      color: colors.muted,
      fontWeight: weights.bold,
      fontSize: font.sm,
    },
  });