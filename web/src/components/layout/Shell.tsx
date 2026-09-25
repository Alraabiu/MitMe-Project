import { useState } from 'react';
import { api, setToken } from '../../services/api';
import { getSocket, disconnectSocket } from '../../services/socket';
import { useMessageNotifications } from '../../hooks/useMessageNotifications';
import type { Meeting, User } from '../../types';
import { Sidebar, type NavId } from './Sidebar';
import { Topbar } from './Topbar';
import { DashboardPage } from '../dashboard/DashboardPage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { MessagesPage } from '../messages/MessagesPage';
import { ContactsPage } from '../contacts/ContactsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { AdminPage } from '../admin/AdminPage';

interface ShellProps {
  user: User;
  setUser: (u: User | null) => void;
}

/**
 * Root layout shown after authentication.
 * Owns navigation state, notification wiring, and — when a meeting
 * is active — hands the whole viewport to the MeetingRoom.
 */
export function Shell({ user, setUser }: ShellProps) {
  const [page, setPage] = useState<NavId>('home');
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => {
    return localStorage.getItem('mitme_muted') === '1';
  });

  const socket = getSocket();

  const toggleMuted = () => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem('mitme_muted', next ? '1' : '0');
      return next;
    });
  };

  // Sound + toast + badge notifications for incoming messages
  const {
    unread,
    totalUnread,
    clearUnread,
  } = useMessageNotifications({
    socket,
    currentUserId: user._id,
    activeConversationId,
    messagesVisible: page === 'messages' && !activeMeeting,
    muted,
  });

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* Ignore network errors — still clear local session */
    }
    setToken(null, null);
    disconnectSocket();
    setUser(null);
  };

  // When a meeting is open, take over the full screen.
  if (activeMeeting) {
    return (
      <MeetingRoom
        meeting={activeMeeting}
        user={user}
        onLeave={() => setActiveMeeting(null)}
      />
    );
  }

  const pageTitle =
    page === 'home'
      ? `Good day, ${user.displayName.split(' ')[0]}`
      : page.charAt(0).toUpperCase() + page.slice(1);

  return (
    <div className="shell">
      <Sidebar
        user={user}
        page={page}
        onNavigate={setPage}
        onLogout={logout}
        unreadMessages={totalUnread}
        muted={muted}
        onToggleMuted={toggleMuted}
      />

      <main className="main">
        <Topbar title={pageTitle} user={user} />

        {page === 'home' && (
          <DashboardPage user={user} onOpenMeeting={setActiveMeeting} />
        )}
        {page === 'meetings' && (
          <MeetingsPage onOpenMeeting={setActiveMeeting} />
        )}
        {page === 'messages' && (
          <MessagesPage user={user} />
        )}
        {page === 'contacts' && <ContactsPage />}
        {page === 'settings' && (
          <SettingsPage user={user} setUser={setUser} />
        )}
        {page === 'admin' && <AdminPage />}
      </main>

    </div>
  );
}