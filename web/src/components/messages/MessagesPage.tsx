import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Plus, Search, Send, X } from 'lucide-react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import type { Conversation, Message, User } from '../../types';

interface MessagesPageProps {
  user: User;
  unread?: Record<string, number>;
  onConversationOpened?: (conversationId: string) => void;
  onActiveConversationChange?: (conversationId: string | null) => void;
}

type Pane = 'conversations' | 'new';

export function MessagesPage({
  user,
  unread = {},
  onConversationOpened,
  onActiveConversationChange,
}: MessagesPageProps) {
  const socket = getSocket();

  const [pane, setPane] = useState<Pane>('conversations');
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Load conversations ─────────────────────────────────
  const loadConvos = async () => {
    try {
      const r = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConvos(r.data.conversations);
      if (!selected && r.data.conversations[0]) {
        setSelected(r.data.conversations[0]);
      }
    } catch {
      setError('Could not load conversations.');
    }
  };

  useEffect(() => {
    loadConvos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Notify parent when active conversation changes ─────
  // This lets the shell know whether to play sounds / show badges.
  useEffect(() => {
    onActiveConversationChange?.(selected?._id ?? null);
    if (selected) {
      onConversationOpened?.(selected._id);
    }
  }, [selected, onActiveConversationChange, onConversationOpened]);

  // ─── Load messages when a conversation is selected ──────
  useEffect(() => {
    if (!selected) return;

    setMsgs([]);
    setError('');

    api
      .get<{ messages: Message[] }>(`/conversations/${selected._id}/messages`)
      .then((r) => setMsgs(r.data.messages))
      .catch(() => setError('Could not load messages.'));

    socket.emit('conversation:join', selected._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ─── Realtime: new messages ─────────────────────────────
  useEffect(() => {
    const handler = (m: Message) => {
      if (selected && m.conversation === selected._id) {
        // Append to open conversation
        setMsgs((prev) =>
          prev.some((x) => x._id === m._id) ? prev : [...prev, m]
        );
        // The user is already looking at this chat → mark it read
        onConversationOpened?.(m.conversation);
      } else {
        // Refresh the list so the preview + unread badge update
        loadConvos();
      }
    };

    socket.on('message:new', handler);
    return () => {
      socket.off('message:new', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, onConversationOpened]);

  // ─── Auto-scroll on new messages ────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // ─── Send message ───────────────────────────────────────
  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !selected || sending) return;

    setSending(true);
    try {
      const r = await api.post<{ message: Message }>(
        `/conversations/${selected._id}/messages`,
        { text: trimmed }
      );
      setMsgs((prev) =>
        prev.some((x) => x._id === r.data.message._id)
          ? prev
          : [...prev, r.data.message]
      );
      setText('');
    } catch {
      setError('Could not send message.');
    } finally {
      setSending(false);
    }
  };

  // ─── Search users to start a new chat ───────────────────
  const searchUsers = async () => {
    if (search.trim().length < 2) {
      setError('Type at least 2 characters.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const r = await api.get<{ users: User[] }>(
        `/users?q=${encodeURIComponent(search.trim())}`
      );
      setResults(r.data.users);
      if (!r.data.users.length) setError('No users found.');
    } catch {
      setError('Search failed.');
    } finally {
      setSearching(false);
    }
  };

  // ─── Start a conversation with a user ───────────────────
  const startWith = async (other: User) => {
    try {
      const r = await api.post<{ conversation: Conversation }>('/conversations', {
        type: 'direct',
        memberIds: [other._id],
      });
      setConvos((prev) => {
        const exists = prev.find((c) => c._id === r.data.conversation._id);
        return exists ? prev : [r.data.conversation, ...prev];
      });
      setSelected(r.data.conversation);
      setPane('conversations');
      setSearch('');
      setResults([]);
    } catch {
      setError('Could not start conversation.');
    }
  };

  // ─── Helpers ────────────────────────────────────────────
  const titleFor = (c: Conversation) => {
    if (c.type === 'group') return c.title || 'Group chat';
    const other = c.members.find((m) => m._id !== user._id);
    return other?.displayName || 'Conversation';
  };

  const subtitleFor = (c: Conversation) => {
    if (c.type === 'group') return `${c.members.length} members`;
    const other = c.members.find((m) => m._id !== user._id);
    return other?.presence
      ? `@${other.username} · ${other.presence}`
      : '@user';
  };

  return (
    <div className="page">
      <div className="messages-layout">
        {/* ─── Left column: conversation list ──────── */}
        <section className="card messages-sidebar">
          <div className="messages-sidebar-header">
            <h2 style={{ margin: 0 }}>
              {pane === 'conversations' ? 'Chats' : 'New chat'}
            </h2>

            {pane === 'conversations' ? (
              <button
                className="btn primary"
                onClick={() => setPane('new')}
                title="New conversation"
              >
                <Plus size={16} />
              </button>
            ) : (
              <button
                className="btn"
                onClick={() => {
                  setPane('conversations');
                  setSearch('');
                  setResults([]);
                  setError('');
                }}
                title="Back to chats"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {pane === 'conversations' ? (
            <>
              <div className="toolbar" style={{ marginTop: 12 }}>
                <Search size={16} />
                <input className="input" placeholder="Search conversations" />
              </div>

              <div className="messages-convo-list">
                {convos.length === 0 && (
                  <div className="empty">
                    <MessageCircle size={32} opacity={0.4} />
                    <div style={{ marginTop: 8 }}>No conversations yet.</div>
                    <button
                      className="btn primary"
                      style={{ marginTop: 12 }}
                      onClick={() => setPane('new')}
                    >
                      <Plus size={16} /> Start one
                    </button>
                  </div>
                )}

                {convos.map((c) => {
                  const count = unread[c._id] || 0;
                  return (
                    <button
                      key={c._id}
                      className={`convo-row ${selected?._id === c._id ? 'active' : ''}`}
                      onClick={() => setSelected(c)}
                    >
                      <div className="convo-avatar">
                        {titleFor(c).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="convo-meta">
                        <div className="convo-name">{titleFor(c)}</div>
                        <div className="convo-sub">{subtitleFor(c)}</div>
                      </div>
                      {count > 0 && (
                        <span
                          className="convo-badge"
                          aria-label={`${count} unread`}
                        >
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="toolbar" style={{ marginTop: 12 }}>
                <input
                  className="input"
                  placeholder="Search users by name or @username"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  autoFocus
                />
                <button
                  className="btn primary"
                  onClick={searchUsers}
                  disabled={searching}
                >
                  <Search size={16} />
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>

              {error && (
                <div className="error" style={{ marginTop: 8 }}>
                  {error}
                </div>
              )}

              <div className="messages-convo-list">
                {results.map((u) => (
                  <button
                    key={u._id}
                    className="convo-row"
                    onClick={() => startWith(u)}
                  >
                    <div className="convo-avatar">
                      {u.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="convo-meta">
                      <div className="convo-name">{u.displayName}</div>
                      <div className="convo-sub">@{u.username}</div>
                    </div>
                    <MessageCircle size={16} opacity={0.4} />
                  </button>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ─── Right column: chat area ─────────────── */}
        <section className="card messages-chat">
          {!selected ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <MessageCircle size={40} opacity={0.4} />
              <div style={{ marginTop: 12 }}>
                Pick a conversation to start chatting.
              </div>
            </div>
          ) : (
            <>
              <header className="messages-chat-header">
                <div className="convo-avatar">
                  {titleFor(selected).slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="convo-name">{titleFor(selected)}</div>
                  <div className="convo-sub">{subtitleFor(selected)}</div>
                </div>
              </header>

              <div className="messages-scroll" ref={scrollRef}>
                {msgs.length === 0 && (
                  <div className="empty">No messages yet. Say hi! 👋</div>
                )}

                {msgs.map((m) => {
                  const mine = m.sender?._id === user._id;
                  return (
                    <div
                      key={m._id}
                      className={`message-row ${mine ? 'mine' : 'theirs'}`}
                    >
                      <div className="message-bubble">{m.text}</div>
                      <div className="message-meta">{m.sender?.displayName}</div>
                    </div>
                  );
                })}
              </div>

              <div className="messages-composer">
                <input
                  className="input"
                  placeholder="Write a message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  disabled={sending}
                />
                <button
                  className="btn primary"
                  onClick={send}
                  disabled={sending || !text.trim()}
                >
                  <Send size={16} />
                </button>
              </div>

              {error && <div className="error">{error}</div>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}