// mobile/src/components/MeetingInviteModal.tsx
import { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {
  X,
  Copy,
  Share2,
  Video,
  Calendar as CalendarIcon,
  Clock,
  GraduationCap,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { spacing, radii, font, weights, type ThemePalette } from '../theme';
import type { Meeting } from '../types';

type IconProps = { color?: string; size?: number };
const IconX = X as unknown as React.ComponentType<IconProps>;
const IconCopy = Copy as unknown as React.ComponentType<IconProps>;
const IconShare = Share2 as unknown as React.ComponentType<IconProps>;
const IconVideo = Video as unknown as React.ComponentType<IconProps>;
const IconCalendar = CalendarIcon as unknown as React.ComponentType<IconProps>;
const IconClock = Clock as unknown as React.ComponentType<IconProps>;
const IconEducation = GraduationCap as unknown as React.ComponentType<IconProps>;

/* ─── Invite URL helpers ──────────────────────────────
   Change these to your real hosted domain when ready. */
const INVITE_BASE = 'https://mitme.app/join';

export function buildMeetingInviteLink(code: string): string {
  return `${INVITE_BASE}/${code}`;
}

export function buildMeetingInviteMessage(
  title: string,
  code: string
): string {
  return (
    `You're invited to "${title}" on MitMe\n\n` +
    `Meeting code: ${code}\n` +
    `Join link: ${buildMeetingInviteLink(code)}`
  );
}

export function formatMeetingTime(input?: string | Date | null): string | null {
  if (!input) return null;
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  visible: boolean;
  meeting: Meeting | null;
  onClose: () => void;
}

export function MeetingInviteModal({ visible, meeting, onClose }: Props) {
  const router = useRouter();
  const { colors, gradients } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  if (!meeting) return null;

  const code = meeting.code;
  const inviteLink = buildMeetingInviteLink(code);
  const when = formatMeetingTime((meeting as any).startsAt);

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert('Copied', 'Meeting code copied to clipboard.');
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    Alert.alert('Copied', 'Invite link copied to clipboard.');
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: buildMeetingInviteMessage(meeting.title, code),
        title: meeting.title,
      });
    } catch {
      /* user dismissed */
    }
  };

  const enterRoom = () => {
    onClose();
    router.push({
      pathname: '/meeting',
      params: {
        meetingId: meeting._id,
        title: meeting.title,
        code: meeting.code,
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Close */}
          <Pressable style={s.closeBtn} onPress={onClose} hitSlop={8}>
            <IconX color={colors.muted} size={20} />
          </Pressable>

          {/* Header */}
          <View style={s.headerIconWrap}>
            <LinearGradient
              colors={gradients.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.headerIcon}
            >
              <IconVideo color="#fff" size={22} />
            </LinearGradient>
          </View>

          <Text style={s.title} numberOfLines={2}>
            {meeting.title}
          </Text>

          <View style={s.metaRow}>
            {when ? (
              <>
                <IconCalendar color={colors.muted} size={13} />
                <Text style={s.meta}>{when}</Text>
              </>
            ) : (
              <>
                <IconClock color={colors.muted} size={13} />
                <Text style={s.meta}>
                  {(meeting as any).status === 'live' ? 'Live now' : 'Ready'}
                </Text>
              </>
            )}
          </View>

          <Text style={s.subtitle}>
            Share the code or link with people you want in this meeting.
          </Text>

          {/* Code */}
          <Text style={s.fieldLabel}>Meeting code</Text>
          <View style={s.fieldRow}>
            <View style={s.fieldIcon}>
              <IconEducation color={colors.purpleLight} size={16} />
            </View>
            <Text style={s.fieldValue}>{code}</Text>
            <Pressable
              onPress={copyCode}
              style={({ pressed }) => [s.copyBtn, pressed && { opacity: 0.7 }]}
            >
              <IconCopy color={colors.purpleLight} size={14} />
              <Text style={s.copyBtnText}>Copy</Text>
            </Pressable>
          </View>

          {/* Link */}
          <Text style={s.fieldLabel}>Invite link</Text>
          <View style={s.fieldRow}>
            <Text style={s.linkValue} numberOfLines={1}>
              {inviteLink}
            </Text>
            <Pressable
              onPress={copyLink}
              style={({ pressed }) => [s.copyBtn, pressed && { opacity: 0.7 }]}
            >
              <IconCopy color={colors.purpleLight} size={14} />
              <Text style={s.copyBtnText}>Copy</Text>
            </Pressable>
          </View>

          {/* Share */}
          <Pressable
            onPress={shareInvite}
            style={({ pressed }) => [s.shareBtn, pressed && { opacity: 0.9 }]}
          >
            <IconShare color="#fff" size={16} />
            <Text style={s.shareBtnText}>Share invitation</Text>
          </Pressable>

          {/* Enter room */}
          <Pressable
            onPress={enterRoom}
            style={({ pressed }) => [s.enterBtn, pressed && { opacity: 0.9 }]}
          >
            <IconVideo color={colors.purple} size={16} />
            <Text style={s.enterBtnText}>
              {meeting.status === 'live' ? 'Join meeting' : 'Enter room'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceBorder,
      marginBottom: spacing.lg,
    },
    closeBtn: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    headerIconWrap: { alignItems: 'center', marginBottom: spacing.md },
    headerIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.inkStrong,
      fontSize: font.xl,
      fontWeight: weights.extrabold,
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 6,
    },
    meta: { color: colors.muted, fontSize: font.sm, fontWeight: weights.semibold },
    subtitle: {
      color: colors.muted,
      fontSize: font.sm,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      lineHeight: 18,
    },

    fieldLabel: {
      color: colors.muted,
      fontSize: font.xs,
      fontWeight: weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 6,
      marginTop: spacing.md,
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 52,
    },
    fieldIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.purpleSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fieldValue: {
      flex: 1,
      color: colors.inkStrong,
      fontSize: font.lg,
      fontWeight: weights.extrabold,
      letterSpacing: 3,
    },
    linkValue: {
      flex: 1,
      color: colors.inkStrong,
      fontSize: font.sm,
      fontWeight: weights.semibold,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.purpleSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radii.md,
    },
    copyBtnText: {
      color: colors.purpleLight,
      fontWeight: weights.extrabold,
      fontSize: font.xs,
      letterSpacing: 0.4,
    },

    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.purple,
      borderRadius: radii.lg,
      paddingVertical: spacing.md + 2,
      marginTop: spacing.xl,
    },
    shareBtnText: {
      color: '#fff',
      fontWeight: weights.extrabold,
      fontSize: font.md,
    },
    enterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: colors.purple,
      borderRadius: radii.lg,
      paddingVertical: spacing.md + 2,
      marginTop: spacing.sm,
    },
    enterBtnText: {
      color: colors.purple,
      fontWeight: weights.extrabold,
      fontSize: font.md,
    },
  });