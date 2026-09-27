import { useState } from 'react';
import { api, setToken } from '../../services/api';
import { getSocket, disconnectSocket } from '../../services/socket';
import { useMessageNotifications } from '../../hooks/useMessageNotifications';
import type { Meeting, User } from '../../types';
import { Sidebar, type NavId } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastStack } from '../common/ToastStack';
import { DashboardPage } from '../dashboard/DashboardPage';
import { MeetingsPage } from '../meetings/MeetingsPage';
import { MeetingRoom } from '../meetings/MeetingRoom';
import { MessagesPage } from '../messages/MessagesPage';
import { ContactsPage } from '../contacts/ContactsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { AdminPage } from '../admin/AdminPage';
import { ClassesPage } from '../classes/ClassesPage';

interface ShellProps {
  user: User;
  setUser: (u: User | null) => void;
}

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

  const {
    unread,
    totalUnread,
    toasts,
    dismissToast,
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
      /* ignore */
    }
    setToken(null, null);
    disconnectSocket();
    setUser(null);
  };

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
        {page === 'classes' && (
          <ClassesPage user={user} onOpenMeeting={setActiveMeeting} />
        )}
        {page === 'meetings' && (
          <MeetingsPage onOpenMeeting={setActiveMeeting} />
        )}
        {page === 'messages' && (
          <MessagesPage
            user={user}
            unread={unread}
            onConversationOpened={clearUnread}
            onActiveConversationChange={setActiveConversationId}
          />
        )}
        {page === 'contacts' && <ContactsPage />}
        {page === 'settings' && (
          <SettingsPage user={user} setUser={setUser} />
        )}
        {page === 'admin' && <AdminPage />}
      </main>

      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onOpen={() => setPage('messages')}
      />
    </div>
  );
}
