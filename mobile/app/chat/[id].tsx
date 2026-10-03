import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { useSocket } from '../../src/hooks/useSocket';
import { useMessageNotifications } from '../../src/context/MessageNotificationsContext';
import { colors, spacing, radii, font, shadows } from '../../src/theme';
import type { Message } from '../../src/types';

export default function ChatScreen() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const { user } = useAuth();
  const socket = useSocket();
  const { setActiveConversationId, clearUnread } = useMessageNotifications();

  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedTyping = useRef(false);

  // Mark this conversation active while the screen is mounted
  useEffect(() => {
    if (!id) return;
    setActiveConversationId(id);
    clearUnread(id);
    return () => {
      setActiveConversationId(null);
      socket?.emit('typing', { conversationId: id, isTyping: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load message history
  useEffect(() => {
    if (!id) return;
    api
      .get<{ messages: Message[] }>(`/conversations/${id}/messages`)
      .then((r) => setMsgs(r.data.messages))
      .catch(() => Alert.alert('MitMe', 'Could not load messages'))
      .finally(() => setLoading(false));
  }, [id]);

  // Realtime: join the conversation room + listen for messages + typing
  useEffect(() => {
    if (!socket || !id) return;

    // Tell the server to add this socket to the conversation room.
    // Without this, server-side broadcasts (message:new) never reach
    // this client — that was the cross-platform message bug.
    const joinRoom = () => {
      console.log('[chat] conversation:join', id);
      socket.emit('conversation:join', id);
    };

    // Join immediately…
    joinRoom();

    // …and re-join after every reconnect. When the socket drops and
    // comes back, the server sees a NEW socket that isn't in any room
    // yet — so we must re-emit on every 'connect'.
    socket.on('connect', joinRoom);

    const onMessage = (m: Message) => {
      if (m.conversation !== id) return;
      setMsgs((prev) =>
        prev.some((x) => x._id === m._id) ? prev : [...prev, m]
      );
    };

    const onTyping = (payload: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      if (payload.conversationId !== id) return;
      if (payload.userId === user?._id) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (payload.isTyping) {
          next[payload.userId] = 'typing';
        } else {
          delete next[payload.userId];
        }
        return next;
      });
    };

    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);

    return () => {
      socket.off('connect', joinRoom);
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
    };
  }, [socket, id, user?._id]);

  // Auto-scroll on new messages
  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [msgs]);

  // Emit typing state when user types
  const handleChange = (value: string) => {
    setText(value);
    if (!socket || !id) return;

    const isTyping = value.length > 0;

    if (isTyping !== lastEmittedTyping.current) {
      socket.emit('typing', { conversationId: id, isTyping });
      lastEmittedTyping.current = isTyping;
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping) {
      typingTimer.current = setTimeout(() => {
        socket.emit('typing', { conversationId: id, isTyping: false });
        lastEmittedTyping.current = false;
      }, 2000);
    }
  };

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !id || sending) return;

    setSending(true);
    if (socket) {
      socket.emit('typing', { conversationId: id, isTyping: false });
      lastEmittedTyping.current = false;
    }

    try {
      const r = await api.post<{ message: Message }>(
        `/conversations/${id}/messages`,
        { text: trimmed }
      );
      setMsgs((prev) =>
        prev.some((x) => x._id === r.data.message._id)
          ? prev
          : [...prev, r.data.message]
      );
      setText('');
    } catch {
      Alert.alert('MitMe', 'Could not send message');
    } finally {
      setSending(false);
    }
  }, [text, id, sending, socket]);

  const typingCount = Object.keys(typingUsers).length;
  const typingLabel =
    typingCount === 0
      ? null
      : typingCount === 1
      ? 'Someone is typing...'
      : `${typingCount} people are typing...`;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {title || 'Conversation'}
          </Text>
          {typingLabel && (
            <Text style={s.typingLabel} numberOfLines={1}>
              {typingLabel}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.purple} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => m._id}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.emptyWrap}>
                <Text style={s.empty}>No messages yet. Say hi!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender?._id === user?._id;
              return (
                <View style={[s.bubbleRow, mine ? s.mineRow : s.theirsRow]}>
                  <View style={[s.bubble, mine ? s.mineBubble : s.theirsBubble]}>
                    <Text style={mine ? s.mineText : s.theirsText}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={s.meta}>{item.sender?.displayName}</Text>
                </View>
              );
            }}
          />
        )}

        <View style={s.composer}>
          <TextInput
            style={s.input}
            placeholder="Write a message..."
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={handleChange}
            multiline
          />
          <Pressable
            style={({ pressed }) => [s.sendBtn, pressed && { opacity: 0.85 }]}
            onPress={send}
            disabled={sending || !text.trim()}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs },
  headerTitle: { fontSize: font.lg, fontWeight: '800', color: colors.ink },
  typingLabel: {
    fontSize: font.sm,
    color: colors.purple,
    fontStyle: 'italic',
    marginTop: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  emptyWrap: { padding: spacing.xxl, alignItems: 'center' },
  empty: { color: colors.muted, textAlign: 'center' },
  bubbleRow: { marginBottom: spacing.md, maxWidth: '80%' },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
  },
  mineBubble: { backgroundColor: colors.purple },
  theirsBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mineText: { color: '#fff', fontSize: font.md },
  theirsText: { color: colors.ink, fontSize: font.md },
  meta: {
    color: colors.muted,
    fontSize: font.sm,
    marginTop: 2,
    paddingHorizontal: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: font.md,
    color: colors.ink,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: colors.purple,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});